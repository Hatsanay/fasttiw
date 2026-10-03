"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CHOICE_LABELS, QUESTIONS_PER_PAGE, type Point } from "@/lib/paper/layout";
import { SHADOW_SCORE, grayToRgba, type GrayImage, type QuestionReading } from "@/lib/paper/omr";
import { CURLED_PAPER_REASON, cropQuestionRow, grayToJpeg, type LocatedPage } from "@/lib/paper/scan";
import { analyzePage } from "@/lib/paper/scanWorker";

// ชิ้นส่วนที่หน้าตรวจใบเดียว (forms/[code]/ScanClient) กับหน้าสแกนทั้งกองของกลุ่ม (groups/[id]/scan) ใช้ร่วมกัน
// กติกาเดียวกันทุกที่: **ไม่เดา** — ข้อที่ฝนหลายวง/จาง/ลบไม่หมด ต้องให้คนเลือกเองก่อนส่งได้

/** shadow = รูปนี้มีเงาทับกระดาษ (omr.lightingScore) — ใช้บอกว่าถ่ายใหม่แล้วจะต้องยืนยันน้อยลง */
export type PageScan = { rect: GrayImage; readings: QuestionReading[]; blob: Blob; preview: string; shadow: boolean };
/** คำตอบสุดท้ายของข้อ: ดัชนีตัวเลือก / null = ไม่ได้ตอบ / undefined = ยังต้องยืนยัน */
export type QuestionState = { number: number; reading: QuestionReading["reading"]; answer: number | null | undefined; edited: boolean; shift?: Point };
export type Overrides = Record<number, number | null>;

const REASON_TEXT = { multiple: "ฝนมากกว่า 1 วง", faint: "ฝนจางเกินไป", erased: "มีรอยลบไม่หมด" } as const;

function stateOf(reading: QuestionReading["reading"], override: number | null | undefined, hasOverride: boolean): QuestionState["answer"] {
    if (hasOverride) return override;
    if (reading.kind === "answer") return reading.choice;
    if (reading.kind === "blank") return null;
    return undefined;
}

/** สถานะคำตอบทุกข้อจากหน้าที่สแกนแล้ว + ที่คนแก้/ยืนยันไว้ เรียงตามเลขข้อ */
export function questionStates(pages: Record<number, PageScan>, overrides: Overrides): QuestionState[] {
    const out: QuestionState[] = [];
    for (const scan of Object.values(pages)) {
        for (const r of scan.readings) {
            const has = Object.prototype.hasOwnProperty.call(overrides, r.number);
            out.push({ number: r.number, reading: r.reading, answer: stateOf(r.reading, overrides[r.number], has), edited: has, shift: r.shift });
        }
    }
    return out.sort((a, b) => a.number - b.number);
}

/**
 * อ่านหน้าที่หาแผ่นเจอแล้ว ตามผังของใบสอบ (choiceCounts/pages) — คืน PageScan หรือเหตุผลที่ใช้ไม่ได้
 * ไม่ตรวจรหัสใบสอบ (ผู้เรียกจับคู่เอง: ใบเดียวต้องตรงใบนี้ · ทั้งกองหาใบจากรหัส)
 */
export async function scanPage(
    { id, rect }: Extract<LocatedPage, { ok: true }>,
    form: { pages: number; choice_counts: number[] }
): Promise<{ ok: true; scan: PageScan } | { ok: false; reason: string }> {
    // อ่านวง + วัดเงาใน Web Worker (จอไม่ค้าง) — scanWorker.ts
    const analysis = id.pages === form.pages ? await analyzePage(rect, form.choice_counts, id.page) : null;
    const read = analysis?.read;
    if (!read) return { ok: false, reason: "จำนวนหน้าไม่ตรงกับใบสอบนี้ — ใช้กระดาษคำตอบที่ดาวน์โหลดจากใบสอบนี้เท่านั้น" };
    if (read.problem) return { ok: false, reason: CURLED_PAPER_REASON };
    const blob = analysis.jpeg ?? (await grayToJpeg(rect));
    return {
        ok: true,
        scan: { rect, readings: read.readings, blob, preview: URL.createObjectURL(blob), shadow: analysis.shadow < SHADOW_SCORE },
    };
}

/** ถ่ายหน้าเดิมใหม่ = ทิ้งที่แก้ไว้ของหน้านั้น (ผลอ่านชุดใหม่อาจต่างจากเดิม) */
export function dropPageOverrides(overrides: Overrides, page: number, count: number): Overrides {
    const first = (page - 1) * QUESTIONS_PER_PAGE + 1;
    const last = first + count - 1;
    return Object.fromEntries(Object.entries(overrides).filter(([n]) => Number(n) < first || Number(n) > last));
}

/** ส่งตรวจ — คำตอบทุกข้อตามลำดับในใบสอบ (หน้าที่ไม่ได้สแกน = ไม่ได้ตอบ) + ภาพที่ดึงตรงแล้วของหน้าที่สแกน */
export async function submitGrade(code: string, questionCount: number, states: QuestionState[], pages: Record<number, PageScan>) {
    const answers: (number | null)[] = Array.from({ length: questionCount }, () => null);
    for (const s of states) answers[s.number - 1] = s.answer ?? null;
    const body = new FormData();
    body.append("answers", JSON.stringify(answers));
    for (const p of Object.keys(pages).map(Number)) body.append(`page_${p}`, pages[p].blob, `page_${p}.jpg`);
    const res = await fetch(`/api/paper-forms/${encodeURIComponent(code)}/grade`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message ?? "ส่งตรวจไม่สำเร็จ กรุณาลองใหม่");
    return data as { att_id: string; replaced: boolean; score: number; correct_count: number; total_questions: number; viewer: "holder" | "organizer" };
}

/** ภาพแถวของข้อหนึ่งจากกระดาษจริง — ให้เห็นเองว่าฝนไว้แบบไหน ก่อนตัดสินใจ */
function RowImage({ rect, counts, number, shift }: { rect: GrayImage; counts: number[]; number: number; shift?: Point }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        const crop = cropQuestionRow(rect, counts, number, shift);
        if (!canvas || !crop) return;
        canvas.width = crop.width;
        canvas.height = crop.height;
        canvas.getContext("2d")!.putImageData(new ImageData(grayToRgba(crop), crop.width, crop.height), 0, 0);
    }, [rect, counts, number, shift]);
    return <canvas ref={ref} className="h-auto w-full max-w-72 rounded-lg border border-slate-200 bg-white" aria-label={`ภาพข้อ ${number} บนกระดาษ`} />;
}

export function QuestionPicker({
    number,
    choiceCount,
    state,
    rect,
    counts,
    onPick,
}: {
    number: number;
    choiceCount: number;
    state: QuestionState;
    rect: GrayImage;
    counts: number[];
    onPick: (value: number | null) => void;
}) {
    const candidates = state.reading.kind === "unclear" ? state.reading.candidates : [];
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">ข้อ {number}</span>
                {state.reading.kind === "unclear" && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{REASON_TEXT[state.reading.reason]}</span>
                )}
            </div>
            <RowImage rect={rect} counts={counts} number={number} shift={state.shift} />
            <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: choiceCount }, (_, c) => (
                    <button
                        key={c}
                        type="button"
                        aria-pressed={state.answer === c}
                        onClick={() => onPick(c)}
                        className={cn(
                            "h-10 min-w-10 rounded-lg border-2 px-3 text-sm font-semibold transition-colors",
                            state.answer === c
                                ? "border-brand-600 bg-brand-600 text-white"
                                : candidates.includes(c)
                                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400"
                                  : "border-slate-200 text-slate-700 hover:border-slate-300"
                        )}
                    >
                        {CHOICE_LABELS[c]}
                    </button>
                ))}
                <button
                    type="button"
                    aria-pressed={state.answer === null}
                    onClick={() => onPick(null)}
                    className={cn(
                        "h-10 rounded-lg border-2 px-3 text-sm transition-colors",
                        state.answer === null ? "border-slate-700 bg-slate-700 text-white" : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                >
                    ไม่ได้ตอบ
                </button>
            </div>
        </div>
    );
}
