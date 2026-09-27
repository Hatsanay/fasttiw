import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ExamPdfDocument, loadWatermarkTiledImage } from "@/lib/pdf/ExamPdfDocument";
import { toPdfQuestion } from "@/lib/pdf/pdfQuestions";
import { fetchPaperPrintData, paperFileName } from "@/lib/paper/printData";

// ชุดข้อสอบของใบสอบกระดาษ — ลำดับข้อ/ตัวเลือกตามที่ตรึงไว้ในใบสอบ (เลขข้อตรงกับกระดาษคำตอบ) ไม่มีเฉลย
// (เฉลยเห็นหลังสแกนกระดาษคำตอบ) · ใช้ ExamPdfDocument ตัวเดียวกับ PDF แบบฝึกหัด
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const result = await fetchPaperPrintData(code);
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
    const { data } = result;

    const questions = await Promise.all(data.questions.map(toPdfQuestion));
    const buffer = await renderToBuffer(
        <ExamPdfDocument
            productName={data.prod_name}
            totalScore={data.prod_total_score}
            questions={questions}
            watermarkTiledImage={loadWatermarkTiledImage()}
            formCode={data.code}
        />
    );
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${paperFileName(data.code, "booklet")}"`,
            "Cache-Control": "no-store",
        },
    });
}
