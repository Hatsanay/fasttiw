import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { forwardedClientHeaders } from "@/lib/clientIp";

// ส่งคำตอบแบบทดสอบวัดระดับไปตรวจที่ backend — ผ่านเซิร์ฟเวอร์ Next เหมือน endpoint อื่นทั้งหมดของฝั่งลูกค้า
// (backend อยู่คนละโดเมน) พร้อม IP จริงให้ rate limit นับรายคน · ส่งต่อเฉพาะ answers ไม่รับฟิลด์อื่นจาก client
export async function POST(req: Request, { params }: { params: Promise<{ categoryId: string }> }) {
    const { categoryId } = await params;
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.answers)) {
        return NextResponse.json({ message: "รูปแบบคำตอบไม่ถูกต้อง" }, { status: 400 });
    }

    try {
        const res = await fetch(`${API_URL}/store/diagnostic/${encodeURIComponent(categoryId)}/grade`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ answers: body.answers }),
            signal: AbortSignal.timeout(15000),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
