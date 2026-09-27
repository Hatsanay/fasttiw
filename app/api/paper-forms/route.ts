import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// สร้างใบสอบกระดาษ — ยิงผ่าน Route Handler ด้วย JSON (ไม่ใช้ Server Action) เหตุผลเดียวกับฟอร์มอื่นในโปรเจกต์:
// WAF ของโฮสต์ตอบ 403 ให้คำขอที่มีสตริง `$@` ที่ Server Action แนบมา (CLAUDE.md ข้อ 6.2)
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const res = await authorizedFetch("/store/paper-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: body.product_id, shuffle: body.shuffle === true }),
    });
    const data = await res.json().catch(() => ({ message: "สร้างชุดสอบไม่สำเร็จ กรุณาลองใหม่" }));
    return NextResponse.json(data, { status: res.status });
}
