import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { authorizedFetch } from "@/lib/session";
import { ExamPdfDocument, loadWatermarkTiledImage } from "@/lib/pdf/ExamPdfDocument";
import { toPdfQuestion, type RawPdfQuestion } from "@/lib/pdf/pdfQuestions";

// แปลงคำถาม+รูปเป็นรูปแบบของ PDF อยู่ที่ lib/pdf/pdfQuestions.ts (ใช้ร่วมกับชุดข้อสอบของใบสอบกระดาษ)

// สร้าง PDF ฝั่ง server เท่านั้น (ไม่ส่ง @react-pdf/renderer ไปที่ client bundle) — ยิงไป backend ผ่าน
// authorizedFetch เพื่อแนบ customer JWT จาก httpOnly cookie (เหมือน Route Handler อื่นในโปรเจกต์นี้)
// ?shuffle=1/?answers=1 ส่งต่อให้ backend ตัดสินใจโดยตรง (ดู exportPrintableQuestions)
// ไม่ส่งพารามิเตอร์มา = ไม่สลับ ไม่มีเฉลย — ตรงกับค่าเริ่มต้นของ popover ดาวน์โหลด (ExportPdfButton)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const shuffle = searchParams.get("shuffle") === "1" ? "1" : "0";
    const answers = searchParams.get("answers") === "1" ? "1" : "0";

    const res = await authorizedFetch(`/store/products/${id}/export-questions?shuffle=${shuffle}&answers=${answers}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "ไม่สามารถสร้างไฟล์ PDF ได้" }));
        return NextResponse.json(body, { status: res.status });
    }
    const data: { prod_name: string; prod_total_score: string | number | null; questions: RawPdfQuestion[] } = await res.json();
    const questions = await Promise.all(data.questions.map(toPdfQuestion));

    const watermarkTiledImage = loadWatermarkTiledImage();
    const buffer = await renderToBuffer(
        <ExamPdfDocument
            productName={data.prod_name}
            totalScore={data.prod_total_score}
            questions={questions}
            watermarkTiledImage={watermarkTiledImage}
        />
    );

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="fasttiw-${id}.pdf"`,
            "Cache-Control": "no-store",
        },
    });
}
