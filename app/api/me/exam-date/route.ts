import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// ตั้ง/ล้างวันสอบของลูกค้า — ส่งต่อ backend พร้อม JWT จาก cookie (client ไม่ถือ token)
// ส่งต่อเฉพาะ exam_date เท่านั้น (null = ล้างวันสอบ) ไม่รับฟิลด์อื่นจาก client
export async function PUT(req: Request) {
    const body = await req.json().catch(() => ({}));
    const examDate = typeof body?.exam_date === "string" && body.exam_date ? body.exam_date : null;
    try {
        const res = await authorizedFetch("/store/me/exam-date", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exam_date: examDate }),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
