import { NextResponse } from "next/server";
import { forwardedClientHeaders } from "@/lib/clientIp";

// ขอรหัส OTP ยืนยันอีเมลก่อนสมัครสมาชิก — proxy ไป backend เฉยๆ ตรรกะทั้งหมด (จำกัดจำนวนครั้ง,
// เช็คอีเมลซ้ำ, ออกรหัส, ส่งเมล) อยู่ที่ backend ที่เดียว ดู customerAuth.controller.js
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const cus_email = String(body?.cus_email ?? "").trim();

    if (!cus_email) {
        return NextResponse.json({ message: "กรุณากรอกอีเมล" }, { status: 400 });
    }

    try {
        const res = await fetch(`${API_URL}/store/auth/register/request-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ cus_email }),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
