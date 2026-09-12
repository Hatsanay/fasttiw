import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/session";
import { forwardedClientHeaders } from "@/lib/clientIp";
import { safeNextPath } from "@/lib/safeNext";
import {
    GOOGLE_OAUTH_COOKIE,
    GOOGLE_SIGNUP_COOKIE,
    GOOGLE_SIGNUP_TTL_SECONDS,
    googleCallbackUrl,
    googleErrorCodeFor,
    readOAuthCookie,
} from "@/lib/googleOAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

// Google ส่งผู้ใช้กลับมาที่นี่พร้อม code — เทียบ state แล้วส่ง code + code_verifier ต่อให้ backend
// เป็นคนแลกกับ Google และตรวจลายเซ็นเอง (ฝั่งนี้ไม่มี client secret และไม่เชื่อข้อมูลผู้ใช้จากที่ไหนเลย)
//
// บัญชีเดิม → ตั้ง session cookie แล้วพากลับหน้าเดิม / ลูกค้าใหม่ → พาไปหน้ากดยอมรับ PDPA ก่อนสร้างบัญชี
export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const store = await cookies();

    const oauth = readOAuthCookie(store.get(GOOGLE_OAUTH_COOKIE)?.value, params.get("state"));
    // ใช้ได้ครั้งเดียว — ลบทิ้งทันทีไม่ว่าผลจะเป็นอะไร (path ต้องตรงกับตอนตั้ง ไม่งั้นเบราว์เซอร์ไม่ลบ)
    store.set(GOOGLE_OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });

    const next = safeNextPath(oauth?.next);
    const backToLogin = (code: string): never =>
        redirect(`/login?error=${code}&next=${encodeURIComponent(next)}`);

    // ผู้ใช้กด "ยกเลิก" ที่หน้า Google = access_denied — ไม่ใช่ความผิดพลาด แค่แจ้งเฉยๆ
    const googleError = params.get("error");
    if (googleError) backToLogin(googleError === "access_denied" ? "google_cancelled" : "google_failed");
    if (!oauth) backToLogin("google_state");

    const code = params.get("code");
    if (!code) backToLogin("google_failed");

    let res: Response;
    let data: { token?: string; needs_signup?: boolean; signup_token?: string };
    try {
        res = await fetch(`${API_URL}/store/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ code, code_verifier: oauth!.verifier, redirect_uri: googleCallbackUrl() }),
        });
        data = await res.json().catch(() => ({}));
    } catch {
        return backToLogin("google_failed");
    }

    if (!res.ok) backToLogin(googleErrorCodeFor(res.status));

    if (data.token) {
        await setSessionCookie(data.token);
        redirect(next);
    }

    if (data.needs_signup && data.signup_token) {
        store.set(GOOGLE_SIGNUP_COOKIE, data.signup_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: GOOGLE_SIGNUP_TTL_SECONDS,
        });
        redirect(`/register/google?next=${encodeURIComponent(next)}`);
    }

    backToLogin("google_failed");
}
