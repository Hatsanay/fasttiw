"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Camera, Check, ChevronDown, ImagePlus, Loader2, ScanLine, Send } from "lucide-react";
import AutoCamera, { type CaptureOutcome } from "../../../AutoCamera";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { QUESTIONS_PER_PAGE } from "@/lib/paper/layout";
import { locatePage, type LocatedPage } from "@/lib/paper/scan";
import type { GroupSheet, GroupSheetsData } from "@/lib/paper/printData";
import { QuestionPicker, dropPageOverrides, questionStates, scanPage, submitGrade, type Overrides, type PageScan } from "../../../scanParts";

// สแกนกระดาษคำตอบทั้งกองของกลุ่ม (ผู้จัด — CLAUDE.md ข้อ 6.9.1 เฟส 3)
// สแกนต่อเนื่องได้ทุกใบในกองโดยไม่ต้องเลือกว่าเป็นของใคร — QR บนกระดาษบอกรหัสใบสอบ ระบบจับคู่กับสมาชิกเอง
// ใบที่อ่านชัดทุกข้อส่งตรวจรวดเดียวได้ · ใบที่มีข้ออ่านไม่ชัดต้องยืนยันก่อน (กติกา "ไม่เดา" เดียวกับหน้าตรวจใบเดียว)
// ผลเข้าประวัติของสมาชิกแต่ละคน (backend ใช้ pf_customer_id) — ผู้จัดเห็นแค่คะแนนตามที่สมาชิกยอมรับไว้ตอนเข้ากลุ่ม

type SheetScan = { pages: Record<number, PageScan>; overrides: Overrides };
type Done = { score: number } | { error: string };
type Failure = { name: string; reason: string };

const keyOf = (code: string, page: number) => `${code}|${page}`;

function SheetCard({
    sheet,
    scan,
    done,
    busy,
    onPick,
}: {
    sheet: GroupSheet;
    scan: SheetScan;
    done: Done | undefined;
    busy: boolean;
    onPick: (number: number, value: number | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const states = questionStates(scan.pages, scan.overrides);
    const unclear = states.filter((s) => s.reading.kind === "unclear");
    const unresolved = states.filter((s) => s.answer === undefined).length;
    const missing = Array.from({ length: sheet.pages }, (_, i) => i + 1).filter((p) => !scan.pages[p]);
    const first = Object.values(scan.pages)[0];
    return (
        <Card className={cn("p-3", done && "score" in done && "border-green-100 bg-green-50/30")}>
            <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- รูปในเครื่อง (object URL) ไม่ผ่าน next/image */}
                <img src={first.preview} alt={`กระดาษคำตอบของ ${sheet.holder_name}`} className="h-16 w-12 shrink-0 rounded border border-slate-200 object-cover" />
                <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-800">
                        {sheet.holder_name}
                        {sheet.variant && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">ชุด {sheet.variant}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {done && "score" in done ? (
                            <span className="inline-flex items-center gap-1 font-medium text-green-700">
                                <Check size={12} />
                                ตรวจแล้ว ได้ {done.score.toFixed(0)}%
                            </span>
                        ) : (
                            <>
                                ตอบ {states.filter((s) => typeof s.answer === "number").length} · ไม่ได้ตอบ {states.filter((s) => s.answer === null).length}
                                {unresolved > 0 && <span className="font-medium text-amber-700"> · ต้องยืนยัน {unresolved}</span>}
                                {missing.length > 0 && <span className="font-medium text-amber-700"> · ยังไม่ได้สแกนหน้า {missing.join(", ")}</span>}
                                {sheet.status === "graded" && <span> · ตรวจไปแล้วเดิม (ส่งใหม่ = แทนผลเดิม)</span>}
                            </>
                        )}
                    </p>
                    {done && "error" in done && <p className="mt-0.5 text-xs text-red-600">{done.error}</p>}
                </div>
                {unclear.length > 0 && !(done && "score" in done) && (
                    <Button type="button" size="sm" variant={unresolved ? "primary" : "ghost"} onClick={() => setOpen((v) => !v)} disabled={busy}>
                        {unresolved ? `ยืนยัน ${unresolved} ข้อ` : "ดูที่ยืนยันแล้ว"}
                        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
                    </Button>
                )}
            </div>
            {open && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {unclear.map((s) => (
                        <QuestionPicker
                            key={s.number}
                            number={s.number}
                            choiceCount={sheet.choice_counts[s.number - 1]}
                            state={s}
                            rect={scan.pages[Math.ceil(s.number / QUESTIONS_PER_PAGE)].rect}
                            counts={sheet.choice_counts}
                            onPick={(v) => onPick(s.number, v)}
                        />
                    ))}
                </div>
            )}
        </Card>
    );
}

export default function BatchScanClient({ groupId, data }: { groupId: string; data: GroupSheetsData }) {
    const [scans, setScans] = useState<Record<string, SheetScan>>({});
    const [done, setDone] = useState<Record<string, Done>>({});
    const [failures, setFailures] = useState<Failure[]>([]);
    const [progress, setProgress] = useState<string | null>(null);
    const [liveCamera, setLiveCamera] = useState(false);
    const cameraRef = useRef<HTMLInputElement>(null);
    const pickRef = useRef<HTMLInputElement>(null);
    const byCode = useMemo(() => new Map(data.sheets.map((s) => [s.code, s])), [data.sheets]);

    // คืนหน่วยความจำของรูปตัวอย่างตอนออกจากหน้า
    const scansRef = useRef(scans);
    useEffect(() => {
        scansRef.current = scans;
    }, [scans]);
    useEffect(() => () => Object.values(scansRef.current).forEach((s) => Object.values(s.pages).forEach((p) => URL.revokeObjectURL(p.preview))), []);

    /** แผ่นไหนก็ได้ในกอง — หาเจ้าของจากรหัสใบสอบใน QR แล้วอ่านตามผังของใบนั้น */
    async function acceptPage(located: Extract<LocatedPage, { ok: true }>): Promise<CaptureOutcome> {
        const { id } = located;
        const sheet = byCode.get(id.code);
        if (!sheet) return { ok: false, reason: `ใบสอบ ${id.code} ไม่ใช่ของกลุ่มนี้รอบนี้ — ใช้กระดาษที่พิมพ์จากรอบปัจจุบัน` };
        const result = await scanPage(located, sheet);
        if (!result.ok) return result;
        const { scan } = result;
        setScans((prev) => {
            const cur = prev[sheet.code] ?? { pages: {}, overrides: {} };
            if (cur.pages[id.page]) URL.revokeObjectURL(cur.pages[id.page].preview);
            return {
                ...prev,
                [sheet.code]: { pages: { ...cur.pages, [id.page]: scan }, overrides: dropPageOverrides(cur.overrides, id.page, scan.readings.length) },
            };
        });
        // สแกนใบเดิมใหม่หลังส่งตรวจไปแล้ว = ส่งใหม่ได้อีก (แทนผลเดิม)
        setDone((prev) => {
            const next = { ...prev };
            delete next[sheet.code];
            return next;
        });
        return { ok: true, key: keyOf(sheet.code, id.page), label: sheet.pages > 1 ? `${sheet.holder_name} หน้า ${id.page}` : sheet.holder_name };
    }

    async function handleFiles(list: FileList | null) {
        const files = Array.from(list ?? []);
        if (!files.length) return;
        const failed: Failure[] = [];
        for (const [i, file] of files.entries()) {
            setProgress(`กำลังอ่านรูปที่ ${i + 1} จาก ${files.length}...`);
            await new Promise((r) => setTimeout(r, 30));
            try {
                const located = await locatePage(file);
                const outcome = located.ok ? await acceptPage(located) : located;
                if (!outcome.ok) failed.push({ name: `รูปที่ ${i + 1}`, reason: outcome.reason });
            } catch {
                failed.push({ name: `รูปที่ ${i + 1}`, reason: "เปิดรูปนี้ไม่ได้ — ลองถ่ายใหม่ หรือเลือกรูปอื่น" });
            }
        }
        setFailures(failed);
        setProgress(null);
        if (cameraRef.current) cameraRef.current.value = "";
        if (pickRef.current) pickRef.current.value = "";
    }

    function openCamera() {
        if (window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function") {
            setFailures([]);
            setLiveCamera(true);
        } else {
            cameraRef.current?.click();
        }
    }

    const pick = (code: string, number: number, value: number | null) =>
        setScans((prev) => ({ ...prev, [code]: { ...prev[code], overrides: { ...prev[code].overrides, [number]: value } } }));

    const scanned = data.sheets.filter((s) => scans[s.code]);
    const notScanned = data.sheets.filter((s) => !scans[s.code]);
    // พร้อมส่ง = สแกนครบทุกหน้า + ไม่มีข้อค้างยืนยัน + ยังไม่ได้ส่งสำเร็จในรอบนี้
    const ready = scanned.filter((s) => {
        const scan = scans[s.code];
        const d = done[s.code];
        if (d && "score" in d) return false;
        const allPages = Array.from({ length: s.pages }, (_, i) => i + 1).every((p) => scan.pages[p]);
        return allPages && questionStates(scan.pages, scan.overrides).every((q) => q.answer !== undefined);
    });
    const graded = data.sheets.filter((s) => s.status === "graded" || (done[s.code] && "score" in done[s.code])).length;
    // กล้องปิดเองเมื่อสแกนครบทุกใบที่ยังไม่ได้ตรวจ (ใบที่ตรวจแล้วสแกนซ้ำได้ แต่ไม่นับว่าต้องรอ)
    const expected = data.sheets
        .filter((s) => s.status !== "graded")
        .flatMap((s) => Array.from({ length: s.pages }, (_, i) => ({ key: keyOf(s.code, i + 1), label: s.pages > 1 ? `${s.holder_name} หน้า ${i + 1}` : s.holder_name })));
    const doneKeys = Object.entries(scans).flatMap(([code, s]) => Object.keys(s.pages).map((p) => keyOf(code, Number(p))));

    async function submitReady() {
        const list = ready;
        let ok = 0;
        for (const [i, sheet] of list.entries()) {
            setProgress(`กำลังส่งตรวจใบที่ ${i + 1} จาก ${list.length} (${sheet.holder_name})...`);
            const scan = scans[sheet.code];
            try {
                const res = await submitGrade(sheet.code, sheet.choice_counts.length, questionStates(scan.pages, scan.overrides), scan.pages);
                setDone((prev) => ({ ...prev, [sheet.code]: { score: res.score } }));
                ok++;
            } catch (err) {
                setDone((prev) => ({ ...prev, [sheet.code]: { error: err instanceof Error ? err.message : "ส่งตรวจไม่สำเร็จ" } }));
            }
        }
        setProgress(null);
        if (ok === list.length) toast.success(`ตรวจเรียบร้อย ${ok} ใบ — ผลเข้าประวัติของแต่ละคนแล้ว`);
        else toast.error(`ตรวจได้ ${ok} จาก ${list.length} ใบ — ดูใบที่ไม่สำเร็จด้านล่าง`);
    }

    const busy = progress !== null;

    return (
        <>
            <Link href={`/exam/paper/groups/${groupId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft size={15} />
                กลับหน้ากลุ่ม
            </Link>
            <div className="text-center mb-8">
                <p className="text-sm font-medium text-brand-600 mb-1.5">{data.prod_name}</p>
                <h1 className="text-2xl font-semibold text-slate-900">สแกนกระดาษคำตอบทั้งกลุ่ม</h1>
                <p className="mt-2 text-sm text-slate-500">
                    {data.title} · รอบที่ {data.round} · ตรวจแล้ว {graded}/{data.sheets.length} คน
                </p>
            </div>

            {data.sheets.length === 0 ? (
                <Card className="p-8 text-center text-sm text-slate-500">ยังไม่ได้สร้างชุดสอบของรอบนี้ — กลับไปกด &quot;สร้างชุดสอบให้ทุกคน&quot; ที่หน้ากลุ่มก่อน</Card>
            ) : (
                <Card className="p-5 sm:p-6">
                    <p className="text-sm text-slate-600">
                        สแกนเรียงไปทีละแผ่นได้เลย ไม่ต้องเลือกว่าเป็นของใคร — ระบบอ่าน QR บนกระดาษแล้วจับคู่กับเจ้าของให้เอง · ผลเข้าประวัติของแต่ละคน
                    </p>
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    <input ref={pickRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    <Button type="button" size="lg" className="mt-4 w-full" onClick={openCamera} disabled={busy}>
                        <ScanLine size={18} />
                        สแกนอัตโนมัติต่อเนื่อง
                    </Button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button type="button" variant="secondary" onClick={() => cameraRef.current?.click()} disabled={busy}>
                            <Camera size={16} />
                            ถ่ายรูปเอง
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => pickRef.current?.click()} disabled={busy}>
                            <ImagePlus size={16} />
                            เลือกหลายรูป
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
            )}

            {scanned.length > 0 && (
                <section className="mt-6 space-y-3">
                    <h2 className="text-sm font-medium text-slate-700">สแกนแล้ว {scanned.length} คน</h2>
                    {scanned.map((s) => (
                        <SheetCard key={s.code} sheet={s} scan={scans[s.code]} done={done[s.code]} busy={busy} onPick={(n, v) => pick(s.code, n, v)} />
                    ))}
                </section>
            )}

            {notScanned.length > 0 && scanned.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-sm font-medium text-slate-700">ยังไม่ได้สแกน {notScanned.length} คน</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {notScanned.map((s) => `${s.holder_name}${s.status === "graded" ? " (ตรวจแล้ว)" : ""}`).join(" · ")}
                    </p>
                </section>
            )}

            {ready.length > 0 && (
                <Card className="sticky bottom-3 mt-8 p-4 shadow-lg">
                    <p className="text-sm text-slate-600">
                        พร้อมส่ง {ready.length} ใบ
                        {scanned.length - ready.length > 0 && (
                            <span className="text-amber-700"> · ที่เหลือต้องยืนยันข้อที่อ่านไม่ชัด/สแกนให้ครบหน้าก่อน</span>
                        )}
                    </p>
                    <Button type="button" size="lg" className="mt-3 w-full" onClick={submitReady} disabled={busy}>
                        {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        ส่งตรวจ {ready.length} ใบ
                    </Button>
                </Card>
            )}

            {liveCamera && (
                <AutoCamera
                    expected={expected}
                    doneKeys={doneKeys}
                    keyOf={(located) => keyOf(located.id.code, located.id.page)}
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
