import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// ไฟล์ Excel ผลสอบของกลุ่ม (ผู้จัดเท่านั้น — backend ตรวจให้) · เรียงตามชื่อ ไม่มีคอลัมน์อันดับ — CLAUDE.md ข้อ 6.9.1 เฟส 4
// ส่งต่อไฟล์จาก backend ตรงๆ (token อยู่ใน cookie httpOnly เบราว์เซอร์ยิง backend เองไม่ได้)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[A-Za-z0-9-]{1,40}$/.test(id)) return NextResponse.json({ message: "ไม่พบกลุ่มนี้" }, { status: 404 });
    const round = new URL(req.url).searchParams.get("round");
    const qs = round && /^\d{1,5}$/.test(round) ? `?round=${round}` : "";

    const res = await authorizedFetch(`/store/paper-groups/${encodeURIComponent(id)}/results.xlsx${qs}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return NextResponse.json({ message: body.message ?? "สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status });
    }
    return new NextResponse(await res.arrayBuffer(), {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="fasttiw-group-${id}-results.xlsx"`,
            "Cache-Control": "no-store",
        },
    });
}
