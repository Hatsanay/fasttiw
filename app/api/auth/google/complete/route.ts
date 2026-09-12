import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSessionCookie } from "@/lib/session";
import { forwardedClientHeaders } from "@/lib/clientIp";
import { GOOGLE_ERROR_MESSAGES, GOOGLE_SIGNUP_COOKIE } from "@/lib/googleOAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

// ลูกค้าใหม่ที่มาจาก Google กดยอมรับนโยบายความเป็นส่วนตัว → สร้างบัญชี + ล็อกอิน
// signup_token อยู่ใน httpOnly cookie ที่ callback ตั้งไว้ ไม่ผ่านมือ JavaScript ฝั่ง client เลย
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const store = await cookies();
    const signupToken = store.get(GOOGLE_SIGNUP_COOKIE)?.value;

    if (!signupToken) {
        return NextResponse.json({ message: GOOGLE_ERROR_MESSAGES.google_expired, expired: true }, { status: 400 });
    }

    try {
        const res = await fetch(`${API_URL}/store/auth/google/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ signup_token: signupToken, pdpa_consent: body?.pdpa_consent === true }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.token) {
            return NextResponse.json({ message: data.message ?? "สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status || 500 });
        }

        await setSessionCookie(data.token);
        store.set(GOOGLE_SIGNUP_COOKIE, "", { path: "/", maxAge: 0 });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
