import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ExamPdfDocument, loadWatermarkTiledImage } from "@/lib/pdf/ExamPdfDocument";
import { toPdfQuestion } from "@/lib/pdf/pdfQuestions";
import { fetchGroupBooklet, type GroupBookletData } from "@/lib/paper/printData";

// ชุดข้อสอบของกลุ่มสอบกระดาษ (ไม่มีเฉลย) — CLAUDE.md ข้อ 6.9.1
//   ชุดเดียวกัน → ไฟล์เดียวพิมพ์ซ้ำตามจำนวนคน · แบ่งชุด → ?variant=A · สลับไม่ซ้ำ → ?member=<รหัสลูกค้า> (มีชื่อกำกับ)

function headerFor(data: GroupBookletData): { badge?: string; note: string; suffix: string } {
    if (data.anti_cheat === "variants" && data.variant) {
        return {
            badge: `ชุด ${data.variant}`,
            note: `${data.group_title} — ใช้กับกระดาษคำตอบที่เขียนว่า "ชุด ${data.variant}" เท่านั้น`,
            suffix: `set-${data.variant}`,
        };
    }
    if (data.anti_cheat === "unique" && data.holder_name) {
        return {
            badge: data.holder_name,
            note: `${data.group_title} · ใบสอบ ${data.code} — ใช้กับกระดาษคำตอบที่มีชื่อเดียวกันเท่านั้น`,
            suffix: data.code,
        };
    }
    return { note: `${data.group_title} — ชุดเดียวกันทั้งกลุ่ม ใช้กับกระดาษคำตอบของทุกคน`, suffix: "all" };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[A-Za-z0-9-]{1,40}$/.test(id)) return NextResponse.json({ message: "ไม่พบกลุ่มนี้" }, { status: 404 });
    const url = new URL(req.url);
    const result = await fetchGroupBooklet(id, { variant: url.searchParams.get("variant"), member: url.searchParams.get("member") });
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
    const { data } = result;
    const header = headerFor(data);

    const questions = await Promise.all(data.questions.map(toPdfQuestion));
    const buffer = await renderToBuffer(
        <ExamPdfDocument
            productName={data.prod_name}
            totalScore={data.prod_total_score}
            questions={questions}
            watermarkTiledImage={loadWatermarkTiledImage()}
            formNote={header.note}
            badge={header.badge}
        />
    );
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="fasttiw-group-${id}-questions-${header.suffix}.pdf"`,
            "Cache-Control": "no-store",
        },
    });
}
