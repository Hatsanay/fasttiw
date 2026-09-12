import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/site";

// เข้าสู่ระบบด้วย Google ฝั่งเซิร์ฟเวอร์ Next — Authorization Code flow + PKCE + state
//
// ฝั่งนี้ถือแค่ client ID (ค่าสาธารณะ ใครเห็นก็ได้) ใช้สร้างลิงก์ไปหน้า Google อย่างเดียว ส่วน client secret
// การแลก code เป็น token และการตรวจลายเซ็น id_token อยู่ที่ backend ทั้งหมด (backend/src/utils/googleAuth.js)
//
// ไม่มีโค้ด JavaScript ของ Google ในหน้าเว็บเราเลย ปุ่มเป็นแค่ลิงก์ธรรมดาไปที่ /api/auth/google
// — ไม่ต้องเปิด CSP ให้สคริปต์ภายนอก และไม่ต้องใช้ Server Action (กฎ WAF `$@` ไม่เกี่ยวเลย)

export const GOOGLE_OAUTH_COOKIE = "fasttiw_g_oauth"; // state + code_verifier + next ระหว่างไปหา Google
export const GOOGLE_SIGNUP_COOKIE = "fasttiw_g_signup"; // signup_token ของลูกค้าใหม่ระหว่างรอกดยอมรับ PDPA
export const GOOGLE_OAUTH_TTL_SECONDS = 10 * 60;
export const GOOGLE_SIGNUP_TTL_SECONDS = 15 * 60; // ตรงกับอายุ signup_token ที่ backend ออกให้

export function isGoogleLoginEnabled(): boolean {
    return !!process.env.GOOGLE_CLIENT_ID;
}

// ต้องตรงทุกตัวอักษรกับ "Authorized redirect URIs" ใน Google Cloud Console และกับที่ backend อนุญาต
// (STORE_URL ของ backend) — อิงโดเมนที่ตั้งไว้ ไม่อิง host ของ request เพราะหลัง reverse proxy host อาจเป็นค่าภายใน
export function googleCallbackUrl(): string {
    return `${SITE_URL}/api/auth/google/callback`;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function createOAuthRequest(next: string) {
    const state = b64url(randomBytes(32));
    const verifier = b64url(randomBytes(32)); // PKCE: 43 ตัวอักษร อยู่ในช่วง 43-128 ที่มาตรฐานกำหนด
    const challenge = b64url(createHash("sha256").update(verifier).digest());

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        redirect_uri: googleCallbackUrl(),
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        // ให้เลือกบัญชีทุกครั้ง — เครื่องที่ใช้ร่วมกัน (คอมที่บ้าน/ร้านเน็ต) จะไม่ล็อกอินบัญชีคนอื่นให้อัตโนมัติ
        prompt: "select_account",
    }).toString();

    return { url: url.toString(), cookieValue: JSON.stringify({ state, verifier, next }) };
}

// อ่าน cookie ที่ตั้งไว้ตอนออกไปหา Google แล้วเทียบ state — ไม่ตรง = ไม่ใช่การล็อกอินที่ผู้ใช้คนนี้เริ่มเอง
// (กัน login CSRF: คนร้ายส่งลิงก์ callback ที่มี code ของบัญชีตัวเองมาให้ ทำให้เหยื่อล็อกอินเป็นบัญชีคนร้าย
// แล้วเผลอกรอกข้อมูล/จ่ายเงินลงบัญชีนั้น)
export function readOAuthCookie(raw: string | undefined, stateFromGoogle: string | null) {
    if (!raw || !stateFromGoogle) return null;
    try {
        const data = JSON.parse(raw) as { state?: string; verifier?: string; next?: string };
        if (!data.state || !data.verifier) return null;
        const a = Buffer.from(data.state);
        const b = Buffer.from(stateFromGoogle);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        return { verifier: data.verifier, next: data.next ?? "" };
    } catch {
        return null;
    }
}

// Google ไม่อนุญาตให้ล็อกอินในเบราว์เซอร์ที่ฝังอยู่ในแอป (ตอบ 403 disallowed_useragent) — ลูกค้าเราส่วนใหญ่
// มาจากเพจ Facebook/LINE ที่เปิดลิงก์ในแอปเป็นค่าเริ่มต้น ถ้าโชว์ปุ่มตามปกติจะกดแล้วเจอหน้า error ของ Google
// จึงเปลี่ยนเป็นคำแนะนำให้เปิดในเบราว์เซอร์แทน (ตรวจแบบกว้างๆ จาก user-agent ไม่ต้องแม่น 100%)
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|; wv\)/i;

export function isInAppBrowser(userAgent: string | null): boolean {
    return !!userAgent && IN_APP_BROWSER.test(userAgent);
}

// ข้อความ error ที่ส่งกลับไปหน้า login เป็น "รหัส" ไม่ใช่ข้อความเต็ม — ถ้ารับข้อความจาก URL มาแสดงตรงๆ
// ใครก็ส่งลิงก์ /login?error=โทรหาเบอร์นี้เพื่อยืนยันบัญชี... ให้ลูกค้าเห็นบนหน้าเว็บเราได้ (content spoofing)
export const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
    google_unavailable: "ยังไม่เปิดให้เข้าสู่ระบบด้วย Google ในตอนนี้ กรุณาใช้ชื่อผู้ใช้และรหัสผ่าน",
    google_cancelled: "ยกเลิกการเข้าสู่ระบบด้วย Google แล้ว",
    google_state: "การเข้าสู่ระบบด้วย Google หมดเวลาหรือถูกเปิดจากหน้าอื่น กรุณากดปุ่มอีกครั้ง",
    google_expired: "ขั้นตอนสมัครด้วย Google หมดเวลาแล้ว กรุณากดปุ่ม Google อีกครั้ง",
    google_suspended: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมิน",
    google_linked_other: "อีเมลนี้เชื่อมกับบัญชี Google อื่นไว้แล้ว กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน",
    google_failed: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
};

export function googleErrorCodeFor(status: number): string {
    if (status === 403) return "google_suspended";
    if (status === 409) return "google_linked_other";
    if (status === 503) return "google_unavailable";
    return "google_failed";
}
