import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/site";
import { safeNextPath } from "@/lib/safeNext";
import {
    GOOGLE_OAUTH_COOKIE,
    GOOGLE_OAUTH_TTL_SECONDS,
    createOAuthRequest,
    isGoogleLoginEnabled,
} from "@/lib/googleOAuth";

// ขั้นแรกของ "เข้าสู่ระบบด้วย Google" — ปุ่มบนหน้า login/register เป็นแค่ลิงก์มาที่นี่
// สร้าง state + PKCE เก็บไว้ใน httpOnly cookie แล้วพาผู้ใช้ไปหน้าเลือกบัญชีของ Google
export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const next = safeNextPath(params.get("next"));

    if (!isGoogleLoginEnabled()) {
        redirect(`/login?error=google_unavailable&next=${encodeURIComponent(next)}`);
    }

    // cookie ผูกกับ host — ถ้าผู้ใช้เข้ามาทาง fasttiw.com แต่ callback ของ Google ลงทะเบียนไว้ที่ www.fasttiw.com
    // cookie state ที่ตั้งตรงนี้จะไม่ถูกส่งไปตอน callback แล้วล็อกอินพังทุกครั้งแบบหาสาเหตุยาก — พาไปตั้ง cookie
    // ที่โดเมนหลักก่อน (?canon=1 กันวนไม่รู้จบ ถ้า reverse proxy ส่ง host ภายในมาแทนโดเมนจริง)
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host && host !== new URL(SITE_URL).host && !params.has("canon")) {
        redirect(`${SITE_URL}/api/auth/google?canon=1&next=${encodeURIComponent(next)}`);
    }

    const { url, cookieValue } = createOAuthRequest(next);
    (await cookies()).set(GOOGLE_OAUTH_COOKIE, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // ต้องเป็น lax ไม่ใช่ strict — การกลับมาจาก Google เป็นการเปิดหน้าจากอีกโดเมน strict จะไม่ส่ง cookie มาให้
        sameSite: "lax",
        path: "/api/auth/google", // ส่งแค่ตอนเรียก route ของ Google (รวม /callback) ไม่แนบไปกับทุก request ของเว็บ
        maxAge: GOOGLE_OAUTH_TTL_SECONDS,
    });
    redirect(url);
}
