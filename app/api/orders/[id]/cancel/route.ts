import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// ปุ่ม "ยกเลิกคำสั่งซื้อ" ที่หน้า /orders/[id] เป็น client component (ต้องกดยืนยันก่อน) จึงต้อง proxy
// ผ่าน Route Handler นี้เหมือน status/route.ts — client-side JS ไม่ถือ httpOnly JWT cookie เอง
export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await authorizedFetch(`/store/orders/${id}/cancel`, { method: "PUT" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
