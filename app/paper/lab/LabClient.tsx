"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, FileImage } from "lucide-react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { CHOICE_LABELS, pageSlots, paginate } from "@/lib/paper/layout";
import { RECTIFY_PX_PER_MM, grayToRgba, type GrayImage, type QuestionReading } from "@/lib/paper/omr";
import { CURLED_PAPER_REASON, locatePage, readPage } from "@/lib/paper/scan";
import { parseLabCode } from "@/lib/paper/lab";
import { describeMark, judge, testPattern, type Mark, type Verdict } from "@/lib/paper/testPattern";

// หน้าแล็บ (เฉพาะ dev) — รันตัวอ่านตัวเดียวกับที่จะใช้จริงในเบราว์เซอร์ แล้วเทียบกับแบบฝนของแผ่นทดสอบ
// ตัวเลขที่ต้องดู: "ผิดโดยไม่เตือน" ต้องเป็น 0 เสมอ · "ถามยืนยัน" ยิ่งน้อยยิ่งดี แต่ไม่ใช่ความผิด

type Row = { reading: QuestionReading; mark: Mark; verdict: Verdict };
type Result =
    | { name: string; ok: false; reason: string; detail?: string; ms: number }
    | { name: string; ok: true; code: string; page: number; pages: number; rect: GrayImage; rows: Row[]; ms: number };

const VERDICT_STYLE: Record<Verdict, { label: string; ring: string; chip: string }> = {
    exact: { label: "ถูกเป๊ะ", ring: "#16a34a", chip: "bg-green-50 text-green-700" },
    flagged: { label: "ถามยืนยัน", ring: "#d97706", chip: "bg-amber-50 text-amber-700" },
    silent_error: { label: "ผิดโดยไม่เตือน", ring: "#dc2626", chip: "bg-red-50 text-red-600" },
};

async function analyze(file: File): Promise<Result> {
    const t0 = performance.now();
    const located = await locatePage(file);
    const ms = () => Math.round(performance.now() - t0);
    if (!located.ok) return { name: file.name, ok: false, reason: located.reason, detail: located.detail, ms: ms() };
    const { id, rect } = located;
    const spec = parseLabCode(id.code);
    if (!spec) return { name: file.name, ok: false, reason: `QR "${id.code}" ไม่ใช่แผ่นทดสอบของแล็บ`, ms: ms() };
    const counts = Array.from({ length: spec.questions }, () => spec.choices);
    const page = paginate(counts)[id.page - 1];
    const read = readPage(rect, counts, id.page);
    if (!page || !read) return { name: file.name, ok: false, reason: `ไม่มีหน้า ${id.page} ในแผ่นนี้`, ms: ms() };
    if (read.problem) return { name: file.name, ok: false, reason: CURLED_PAPER_REASON, detail: read.problem, ms: ms() };
    const readings = read.readings;
    const marks = testPattern(spec.code, counts).slice(page.firstNumber - 1, page.firstNumber - 1 + page.choiceCounts.length);
    const rows = readings.map((reading, i) => ({ reading, mark: marks[i], verdict: judge(marks[i], reading.reading) }));
    return { name: file.name, ok: true, code: id.code, page: id.page, pages: id.pages, rect, rows, ms: ms() };
}

function readingText(r: QuestionReading["reading"]): string {
    if (r.kind === "answer") return CHOICE_LABELS[r.choice];
    if (r.kind === "blank") return "ไม่ได้ตอบ";
    const why = { multiple: "ฝนหลายวง", faint: "จาง", erased: "ลบไม่หมด" }[r.reason];
    return `ถาม (${why}: ${r.candidates.map((c) => CHOICE_LABELS[c]).join("/")})`;
}

/** ภาพที่ดึงตรงแล้ว + วงสีบอกผลแต่ละข้อ (เขียว/เหลือง/แดง) */
function RectPreview({ result }: { result: Extract<Result, { ok: true }> }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const { rect, rows } = result;
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext("2d")!;
        ctx.putImageData(new ImageData(grayToRgba(rect), rect.width, rect.height), 0, 0);
        const counts = rows.map((r) => r.reading.fills.length);
        const slots = pageSlots(counts, rows[0]?.reading.number ?? 1);
        ctx.lineWidth = 3;
        slots.forEach((slot, i) => {
            const { verdict } = rows[i];
            const first = slot.bubbles[0];
            const last = slot.bubbles[slot.bubbles.length - 1];
            ctx.strokeStyle = VERDICT_STYLE[verdict].ring;
            const px = RECTIFY_PX_PER_MM;
            ctx.strokeRect((first.x - 3.2) * px, (first.y - 3.2) * px, (last.x - first.x + 6.4) * px, 6.4 * px);
        });
    }, [result]);
    return <canvas ref={ref} className="w-full rounded-lg border border-slate-200" />;
}

export default function LabClient() {
    const [results, setResults] = useState<Result[]>([]);
    const [busy, setBusy] = useState(false);

    async function handleFiles(files: FileList | null) {
        if (!files?.length) return;
        setBusy(true);
        const out: Result[] = [];
        for (const file of Array.from(files)) {
            try {
                out.push(await analyze(file));
            } catch (err) {
                out.push({ name: file.name, ok: false, reason: err instanceof Error ? err.message : String(err), ms: 0 });
            }
        }
        setResults((prev) => [...out, ...prev]);
        setBusy(false);
    }

    const totals = results.reduce(
        (acc, r) => {
            if (!r.ok) acc.rejected++;
            else for (const row of r.rows) acc[row.verdict]++;
            return acc;
        },
        { exact: 0, flagged: 0, silent_error: 0, rejected: 0 }
    );

    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <p className="text-sm font-medium text-brand-600">ระบบสอบกระดาษ · เฟส 0 (เฉพาะเครื่อง dev)</p>
            <h1 className="text-2xl font-semibold text-slate-900 mt-1">แล็บทดสอบการอ่านกระดาษคำตอบ</h1>

            <Card className="mt-6 p-5">
                <p className="font-medium text-slate-800">1. พิมพ์แผ่นทดสอบ แล้วฝนตามใบบอกวิธีฝน (หน้าสุดท้ายของไฟล์)</p>
                <p className="mt-1 text-sm text-slate-500">พิมพ์ A4 ขนาดจริง 100% · ใช้ดินสอ 2B / ปากกาหลายแบบปนกันได้ · แต่ละชุดฝนต่างกัน</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {[
                        { href: "/api/paper/test-sheet?n=100&choices=4&set=1", label: "ชุดที่ 1 (100 ข้อ)" },
                        { href: "/api/paper/test-sheet?n=100&choices=4&set=2", label: "ชุดที่ 2 (100 ข้อ)" },
                        { href: "/api/paper/test-sheet?n=100&choices=4&set=3", label: "ชุดที่ 3 (100 ข้อ)" },
                        { href: "/api/paper/test-sheet?n=282&choices=4&set=4", label: "ชุดยาว 282 ข้อ (3 หน้า)" },
                    ].map((l) => (
                        <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
                            <Download size={14} />
                            {l.label}
                        </a>
                    ))}
                </div>
            </Card>

            <Card className="mt-4 p-5">
                <p className="font-medium text-slate-800">2. ถ่ายรูปกระดาษคำตอบ แล้วเลือกรูป (เลือกหลายรูปพร้อมกันได้)</p>
                <p className="mt-1 text-sm text-slate-500">
                    ลองหลายแบบ: ไฟห้อง/แสงแดด/มีเงามือ · ถ่ายตรง/เอียง · มือถือหลายรุ่น — ให้เห็นสี่เหลี่ยมดำครบ 4 มุม
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                        <Camera size={16} />
                        ถ่ายรูป / เลือกรูป
                        <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm text-slate-700">
                        <FileImage size={16} />
                        เลือกจากไฟล์ในเครื่อง
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    </label>
                </div>
                {busy && <p className="mt-3 text-sm text-slate-500">กำลังอ่าน...</p>}
            </Card>

            {results.length > 0 && (
                <Card className="mt-4 p-5">
                    <p className="font-medium text-slate-800">ผลรวม {results.length} รูป</p>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        {[
                            { n: totals.exact, label: "ถูกเป๊ะ", c: "text-green-600" },
                            { n: totals.flagged, label: "ถามยืนยัน", c: "text-amber-600" },
                            { n: totals.silent_error, label: "ผิดโดยไม่เตือน (ต้องเป็น 0)", c: "text-red-600" },
                            { n: totals.rejected, label: "รูปที่ให้ถ่ายใหม่", c: "text-slate-500" },
                        ].map((x) => (
                            <div key={x.label} className="rounded-xl bg-slate-50 p-3">
                                <p className={cn("text-2xl font-semibold tabular-nums", x.c)}>{x.n}</p>
                                <p className="text-xs text-slate-500">{x.label}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {results.map((r, i) => (
                <Card key={i} className="mt-4 p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-slate-800 break-all">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.ms} ms</p>
                    </div>
                    {!r.ok ? (
                        <>
                            <p className="mt-2 text-sm text-red-600">ให้ถ่ายใหม่: {r.reason}</p>
                            {r.detail && <p className="mt-1 text-xs text-slate-400">สาเหตุทางเทคนิค: {r.detail}</p>}
                        </>
                    ) : (
                        <div className="mt-3 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
                            <RectPreview result={r} />
                            <div>
                                <p className="text-sm text-slate-600">
                                    {r.code} · หน้า {r.page}/{r.pages}
                                </p>
                                {(["silent_error", "flagged"] as Verdict[]).map((v) => {
                                    const rows = r.rows.filter((row) => row.verdict === v);
                                    if (!rows.length) return null;
                                    return (
                                        <div key={v} className="mt-3">
                                            <p className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", VERDICT_STYLE[v].chip)}>
                                                {VERDICT_STYLE[v].label} {rows.length} ข้อ
                                            </p>
                                            <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                                                {rows.map((row) => (
                                                    <li key={row.reading.number} className="tabular-nums">
                                                        ข้อ {row.reading.number}: ฝน {describeMark(row.mark)} → อ่านได้ {readingText(row.reading.reading)}{" "}
                                                        <span className="text-slate-400">[{row.reading.fills.map((f) => f.toFixed(2)).join(" ")}]</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                                <p className="mt-3 text-xs text-green-700">ถูกเป๊ะ {r.rows.filter((row) => row.verdict === "exact").length} ข้อ</p>
                            </div>
                        </div>
                    )}
                </Card>
            ))}
        </main>
    );
}
