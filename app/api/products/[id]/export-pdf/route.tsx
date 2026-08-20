import { NextResponse } from "next/server";
import sharp from "sharp";
import { renderToBuffer } from "@react-pdf/renderer";
import { authorizedFetch } from "@/lib/session";
import { productCoverUrl } from "@/lib/api";
import { ExamPdfDocument, loadWatermarkTiledImage, type ExportPdfQuestion } from "@/lib/pdf/ExamPdfDocument";

type RawQuestion = {
    ques_id: string;
    ques_text: string;
    ques_image_url: string | null;
    choices: { cho_id: string; cho_text: string; cho_image_url: string | null }[];
    reveal: {
        correct_choice_id: string | null;
        explanation: string | null;
        choice_reasons: { cho_id: string; is_correct: boolean; wrong_reason: string | null }[];
    } | null;
};

// รูปที่อัปโหลดจริงในระบบเก็บเป็น .webp ทั้งหมด แต่ @react-pdf/image รู้จักแค่ jpg/png/svg — ถ้าปล่อยให้
// react-pdf ไปดึง URL รูปเองจะ throw "Not valid image extension" ซึ่งถูกกลืนเงียบๆ (แค่ console.warn ไม่มี
// อะไรบอกผู้ใช้) ทำให้รูปหายไปจาก PDF โดยไม่มีใครรู้ตัว จึงต้องดึง+แปลงเป็น PNG เองที่นี่ก่อนส่งเข้า PDF
async function toPdfImageBuffer(relativePath: string | null): Promise<Buffer | null> {
    if (!relativePath) return null;
    const url = productCoverUrl(relativePath);
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const bytes = Buffer.from(await res.arrayBuffer());
        return await sharp(bytes).png().toBuffer();
    } catch {
        return null;
    }
}

async function toPdfQuestion(q: RawQuestion): Promise<ExportPdfQuestion> {
    const [quesImage, choiceImages] = await Promise.all([
        toPdfImageBuffer(q.ques_image_url),
        Promise.all(q.choices.map((c) => toPdfImageBuffer(c.cho_image_url))),
    ]);
    return {
        ques_id: q.ques_id,
        ques_text: q.ques_text,
        ques_image: quesImage,
        choices: q.choices.map((c, i) => ({ cho_id: c.cho_id, cho_text: c.cho_text, cho_image: choiceImages[i] })),
        reveal: q.reveal,
    };
}

// สร้าง PDF ฝั่ง server เท่านั้น (ไม่ส่ง @react-pdf/renderer ไปที่ client bundle) — ยิงไป backend ผ่าน
// authorizedFetch เพื่อแนบ customer JWT จาก httpOnly cookie (เหมือน Route Handler อื่นในโปรเจกต์นี้)
// ?shuffle=0/?answers=1 ส่งต่อให้ backend ตัดสินใจโดยตรง (ดู exportPrintableQuestions)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const shuffle = searchParams.get("shuffle") === "0" ? "0" : "1";
    const answers = searchParams.get("answers") === "1" ? "1" : "0";

    const res = await authorizedFetch(`/store/products/${id}/export-questions?shuffle=${shuffle}&answers=${answers}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "ไม่สามารถสร้างไฟล์ PDF ได้" }));
        return NextResponse.json(body, { status: res.status });
    }
    const data: { prod_name: string; questions: RawQuestion[] } = await res.json();
    const questions = await Promise.all(data.questions.map(toPdfQuestion));

    const watermarkTiledImage = loadWatermarkTiledImage();
    const buffer = await renderToBuffer(
        <ExamPdfDocument productName={data.prod_name} questions={questions} watermarkTiledImage={watermarkTiledImage} />
    );

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="fasttiw-${id}.pdf"`,
            "Cache-Control": "no-store",
        },
    });
}
