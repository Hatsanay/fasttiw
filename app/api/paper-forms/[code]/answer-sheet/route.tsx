import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { AnswerSheetDocument } from "@/lib/pdf/AnswerSheetDocument";
import { paginate } from "@/lib/paper/layout";
import { fetchPaperPrintData, paperFileName } from "@/lib/paper/printData";

// กระดาษคำตอบของใบสอบกระดาษ — จำนวนวงของแต่ละข้อมาจากใบสอบ (ตรึงไว้ตอนสร้าง) ผังจึงไม่เปลี่ยนแม้แอดมินแก้ข้อทีหลัง
// QR ในแต่ละหน้าเป็นรหัสใบสอบจริง + เลขหน้า ตัวสแกน (เฟส 2) ใช้หาใบสอบจาก QR นี้
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const result = await fetchPaperPrintData(code);
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
    const { data } = result;

    const buffer = await renderToBuffer(
        <AnswerSheetDocument productName={data.prod_name} code={data.code} pages={paginate(data.choice_counts)} />
    );
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${paperFileName(data.code, "answer-sheet")}"`,
            "Cache-Control": "no-store",
        },
    });
}
