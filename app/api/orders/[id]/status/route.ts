import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// Route Handler ตัวแรกของโปรเจกต์นี้ — จำเป็นเพราะ client-side polling JS ไม่มีทางถือ httpOnly cookie
// JWT ได้เอง (ตามสถาปัตยกรรมที่ตั้งใจไว้ใน CLAUDE.md) จึงต้อง proxy ผ่าน server-side ตัวนี้แทน คืนแค่
// ord_status เท่านั้น ไม่ส่งข้อมูล order เต็มออกไปให้ client-side JS โดยไม่จำเป็น
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await authorizedFetch(`/store/orders/${id}`);
    if (!res.ok) {
        return NextResponse.json({ message: "ไม่พบคำสั่งซื้อนี้" }, { status: res.status });
    }
    const order = await res.json();
    return NextResponse.json({ ord_status: order.ord_status });
}
