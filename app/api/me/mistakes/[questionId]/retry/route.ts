import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// ตอบข้อที่เคยผิดใหม่จากหน้า /history/mistakes/practice — ส่งต่อ backend พร้อม JWT จาก cookie (client ไม่ถือ token)
// ส่งต่อเฉพาะ cho_id ไม่รับฟิลด์อื่นจาก client
export async function POST(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
    const { questionId } = await params;
    const body = await req.json().catch(() => ({}));
    const cho_id = typeof body?.cho_id === "string" ? body.cho_id : null;
    if (!cho_id) return NextResponse.json({ message: "กรุณาเลือกคำตอบ" }, { status: 400 });

    try {
        const res = await authorizedFetch(`/store/me/mistakes/${encodeURIComponent(questionId)}/retry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cho_id }),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
