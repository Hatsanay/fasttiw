import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { AnswerSheetDocument } from "@/lib/pdf/AnswerSheetDocument";
import { paginate } from "@/lib/paper/layout";
import { labCode } from "@/lib/paper/lab";
import { testPattern } from "@/lib/paper/testPattern";
import { isFeatureEnabled } from "@/lib/publicData";

// กระดาษคำตอบทดสอบ + ใบบอกวิธีฝน (ระบบสอบกระดาษ เฟส 0 — วัดความแม่นของการอ่านภาพก่อนสร้างระบบจริง)
// /api/paper/test-sheet?n=100&choices=4&set=1 · เครื่อง dev เปิดได้เสมอ เว็บจริงเฉพาะตอนเปิดฟีเจอร์ paper_exam
export async function GET(req: Request) {
    if (process.env.NODE_ENV === "production" && !(await isFeatureEnabled("paper_exam"))) {
        return NextResponse.json({ message: "ไม่พบหน้า" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const n = Math.min(300, Math.max(1, Number(searchParams.get("n")) || 100));
    const choices = Math.min(5, Math.max(2, Number(searchParams.get("choices")) || 4));
    const set = Math.max(1, Number(searchParams.get("set")) || 1);
    const code = labCode(n, choices, set);
    const counts = Array.from({ length: n }, () => choices);

    const buffer = await renderToBuffer(
        <AnswerSheetDocument productName="แผ่นทดสอบการอ่านกระดาษคำตอบ" code={code} pages={paginate(counts)} testMarks={testPattern(code, counts)} />
    );
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${code}.pdf"`,
            "Cache-Control": "no-store",
        },
    });
}
