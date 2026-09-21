import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { forwardedClientHeaders } from "@/lib/clientIp";

// ตอบแบบสอบถามผลสอบ (2026-09-20)
//
// ใช้ Route Handler + JSON ไม่ใช้ Server Action ด้วยเหตุผลเดียวกับหน้าลืมรหัสผ่าน (CLAUDE.md 6.2):
// ModSecurity ของโฮสต์ตอบ 403 ให้ request ที่มีสตริง `$@` ซึ่ง Next แนบมากับฟอร์ม Server Action ทุกหน้า
// — ฟอร์มนี้คือฟอร์มที่ลูกค้าจะกดครั้งเดียวแล้วไม่กลับมาอีก ถ้าพังคือเสียคำตอบนั้นไปเลย
async function forward(path: string, body: unknown) {
    try {
        const res = await fetch(`${API_URL}/store/exam-outcome${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่" }, { status: 502 });
    }
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    return forward(body?.opt_out ? "/opt-out" : "", body);
}
