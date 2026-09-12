import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// แก้ชื่อ-นามสกุล จากหน้าต้อนรับหลังสมัคร (/welcome) — Route Handler ไม่ใช่ Server Action เพราะ WAF ของโฮสต์
// บล็อกสตริง `$@` ที่มากับฟอร์ม Server Action (ดู app/api/auth/login/route.ts)
export async function PUT(req: Request) {
    const body = await req.json().catch(() => ({}));
    const cus_fname = String(body?.cus_fname ?? "").trim();
    const cus_lname = String(body?.cus_lname ?? "").trim();
    if (!cus_fname || !cus_lname) {
        return NextResponse.json({ message: "กรุณากรอกชื่อและนามสกุล" }, { status: 400 });
    }

    try {
        const res = await authorizedFetch("/store/me/name", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cus_fname, cus_lname }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json({ message: data.message ?? "บันทึกชื่อไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status || 500 });
        }
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
