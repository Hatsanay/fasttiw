import "server-only";
import { authorizedFetch } from "@/lib/session";
import type { RawPdfQuestion } from "@/lib/pdf/pdfQuestions";

// ข้อมูลของใบสอบกระดาษสำหรับพิมพ์ PDF (ลำดับข้อ/ตัวเลือกที่ตรึงไว้ตอนสร้างใบสอบ) — backend ตรวจเจ้าของ+สิทธิ์ให้แล้ว
export type PaperPrintData = {
    code: string;
    prod_name: string;
    prod_total_score: string | number | null;
    pages: number;
    shuffled: boolean;
    choice_counts: number[];
    questions: RawPdfQuestion[];
};

export async function fetchPaperPrintData(code: string): Promise<{ ok: true; data: PaperPrintData } | { ok: false; status: number; message: string }> {
    const res = await authorizedFetch(`/store/paper-forms/${encodeURIComponent(code)}/print`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, status: res.status, message: body.message ?? "ไม่สามารถสร้างไฟล์ได้" };
    }
    return { ok: true, data: await res.json() };
}

/** ชื่อไฟล์ที่ดาวน์โหลด — รหัสใบสอบอยู่ในชื่อ ลูกค้าจับคู่ชุดข้อสอบกับกระดาษคำตอบได้จากชื่อไฟล์ */
export function paperFileName(code: string, kind: "booklet" | "answer-sheet") {
    return `fasttiw-${code}-${kind === "booklet" ? "questions" : "answer-sheet"}.pdf`;
}
