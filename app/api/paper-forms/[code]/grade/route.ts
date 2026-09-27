import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// ส่งกระดาษคำตอบที่อ่านแล้วให้ backend ตรวจ — รับ multipart (answers + page_<n>) แล้วส่งต่อทั้งก้อน
// Route Handler ไม่ใช่ Server Action เพราะ WAF ของโฮสต์บล็อกฟอร์ม Server Action (CLAUDE.md ข้อ 6.2)
// ไม่ตรวจเนื้อหาซ้ำที่นี่ — backend ตรวจครบ (ใบสอบเป็นของใคร, ดัชนีคำตอบ, ภาพ, ขนาดไฟล์)
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const incoming = await req.formData().catch(() => null);
    if (!incoming) return NextResponse.json({ message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });

    const forward = new FormData();
    for (const [key, value] of incoming) {
        if (key === "answers" && typeof value === "string") forward.append(key, value);
        else if (/^page_\d{1,3}$/.test(key) && value instanceof File) forward.append(key, value, `${key}.jpg`);
    }

    try {
        const res = await authorizedFetch(`/store/paper-forms/${encodeURIComponent(code)}/grade`, { method: "POST", body: forward });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json({ message: data.message ?? "ส่งตรวจไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status || 500 });
        }
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
