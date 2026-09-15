import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

// widget แชทเรียกผ่าน Route Handler นี้เสมอ (ไม่ยิงตรงไป backend จาก browser JS) ไม่ว่าจะ login อยู่หรือยัง
// เป็นผู้เยี่ยมชม — กันไม่ให้ client ต้องมี fetch คนละแบบสองทาง (มี token vs ไม่มี token) แค่ที่นี่ที่เดียว
// เป็นคนตัดสินว่าจะแนบ Authorization (อ่าน cookie httpOnly ฝั่ง server เท่านั้น ไม่เคยหลุดไปที่ browser JS)
// หรือปล่อยให้ backend ใช้ X-Guest-Id แทน — ตัว backend เอง (optionalCustomerAuth) รองรับทั้งสองแบบอยู่แล้ว
// body { create: false } = หาห้องเดิมอย่างเดียว ไม่สร้างใหม่ (widget ใช้ตอนเปิดหน้าเว็บ) — ส่งต่อเฉพาะฟิลด์นี้
export async function POST(req: Request) {
    const token = await getSessionToken();
    const guestId = req.headers.get("x-guest-id");
    const body = await req.json().catch(() => null);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (guestId) headers["X-Guest-Id"] = guestId;

    const res = await fetch(`${API_URL}/store/chat/conversation`, {
        method: "POST", headers, body: JSON.stringify({ create: body?.create !== false }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
