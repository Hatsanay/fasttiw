import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/session";
import { forwardedClientHeaders } from "@/lib/clientIp";

// คู่กับ ../login/route.ts — เหตุผลที่ไม่ใช้ Server Action อธิบายไว้ที่ไฟล์นั้น (WAF บล็อก `$@`)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const cus_username = String(body?.cus_username ?? "").trim();
    const cus_email = String(body?.cus_email ?? "").trim();
    const cus_password = String(body?.cus_password ?? "");
    const cus_fname = String(body?.cus_fname ?? "").trim();
    const cus_lname = String(body?.cus_lname ?? "").trim();
    const pdpa_consent = body?.pdpa_consent === true;
    const otp = String(body?.otp ?? "").trim();

    // เช็คเบื้องต้นตรงนี้เพื่อไม่ต้องยิงต่อไป backend ทั้งที่รู้ผลอยู่แล้ว — backend ตรวจซ้ำทุกข้ออยู่ดี
    if (!cus_username || !cus_email || !cus_password) {
        return NextResponse.json({ message: "กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่าน" }, { status: 400 });
    }
    if (cus_password.length < 8) {
        return NextResponse.json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    }
    if (!pdpa_consent) {
        return NextResponse.json({ message: "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก" }, { status: 400 });
    }
    // รหัสยืนยันอีเมล — backend เป็นคนตรวจว่าถูก/หมดอายุ/ใช้ไปแล้วหรือยัง ตรงนี้แค่กันเคสไม่กรอกมาเลย
    if (!/^\d{6}$/.test(otp)) {
        return NextResponse.json({ message: "กรุณากรอกรหัสยืนยัน 6 หลักที่ส่งไปทางอีเมล" }, { status: 400 });
    }

    try {
        const res = await fetch(`${API_URL}/store/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ cus_username, cus_email, cus_password, cus_fname, cus_lname, pdpa_consent, otp }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.token) {
            return NextResponse.json({ message: data.message ?? "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status || 500 });
        }

        await setSessionCookie(data.token);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
