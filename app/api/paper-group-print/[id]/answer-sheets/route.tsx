import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { GroupAnswerSheetDocument } from "@/lib/pdf/AnswerSheetDocument";
import { paginate } from "@/lib/paper/layout";
import { fetchGroupSheets } from "@/lib/paper/printData";

// กระดาษคำตอบของทั้งกลุ่มในไฟล์เดียว (ใบละคน มีชื่อ + ชุด A-D ถ้าแบ่งชุด) — กลุ่มสอบกระดาษ CLAUDE.md ข้อ 6.9.1
// แยกจาก /api/paper-groups/[[...path]] เพราะ catch-all นั้นเป็นตัวส่งต่อ JSON (path ซ้อนกันไม่ได้ใน Next)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[A-Za-z0-9-]{1,40}$/.test(id)) return NextResponse.json({ message: "ไม่พบกลุ่มนี้" }, { status: 404 });
    const result = await fetchGroupSheets(id);
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
    const { data } = result;
    if (!data.sheets.length) return NextResponse.json({ message: "ยังไม่ได้สร้างชุดสอบของรอบนี้" }, { status: 400 });

    const buffer = await renderToBuffer(
        <GroupAnswerSheetDocument
            productName={data.prod_name}
            title={data.title}
            sheets={data.sheets.map((s) => ({ code: s.code, holderName: s.holder_name, variant: s.variant, pages: paginate(s.choice_counts) }))}
        />
    );
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="fasttiw-group-${id}-r${data.round}-answer-sheets.pdf"`,
            "Cache-Control": "no-store",
        },
    });
}
