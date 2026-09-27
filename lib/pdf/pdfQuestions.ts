import "server-only";
import sharp from "sharp";
import { productCoverUrl } from "@/lib/api";
import type { ExportPdfQuestion } from "./ExamPdfDocument";

// แปลงคำถามจาก backend → รูปแบบที่ ExamPdfDocument ใช้ (ดึงรูป+แปลงเป็น PNG) — ใช้ร่วมกันทั้ง PDF แบบฝึกหัด
// (/api/products/[id]/export-pdf) และชุดข้อสอบของใบสอบกระดาษ (/api/paper-forms/[code]/booklet)

export type RawPdfQuestion = {
    ques_id: string;
    ques_text: string;
    ques_image_url: string | null;
    ques_score: string | number | null;
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

export async function toPdfQuestion(q: RawPdfQuestion): Promise<ExportPdfQuestion> {
    const [quesImage, choiceImages] = await Promise.all([
        toPdfImageBuffer(q.ques_image_url),
        Promise.all(q.choices.map((c) => toPdfImageBuffer(c.cho_image_url))),
    ]);
    return {
        ques_id: q.ques_id,
        ques_text: q.ques_text,
        ques_score: q.ques_score,
        ques_image: quesImage,
        choices: q.choices.map((c, i) => ({ cho_id: c.cho_id, cho_text: c.cho_text, cho_image: choiceImages[i] })),
        reveal: q.reveal,
    };
}
