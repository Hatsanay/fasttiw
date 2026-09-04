import { NextResponse } from "next/server";
import { forwardedClientHeaders } from "@/lib/clientIp";

// คู่กับ ../forgot-password/route.ts — เหตุผลที่ไม่ใช้ Server Action อธิบายไว้ที่ไฟล์นั้น (WAF บล็อก `$@`)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "");
    const new_password = String(body?.new_password ?? "");

    // เช็คซ้ำที่ backend อีกชั้นเสมอ ตรงนี้แค่ตัดเคสที่รู้ผลอยู่แล้วออกก่อนโดยไม่ต้องยิงต่อ
    if (!token) return NextResponse.json({ message: "ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ใหม่อีกครั้ง" }, { status: 400 });
    if (new_password.length < 8) return NextResponse.json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });

    try {
        const res = await fetch(`${API_URL}/store/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ token, new_password }),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
