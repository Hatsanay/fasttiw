import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// ภาพกระดาษคำตอบที่สแกนไว้ — backend เช็คว่าเป็นใบสอบของลูกค้าคนนี้ (ภาพมีชื่อที่เขียนบนกระดาษ ห้ามเปิดสาธารณะ)
// ห้าม cache ที่ใดเลย: ภาพเปลี่ยนเมื่อสแกนใหม่ และเป็นข้อมูลส่วนตัว
export async function GET(_req: Request, { params }: { params: Promise<{ code: string; page: string }> }) {
    const { code, page } = await params;
    try {
        const res = await authorizedFetch(`/store/paper-forms/${encodeURIComponent(code)}/scans/${encodeURIComponent(page)}`);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return NextResponse.json({ message: data.message ?? "ไม่พบภาพ" }, { status: res.status });
        }
        return new NextResponse(res.body, {
            headers: { "Content-Type": res.headers.get("content-type") ?? "image/webp", "Cache-Control": "private, no-store" },
        });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
