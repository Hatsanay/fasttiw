"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Camera, Check, ChevronRight, ImagePlus, Loader2, RotateCcw, ScanLine, Send } from "lucide-react";
import AutoCamera, { type CaptureOutcome } from "./AutoCamera";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CHOICE_LABELS, QUESTIONS_PER_PAGE, paginate } from "@/lib/paper/layout";
import { RECTIFY_PX_PER_MM, SHADOW_SCORE, grayToRgba, lightingScore, type GrayImage, type QuestionReading } from "@/lib/paper/omr";
import { CURLED_PAPER_REASON, cropQuestionRow, grayToJpeg, locatePage, readPage, type LocatedPage } from "@/lib/paper/scan";
import type { Point } from "@/lib/paper/layout";

// ตรวจกระดาษคำตอบ (ระบบสอบกระดาษ เฟส 2 — CLAUDE.md ข้อ 6.9)
// ถ่าย/เลือกรูป → อ่านในเครื่อง (lib/paper/scan.ts) → ลูกค้ายืนยันข้อที่อ่านไม่ชัด (+ แก้ข้อไหนก็ได้) → ส่งตรวจ → หน้าเฉลย
// หลักการเดียวกับตัวอ่าน: **ไม่เดา** — ข้อที่ฝนหลายวง/จาง/ลบไม่หมด ต้องให้ลูกค้าเลือกเองก่อนส่งได้

export type PaperFormInfo = {
    code: string;
    product_id: string;
    prod_name: string;
    pages: number;
    question_count: number;
    choice_counts: number[];
    created_at: string;
    result: { att_id: string; score: number; graded_at: string } | null;
    scanned_pages: number[];
};

/** shadow = รูปนี้มีเงาทับกระดาษ (omr.lightingScore) — ใช้บอกลูกค้าว่าถ่ายใหม่แล้วจะต้องยืนยันน้อยลง */
type PageScan = { rect: GrayImage; readings: QuestionReading[]; blob: Blob; preview: string; shadow: boolean };
type Failure = { name: string; reason: string };
/** คำตอบสุดท้ายของข้อ: ดัชนีตัวเลือก / null = ไม่ได้ตอบ / undefined = ยังต้องยืนยัน */
type QuestionState = { number: number; reading: QuestionReading["reading"]; answer: number | null | undefined; edited: boolean; shift?: Point };

const REASON_TEXT = { multiple: "ฝนมากกว่า 1 วง", faint: "ฝนจางเกินไป", erased: "มีรอยลบไม่หมด" } as const;

const TIPS = [
    "วางกระดาษให้เรียบบนพื้นสีเข้ม แสงสว่างพอ ไม่มีเงามือหรือเงาโทรศัพท์ทับ (มีเงา: ยกมือถือสูงขึ้นหรือเอียงเล็กน้อย / เปิดไฟฉาย)",
    "ให้เห็นสี่เหลี่ยมดำครบทั้ง 4 มุม และ QR มุมขวาบนชัด",
    "ถ่ายตรงจากด้านบน กระดาษ 1 หน้าต่อ 1 รูป (ชุดที่มีหลายหน้า ถ่ายทีละหน้า เลือกพร้อมกันหลายรูปได้)",
];

function stateOf(reading: QuestionReading["reading"], override: number | null | undefined, hasOverride: boolean): QuestionState["answer"] {
    if (hasOverride) return override;
    if (reading.kind === "answer") return reading.choice;
    if (reading.kind === "blank") return null;
    return undefined;
}

/** ภาพแถวของข้อหนึ่งจากกระดาษจริง — ให้ลูกค้าเห็นเองว่าฝนไว้แบบไหน ก่อนตัดสินใจ */
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

function QuestionPicker({
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

export default function ScanClient({ form }: { form: PaperFormInfo }) {
    const router = useRouter();
    const [pages, setPages] = useState<Record<number, PageScan>>({});
    const [overrides, setOverrides] = useState<Record<number, number | null>>({});
    const [failures, setFailures] = useState<Failure[]>([]);
    const [progress, setProgress] = useState<string | null>(null);
    const [editing, setEditing] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [liveCamera, setLiveCamera] = useState(false);
    const cameraRef = useRef<HTMLInputElement>(null);
    const pickRef = useRef<HTMLInputElement>(null);
    const layout = useMemo(() => paginate(form.choice_counts), [form.choice_counts]);

    // คืนหน่วยความจำของรูปตัวอย่างตอนออกจากหน้า
    const pagesRef = useRef(pages);
    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);
    useEffect(() => () => Object.values(pagesRef.current).forEach((p) => URL.revokeObjectURL(p.preview)), []);

    /** รับหน้าที่อ่านได้แล้ว (จากไฟล์หรือกล้องสด) — ตรวจว่าเป็นของใบนี้ อ่านวง แล้วเก็บ · ใช้ทั้งสองทางจึงมีกติกาชุดเดียว */
    async function acceptPage({ id, rect }: Extract<LocatedPage, { ok: true }>): Promise<CaptureOutcome> {
        if (id.code !== form.code) return { ok: false, reason: `เป็นกระดาษคำตอบของใบสอบ ${id.code} ไม่ใช่ใบนี้ (${form.code})` };
        const read = id.pages === form.pages ? readPage(rect, form.choice_counts, id.page) : null;
        if (!read) return { ok: false, reason: "จำนวนหน้าไม่ตรงกับใบสอบนี้ — ใช้กระดาษคำตอบที่ดาวน์โหลดจากใบสอบนี้เท่านั้น" };
        if (read.problem) return { ok: false, reason: CURLED_PAPER_REASON };
        const readings = read.readings;
        const blob = await grayToJpeg(rect);
        const scan: PageScan = { rect, readings, blob, preview: URL.createObjectURL(blob), shadow: lightingScore(rect, RECTIFY_PX_PER_MM) < SHADOW_SCORE };
        setPages((prev) => {
            if (prev[id.page]) URL.revokeObjectURL(prev[id.page].preview);
            return { ...prev, [id.page]: scan };
        });
        // ถ่ายหน้าเดิมใหม่ = ทิ้งที่แก้ไว้ของหน้านั้น (ผลอ่านชุดใหม่อาจต่างจากเดิม)
        const first = (id.page - 1) * QUESTIONS_PER_PAGE + 1;
        const last = first + readings.length - 1;
        setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([n]) => Number(n) < first || Number(n) > last)));
        setEditing((n) => (n !== null && n >= first && n <= last ? null : n));
        return { ok: true, page: id.page };
    }

    async function handleFiles(list: FileList | null) {
        const files = Array.from(list ?? []);
        if (!files.length) return;
        const failed: Failure[] = [];
        for (const [i, file] of files.entries()) {
            setProgress(files.length > 1 ? `กำลังอ่านรูปที่ ${i + 1} จาก ${files.length}...` : "กำลังอ่านกระดาษคำตอบ...");
            // ให้จอวาดข้อความก่อนเริ่มงานหนัก (อ่านรูปทำบนเธรดหลัก ~1-2 วินาทีบนมือถือ)
            await new Promise((r) => setTimeout(r, 30));
            const name = files.length > 1 ? `รูปที่ ${i + 1}` : "รูปนี้";
            try {
                const located = await locatePage(file);
                const outcome = located.ok ? await acceptPage(located) : located;
                if (!outcome.ok) failed.push({ name, reason: outcome.reason });
            } catch {
                failed.push({ name, reason: "เปิดรูปนี้ไม่ได้ — ลองถ่ายใหม่ หรือเลือกรูปอื่น" });
            }
        }
        setFailures(failed);
        setProgress(null);
        if (cameraRef.current) cameraRef.current.value = "";
        if (pickRef.current) pickRef.current.value = "";
    }

    /** สแกนอัตโนมัติด้วยกล้องสด — เบราว์เซอร์ที่เปิดกล้องสดไม่ได้ (ไม่ใช่ https / เบราว์เซอร์ในแอปบางตัว) ใช้กล้องของเครื่องแทน */
    function openCamera() {
        if (window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function") {
            setFailures([]);
            setLiveCamera(true);
        } else {
            cameraRef.current?.click();
        }
    }

    const states = useMemo(() => {
        const out: QuestionState[] = [];
        for (const scan of Object.values(pages)) {
            for (const r of scan.readings) {
                const has = Object.prototype.hasOwnProperty.call(overrides, r.number);
                out.push({ number: r.number, reading: r.reading, answer: stateOf(r.reading, overrides[r.number], has), edited: has, shift: r.shift });
            }
        }
        return out.sort((a, b) => a.number - b.number);
    }, [pages, overrides]);
    const stateByNumber = useMemo(() => new Map(states.map((s) => [s.number, s])), [states]);

    const scannedPages = Object.keys(pages).map(Number).sort((a, b) => a - b);
    const missingPages = layout.map((_, i) => i + 1).filter((p) => !pages[p]);
    const unclear = states.filter((s) => s.reading.kind === "unclear");
    const unresolved = states.filter((s) => s.answer === undefined).length;
    const answered = states.filter((s) => typeof s.answer === "number").length;
    const blank = states.filter((s) => s.answer === null).length;

    const pick = (number: number, value: number | null) => setOverrides((prev) => ({ ...prev, [number]: value }));
    const pageOf = (number: number) => Math.ceil(number / QUESTIONS_PER_PAGE);

    async function submit() {
        if (!scannedPages.length || unresolved > 0) return;
        setSubmitting(true);
        try {
            const answers: (number | null)[] = Array.from({ length: form.question_count }, () => null);
            for (const s of states) answers[s.number - 1] = s.answer ?? null;
            const body = new FormData();
            body.append("answers", JSON.stringify(answers));
            for (const p of scannedPages) body.append(`page_${p}`, pages[p].blob, `page_${p}.jpg`);
            const res = await fetch(`/api/paper-forms/${encodeURIComponent(form.code)}/grade`, { method: "POST", body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message ?? "ส่งตรวจไม่สำเร็จ กรุณาลองใหม่");
            toast.success(data.replaced ? "ตรวจใหม่เรียบร้อย — แทนผลเดิมแล้ว" : "ตรวจเรียบร้อย");
            router.push(`/exam/attempts/${data.att_id}/review`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "ส่งตรวจไม่สำเร็จ กรุณาลองใหม่");
            setSubmitting(false);
        }
    }

    const busy = progress !== null || submitting;

    return (
        <>
            <div className="text-center mb-8">
                <p className="text-sm font-medium text-brand-600 mb-1.5">{form.prod_name}</p>
                <h1 className="text-2xl font-semibold text-slate-900">ตรวจกระดาษคำตอบ</h1>
                <p className="mt-2 text-sm text-slate-500">
                    ใบสอบ <span className="font-semibold tracking-wide text-slate-700">{form.code}</span> ·{" "}
                    {form.question_count.toLocaleString("th-TH")} ข้อ · กระดาษคำตอบ {form.pages} หน้า
                </p>
            </div>

            {form.result && (
                <Card className="mb-4 flex flex-wrap items-center gap-3 border-green-100 bg-green-50/40 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                        <Check size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">ใบสอบนี้ตรวจแล้ว ได้ {form.result.score.toFixed(0)}%</p>
                        <p className="text-xs text-slate-500">สแกนใหม่แล้วส่งตรวจ = แทนผลเดิม (ผลเดิมจะหายไป)</p>
                    </div>
                    <Link
                        href={`/exam/attempts/${form.result.att_id}/review`}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                    >
                        ดูผลและเฉลย
                        <ChevronRight size={15} />
                    </Link>
                    {form.scanned_pages.length > 0 && (
                        <p className="w-full text-xs text-slate-500">
                            ภาพที่สแกนไว้ (เก็บ 90 วัน):{" "}
                            {form.scanned_pages.map((p, i) => (
                                <span key={p}>
                                    {i > 0 && " · "}
                                    <a href={`/api/paper-forms/${encodeURIComponent(form.code)}/scans/${p}`} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                                        หน้า {p}
                                    </a>
                                </span>
                            ))}
                        </p>
                    )}
                </Card>
            )}

            <Card className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <ScanLine size={19} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-medium text-slate-800">ถ่ายรูปกระดาษคำตอบ</p>
                        <p className="text-sm text-slate-500">ระบบอ่านรูปในเครื่องของคุณ แล้วส่งแค่คำตอบกับภาพกระดาษไปตรวจ</p>
                    </div>
                </div>
                <ul className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                    {TIPS.map((t) => (
                        <li key={t}>• {t}</li>
                    ))}
                </ul>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <input ref={pickRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <Button type="button" size="lg" className="mt-4 w-full" onClick={openCamera} disabled={busy}>
                    <ScanLine size={18} />
                    สแกนอัตโนมัติ
                </Button>
                <p className="mt-1.5 text-center text-xs text-slate-500">เปิดกล้องแล้วเล็งไปที่กระดาษ ระบบถ่ายให้เองเมื่อเจอกระดาษและถือนิ่ง</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" onClick={() => cameraRef.current?.click()} disabled={busy}>
                        <Camera size={16} />
                        ถ่ายรูปเอง
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => pickRef.current?.click()} disabled={busy}>
                        <ImagePlus size={16} />
                        เลือกรูป
                    </Button>
                </div>
                {progress && (
                    <p className="mt-3 flex items-center justify-center gap-2 text-sm text-brand-700" role="status">
                        <Loader2 size={16} className="animate-spin" />
                        {progress}
                    </p>
                )}
                {failures.length > 0 && (
                    <div className="mt-3 space-y-2" role="alert">
                        {failures.map((f, i) => (
                            <div key={i} className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                <p>
                                    <span className="font-medium">{f.name}อ่านไม่ได้:</span> {f.reason}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* สถานะรายหน้า — ชุดหลายหน้าต้องเห็นว่าขาดหน้าไหน */}
            <section className="mt-6 space-y-3">
                {layout.map((pg, i) => {
                    const p = i + 1;
                    const scan = pages[p];
                    const range = `ข้อ ${pg.firstNumber}–${pg.firstNumber + pg.choiceCounts.length - 1}`;
                    const pageStates = scan ? scan.readings.map((r) => stateByNumber.get(r.number)!).filter(Boolean) : [];
                    const needs = pageStates.filter((s) => s.answer === undefined).length;
                    return (
                        <Card key={p} className={cn("flex items-center gap-3 p-3", !scan && "border-dashed")}>
                            {scan ? (
                                // eslint-disable-next-line @next/next/no-img-element -- รูปในเครื่อง (object URL) ไม่ผ่าน next/image
                                <img src={scan.preview} alt={`กระดาษคำตอบหน้า ${p}`} className="h-20 w-14 shrink-0 rounded border border-slate-200 object-cover" />
                            ) : (
                                <span className="flex h-20 w-14 shrink-0 items-center justify-center rounded border border-dashed border-slate-200 text-slate-300">
                                    <ScanLine size={18} />
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-800">
                                    หน้า {p} <span className="font-normal text-slate-400">· {range}</span>
                                </p>
                                {scan ? (
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        ตอบ {pageStates.filter((s) => typeof s.answer === "number").length} · ไม่ได้ตอบ{" "}
                                        {pageStates.filter((s) => s.answer === null).length}
                                        {needs > 0 && <span className="whitespace-nowrap font-medium text-amber-700"> · ต้องยืนยัน {needs}</span>}
                                    </p>
                                ) : null}
                                {scan?.shadow && needs > 0 ? (
                                    <p className="mt-0.5 text-xs text-amber-700">รูปนี้มีเงาทับบางส่วน — ถ่ายใหม่แบบไม่มีเงา จะต้องยืนยันน้อยลง</p>
                                ) : null}
                                {scan ? null : (
                                    <p className="mt-0.5 text-xs text-slate-400">ยังไม่ได้สแกน</p>
                                )}
                            </div>
                            {scan && (
                                <Button type="button" variant="ghost" size="sm" onClick={openCamera} disabled={busy}>
                                    <RotateCcw size={14} />
                                    ถ่ายใหม่
                                </Button>
                            )}
                        </Card>
                    );
                })}
            </section>

            {unclear.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-sm font-medium text-slate-700">
                        ข้อที่ระบบอ่านไม่ชัด — เลือกให้ตรงกับที่ตั้งใจตอบ
                        {unresolved > 0 && <span className="text-amber-700"> (เหลือ {unresolved} ข้อ)</span>}
                    </h2>
                    <p className="mb-3 mt-0.5 text-xs text-slate-500">ระบบไม่เดาแทนคุณ ข้อพวกนี้ต้องยืนยันก่อนส่งตรวจ</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {unclear.map((s) => (
                            <QuestionPicker
                                key={s.number}
                                number={s.number}
                                choiceCount={form.choice_counts[s.number - 1]}
                                state={s}
                                rect={pages[pageOf(s.number)].rect}
                                counts={form.choice_counts}
                                onPick={(v) => pick(s.number, v)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {states.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-sm font-medium text-slate-700">คำตอบที่อ่านได้</h2>
                    <p className="mb-3 mt-0.5 text-xs text-slate-500">แตะข้อที่อยากแก้ เช่น ข้อที่ระบบอ่านไม่ตรงกับที่ฝนไว้</p>
                    {editing !== null && stateByNumber.get(editing) && (
                        <div className="mb-3">
                            <QuestionPicker
                                number={editing}
                                choiceCount={form.choice_counts[editing - 1]}
                                state={stateByNumber.get(editing)!}
                                rect={pages[pageOf(editing)].rect}
                                counts={form.choice_counts}
                                onPick={(v) => {
                                    pick(editing, v);
                                    setEditing(null);
                                }}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                        {states.map((s) => (
                            <button
                                key={s.number}
                                type="button"
                                onClick={() => setEditing((n) => (n === s.number ? null : s.number))}
                                aria-label={`ข้อ ${s.number}`}
                                className={cn(
                                    "flex flex-col items-center rounded-lg border py-1 text-xs transition-colors",
                                    editing === s.number
                                        ? "border-brand-500 ring-2 ring-brand-100"
                                        : s.answer === undefined
                                          ? "border-amber-300 bg-amber-50"
                                          : s.edited
                                            ? "border-brand-200 bg-brand-50/60"
                                            : "border-slate-100 bg-white hover:border-slate-300"
                                )}
                            >
                                <span className="text-[10px] text-slate-400 tabular-nums">{s.number}</span>
                                <span
                                    className={cn(
                                        "font-semibold",
                                        s.answer === undefined ? "text-amber-700" : s.answer === null ? "text-slate-300" : "text-slate-800"
                                    )}
                                >
                                    {s.answer === undefined ? "?" : s.answer === null ? "–" : CHOICE_LABELS[s.answer]}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {states.length > 0 && (
                <Card className="sticky bottom-3 mt-8 p-4 shadow-lg">
                    <p className="text-sm text-slate-600">
                        ตอบ {answered} · ไม่ได้ตอบ {blank}
                        {unresolved > 0 && <span className="font-medium text-amber-700"> · ต้องยืนยันอีก {unresolved} ข้อ</span>}
                    </p>
                    {missingPages.length > 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                            ยังไม่ได้สแกนหน้า {missingPages.join(", ")} — ถ้าส่งตอนนี้ ข้อในหน้านั้นนับเป็นไม่ได้ตอบ
                        </p>
                    )}
                    <Button type="button" size="lg" className="mt-3 w-full" onClick={submit} disabled={busy || unresolved > 0}>
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        {submitting ? "กำลังตรวจ..." : form.result ? "ส่งตรวจใหม่ (แทนผลเดิม)" : "ส่งตรวจ"}
                    </Button>
                </Card>
            )}

            {liveCamera && (
                <AutoCamera
                    totalPages={form.pages}
                    scannedPages={scannedPages}
                    onCapture={acceptPage}
                    onClose={() => setLiveCamera(false)}
                    onFallback={() => {
                        setLiveCamera(false);
                        cameraRef.current?.click();
                    }}
                />
            )}
        </>
    );
}
