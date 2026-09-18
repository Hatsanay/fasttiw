import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// เริ่ม/ทำต่อสนามสอบเสมือน — client ยิงมาที่นี่เพื่อให้ JWT (httpOnly cookie) ถูกแนบฝั่ง server เหมือน route อื่น
// backend เป็นคนตัดสินเองว่าจะสร้างใบใหม่หรือให้ทำใบที่ค้างอยู่ต่อ (startMockAttempt) — ที่นี่แค่ส่งต่อ
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const res = await authorizedFetch(`/store/mock-exams/${encodeURIComponent(id)}/attempts`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
