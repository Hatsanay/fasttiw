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

type Fetched<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function fetchJson<T>(path: string): Promise<Fetched<T>> {
    const res = await authorizedFetch(path);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, status: res.status, message: body.message ?? "ไม่สามารถสร้างไฟล์ได้" };
    }
    return { ok: true, data: await res.json() };
}

// กลุ่มสอบกระดาษ (CLAUDE.md ข้อ 6.9.1) — backend ตรวจว่าเป็นผู้จัดและยังถือสิทธิ์ชุดนั้นให้แล้ว
export type GroupSheet = {
    code: string;
    holder_name: string;
    variant: string | null;
    pages: number;
    status: "printed" | "graded";
    choice_counts: number[];
};
export type GroupSheetsData = {
    title: string;
    prod_name: string;
    round: number;
    sheets: GroupSheet[];
};

export type GroupBookletData = PaperPrintData & {
    variant: string | null;
    group_title: string;
    anti_cheat: "same" | "variants" | "unique";
    holder_name: string | null;
};

export function fetchGroupSheets(groupId: string) {
    return fetchJson<GroupSheetsData>(`/store/paper-groups/${encodeURIComponent(groupId)}/sheets`);
}

export function fetchGroupBooklet(groupId: string, query: { variant?: string | null; member?: string | null }) {
    const qs = new URLSearchParams();
    if (query.variant) qs.set("variant", query.variant);
    if (query.member) qs.set("member", query.member);
    return fetchJson<GroupBookletData>(`/store/paper-groups/${encodeURIComponent(groupId)}/booklet${qs.size ? `?${qs}` : ""}`);
}

/** ชื่อไฟล์ที่ดาวน์โหลด — รหัสใบสอบอยู่ในชื่อ ลูกค้าจับคู่ชุดข้อสอบกับกระดาษคำตอบได้จากชื่อไฟล์ */
export function paperFileName(code: string, kind: "booklet" | "answer-sheet") {
    return `fasttiw-${code}-${kind === "booklet" ? "questions" : "answer-sheet"}.pdf`;
}
