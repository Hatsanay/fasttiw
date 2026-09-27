"use client";

import type { CSSProperties, ReactNode } from "react";
import { Camera, Check, Download, FileText, Loader2, Printer, RotateCcw, ScanLine, Send, Shuffle, Sparkles, SquareCheckBig, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/api";
import type { Waypoint } from "@/app/components/phone-demo/PhoneScreen";
import { DemoNavbar, DemoToast, Page } from "@/app/components/phone-demo/kit";
import { PASS_PERCENT, REVIEW_QUESTION, TOPICS, pickDemoProducts } from "@/app/components/flow-demo/scenes";
import ReadinessCard from "@/app/exam/attempts/[id]/review/ReadinessCard";
import SheetReplica, { type SheetMarks } from "./SheetReplica";

// ฉากของ section "สอบแบบกระดาษ" บนหน้าแรก (ระบบสอบกระดาษ — CLAUDE.md ข้อ 6.9) — แต่ละฉากคือฟังก์ชันของเวลา t
//
// เวทีมี 2 ชิ้นซ้อนกัน: **มือถือ** (หน้าจอจริงฝั่งมือถือ) กับ **กระดาษคำตอบ** (SheetReplica — ผังเดียวกับ PDF จริง)
// แต่ละฉากบอกว่าสองชิ้นอยู่ตรงไหน (stage) + มือถือแสดงหน้าอะไร (screen) + ฝนไปถึงไหนแล้ว (marks)
//
// ⚠ **หน้าจอในมือถือต้องตรงกับหน้าจริง** — แก้หน้าจริงเมื่อไหร่ให้แก้ที่นี่ตาม:
//   app/exam/paper/[productId]/PaperSetupClient.tsx (ฉาก 1) · app/exam/paper/forms/[code]/AutoCamera.tsx (ฉาก 3)
//   · app/exam/paper/forms/[code]/ScanClient.tsx (ฉาก 4) · app/exam/attempts/[id]/review/page.tsx (ฉาก 5)
// ⚠ ห้ามใช้ class ที่มี breakpoint (sm:/md:/lg:) ในหน้าจอมือถือ — หน้าจอเสมือนกว้าง 375px เสมอ

export const DEMO_CODE = "PF-7K3Q9";

export type PaperDemoData = { productName: string; questionCount: number };

/** ชุดที่ใช้เล่าเรื่อง = ชุดเดียวกับ section "ดูทุกขั้นตอน" (ชุดยอดนิยมที่ต้องซื้อ) · กระดาษจำลองเป็น 1 หน้า 100 ข้อเสมอ */
export function pickPaperDemo(products: Product[]): PaperDemoData {
    return { productName: pickDemoProducts(products).product.prod_name, questionCount: 100 };
}

// ── การฝน: คำตอบของทั้งแผ่น (ข้อ 5 ฝน 2 วงไว้ให้ระบบถามในฉากยืนยัน · ข้อ 38, 77 เว้นว่าง) ──────────────────
export const DOUBLE_MARK_QUESTION = 5;
const answerOf = (q: number): number[] => (q === DOUBLE_MARK_QUESTION ? [0, 2] : q === 38 || q === 77 ? [] : [(q * 7 + 3) % 4]);
export const FULL_MARKS: SheetMarks = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, answerOf(i + 1)]));

// ── ตำแหน่งของสองชิ้นบนเวที ───────────────────────────────────────────────────────────────────────
export type StageState = {
    paper: CSSProperties;
    phone: CSSProperties;
    /** กระดาษอยู่หน้ามือถือไหม */
    paperOnTop: boolean;
    /** ซูมเข้าไปดูวงบนกระดาษ (scale + จุดศูนย์กลาง) */
    zoom?: { scale: number; origin: string };
    marks: SheetMarks;
    pencil?: { number: number; choice: number } | null;
};

const PAPER_HIDDEN: CSSProperties = { transform: "translateY(6%) scale(0.9)", opacity: 0 };
/** กระดาษโผล่ขึ้นเหนือมือถือ เหมือนเพิ่งออกจากเครื่องพิมพ์ */
const PAPER_PEEK: CSSProperties = { transform: "translate(-6%, -17%) rotate(-6deg)", opacity: 1 };
const PAPER_FRONT: CSSProperties = { transform: "translateY(4%) rotate(-1.5deg) scale(1.06)", opacity: 1 };
const PHONE_FRONT: CSSProperties = { transform: "none", opacity: 1 };
const PHONE_AWAY: CSSProperties = { transform: "translateY(10%) scale(0.9)", opacity: 0 };

export type PaperScene = {
    key: string;
    title: string;
    caption: string;
    duration: number;
    waypoints: Waypoint[];
    /** หน้าจอมือถือพื้นดำ (หน้ากล้อง) */
    dark?: boolean;
    stage: (t: number) => StageState;
    screen: (props: { t: number; demo: PaperDemoData }) => ReactNode;
};

// ── ฉาก 1: สร้างชุดสอบ + ดาวน์โหลดกระดาษคำตอบ (ตาม PaperSetupClient) ───────────────────────────────────
const S1 = { scrollCreate: 700, tapCreate: 1700, created: 2400, scrollForms: 2700, tapSheet: 3900, printed: 4700, end: 6600 };

const STEPS = [
    { icon: Sparkles, title: "สร้างชุดสอบ", desc: "ระบบออกรหัสใบสอบให้ 1 ชุด" },
    { icon: Printer, title: "พิมพ์ 2 ไฟล์", desc: "ชุดข้อสอบ + กระดาษคำตอบ" },
    { icon: SquareCheckBig, title: "ทำข้อสอบ", desc: "ฝนคำตอบในกระดาษคำตอบ" },
    { icon: Camera, title: "ถ่ายรูปให้ระบบตรวจ", desc: "ได้คะแนน + เฉลยละเอียด" },
];

function SetupScreen({ t, demo }: { t: number; demo: PaperDemoData }) {
    const creating = t >= S1.tapCreate && t < S1.created;
    const created = t >= S1.created;
    const downloading = t >= S1.tapSheet && t < S1.printed;
    const scrollTo = t >= S1.scrollForms ? "forms" : t >= S1.scrollCreate ? "create" : undefined;
    return (
        <Page pageKey="setup" nav={<DemoNavbar />} scrollTo={scrollTo}>
            <div className="px-4 py-10">
                <div className="text-center mb-8">
                    <p className="text-sm font-medium text-brand-600 mb-1.5">{demo.productName}</p>
                    <h1 className="text-2xl font-semibold text-slate-900">สอบแบบกระดาษ</h1>
                    <p className="mt-2 text-sm text-slate-500 text-balance">
                        พิมพ์ชุดข้อสอบกับกระดาษคำตอบไปทำเหมือนสนามจริง แล้วถ่ายรูปกระดาษคำตอบให้ระบบตรวจ ได้คะแนนและเฉลยละเอียดเหมือนทำบนเว็บ
                    </p>
                </div>
                <ol className="mb-8 grid grid-cols-2 gap-3">
                    {STEPS.map((s, i) => (
                        <li key={s.title} className="rounded-2xl border border-slate-100 bg-white p-3 text-center">
                            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                <s.icon size={17} />
                            </span>
                            <p className="text-sm font-medium text-slate-800">
                                <span className="text-brand-500 mr-1">{i + 1}.</span>
                                {s.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
                        </li>
                    ))}
                </ol>

                <div data-demo-anchor="create">
                    <Card className="p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                <FileText size={19} />
                            </span>
                            <div className="min-w-0">
                                <p className="font-medium text-slate-800">สร้างชุดสอบใหม่</p>
                                <p className="text-sm text-slate-500">ข้อสอบ {demo.questionCount} ข้อ · กระดาษคำตอบ 1 หน้า (A4)</p>
                            </div>
                        </div>
                        <div className="mt-5 flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 p-3.5 text-left">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <Shuffle size={17} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-slate-800">สลับลำดับข้อและตัวเลือก</span>
                                <span className="block text-xs text-slate-500">แต่ละชุดที่พิมพ์ลำดับไม่ซ้ำกัน เหมาะกับการทำซ้ำหลายรอบโดยไม่จำตำแหน่งคำตอบ</span>
                            </span>
                            <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-slate-300">
                                <span className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow" />
                            </span>
                        </div>
                        <Button type="button" size="lg" className="mt-5 w-full" data-demo="paper-create" disabled={creating}>
                            {creating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {creating ? "กำลังสร้าง..." : "สร้างชุดสอบ"}
                        </Button>
                    </Card>
                </div>

                {created && (
                    <section className="mt-8" data-demo-anchor="forms">
                        <h2 className="mb-3 text-sm font-medium text-slate-600">ชุดสอบที่สร้างไว้</h2>
                        <Card className="flow-pop p-4 border-brand-200 ring-2 ring-brand-100">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold tracking-wide text-brand-700">{DEMO_CODE}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                    <Check size={12} />
                                    สร้างแล้ว
                                </span>
                                <span className="ml-auto text-xs text-slate-400">28 ก.ย. 09:41</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">{demo.questionCount} ข้อ · กระดาษคำตอบ 1 หน้า · เรียงตามลำดับ</p>
                            <div className="mt-3 flex flex-col gap-2">
                                <Button type="button" size="sm" className="w-full">
                                    <Download size={15} />
                                    ชุดข้อสอบ
                                </Button>
                                <Button type="button" size="sm" className="w-full" data-demo="paper-sheet" disabled={downloading}>
                                    {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                    {downloading ? "กำลังสร้างไฟล์..." : "กระดาษคำตอบ"}
                                </Button>
                            </div>
                            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                                <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                                    <ScanLine size={15} />
                                    ถ่ายรูปให้ระบบตรวจ
                                </span>
                            </div>
                        </Card>
                    </section>
                )}
            </div>
        </Page>
    );
}

// ── ฉาก 2: ฝนคำตอบบนกระดาษ ────────────────────────────────────────────────────────────────────────
// ซูมเข้าไปดูคอลัมน์แรก ดินสอฝนทีละข้อ (ข้อ 1-12) → ซูมออก → ที่เหลือทั้งแผ่นเต็มเร็วๆ (ข้ามช่วงเวลาทำข้อสอบ)
const S2 = { front: 0, zoomIn: 700, fillStart: 1500, perQuestion: 280, slowUntil: 12, zoomOut: 5100, restStart: 5500, restEnd: 6900, end: 7800 };

/** เวลาที่ฝนแต่ละวงเสร็จ — ข้อ 5 วงที่สองตามมาห่างกันนิด (ฝน 2 วง) */
function markTime(q: number, nth: number): number {
    if (q <= S2.slowUntil) return S2.fillStart + (q - 1) * S2.perQuestion + nth * 140;
    return S2.restStart + ((q - S2.slowUntil - 1) / (100 - S2.slowUntil)) * (S2.restEnd - S2.restStart);
}

function marksAt(t: number): SheetMarks {
    const out: SheetMarks = {};
    for (const [q, choices] of Object.entries(FULL_MARKS)) {
        const done = choices.filter((_, nth) => t >= markTime(Number(q), nth));
        if (done.length) out[Number(q)] = done;
    }
    return out;
}

function pencilAt(t: number): StageState["pencil"] {
    if (t < S2.fillStart - 400 || t >= S2.zoomOut) return null;
    for (let q = 1; q <= S2.slowUntil; q++) {
        const choices = FULL_MARKS[q];
        for (let nth = 0; nth < choices.length; nth++) if (t < markTime(q, nth) + 60) return { number: q, choice: choices[nth] };
    }
    const last = FULL_MARKS[S2.slowUntil];
    return last.length ? { number: S2.slowUntil, choice: last[last.length - 1] } : null;
}

// ── ฉาก 3: สแกนอัตโนมัติ (ตาม AutoCamera) ──────────────────────────────────────────────────────────
const S3 = { slideIn: 0, found: 1300, steady: 2500, reading: 3000, done: 3600, end: 6000 };

function CameraScreen({ t, demo }: { t: number; demo: PaperDemoData }) {
    const found = t >= S3.found && t < S3.done;
    const steady = t >= S3.steady;
    const reading = t >= S3.reading && t < S3.done;
    const done = t >= S3.done;
    // มือถือถือไม่นิ่งก่อนระบบจับได้ — กระดาษในภาพขยับเล็กน้อย แล้วนิ่งตอนกรอบเป็นสีเขียว
    const drift = steady ? 0 : 1;
    const dx = Math.sin(t / 260) * 7 * drift;
    const dy = Math.cos(t / 330) * 6 * drift;
    const rot = 4 + Math.sin(t / 420) * 1.2 * drift;
    const hint = done
        ? { tone: "ok", text: "สแกนเรียบร้อย" }
        : reading
          ? { tone: "info", text: "กำลังอ่านกระดาษคำตอบ..." }
          : found
            ? { tone: "info", text: "ถือนิ่งๆ สักครู่..." }
            : { tone: "info", text: "เล็งให้เห็นกระดาษทั้งแผ่น — สี่เหลี่ยมดำครบ 4 มุม" };
    return (
        <div className="absolute inset-0 flex flex-col bg-black text-white">
            <div className="relative flex-1 overflow-hidden bg-[#3b4048]">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="relative w-[74%] transition-transform duration-150 ease-linear"
                        style={{ transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)` }}
                    >
                        <SheetReplica code={DEMO_CODE} productName={demo.productName} marks={FULL_MARKS} className="block w-full shadow-lg" />
                        {/* กรอบที่ระบบวาดรอบกระดาษ — ลากผ่านศูนย์กลางสี่เหลี่ยมมุมทั้ง 4 (12 มม. จากขอบ) */}
                        {(found || done) && (
                            <div
                                className={cn(
                                    "absolute rounded-[3px] border-[3px] transition-colors duration-200",
                                    steady ? "border-green-500 bg-green-500/15" : "border-yellow-400 bg-yellow-400/10"
                                )}
                                style={{ left: `${(12 / 210) * 100}%`, right: `${(12 / 210) * 100}%`, top: `${(12 / 297) * 100}%`, bottom: `${(12 / 297) * 100}%` }}
                            />
                        )}
                    </div>
                </div>
                <div className={cn("pointer-events-none absolute inset-0 bg-white transition-opacity duration-300", t >= S3.done && t < S3.done + 180 ? "opacity-70" : "opacity-0")} />
                <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                        <X size={20} />
                    </span>
                    <p className="flex-1 text-sm font-medium">สแกนอัตโนมัติ</p>
                    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs", done ? "bg-green-500 text-white" : "bg-white/10 text-white/70")}>
                        {done && <Check size={11} />}
                        หน้า 1
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-center gap-3 bg-black px-4 pb-4 pt-3">
                <p className={cn("flex min-h-10 items-center gap-2 text-center text-sm", hint.tone === "ok" ? "text-green-400" : "text-white/90")}>
                    {reading ? <Loader2 size={16} className="animate-spin" /> : done ? <Check size={16} /> : null}
                    {hint.text}
                </p>
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80">
                    <span className="h-12 w-12 rounded-full bg-white" />
                </span>
                <p className="text-xs text-white/50">ระบบถ่ายให้เองเมื่อเจอกระดาษและถือนิ่ง · กดปุ่มเพื่อถ่ายทันที</p>
            </div>
        </div>
    );
}

// ── ฉาก 4: ยืนยันข้อที่อ่านไม่ชัด แล้วส่งตรวจ (ตาม ScanClient) ─────────────────────────────────────────
const S4 = { scroll: 300, tapPick: 1500, tapSubmit: 3300, end: 5000 };
const CHOICE_TH = ["ก", "ข", "ค", "ง"];
// แถวของข้อ 5 บนกระดาษ (มม.) — เลขข้อ + วงทั้ง 4 ตาม layout.ts (คอลัมน์แรก แถวที่ 5)
const ROW_VIEWBOX = "19 96 38.5 8";

function ConfirmScreen({ t, demo }: { t: number; demo: PaperDemoData }) {
    const picked = t >= S4.tapPick + 50;
    const submitting = t >= S4.tapSubmit;
    const answered = picked ? 98 : 97;
    const cells = Array.from({ length: 20 }, (_, i) => i + 1);
    return (
        <Page
            pageKey="confirm"
            nav={<DemoNavbar />}
            scrollTo={t >= S4.scroll ? "pages" : undefined}
            overlay={
                <div className="absolute inset-x-4 bottom-3 z-10">
                    <Card className="p-4 shadow-lg">
                        <p className="text-sm text-slate-600">
                            ตอบ {answered} · ไม่ได้ตอบ 2
                            {!picked && <span className="font-medium text-amber-700"> · ต้องยืนยันอีก 1 ข้อ</span>}
                        </p>
                        <Button type="button" size="lg" className="mt-3 w-full" data-demo="paper-submit" disabled={!picked || submitting}>
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {submitting ? "กำลังตรวจ..." : "ส่งตรวจ"}
                        </Button>
                    </Card>
                </div>
            }
        >
            <div className="px-4 py-10 pb-44">
                <div className="text-center mb-8">
                    <p className="text-sm font-medium text-brand-600 mb-1.5">{demo.productName}</p>
                    <h1 className="text-2xl font-semibold text-slate-900">ตรวจกระดาษคำตอบ</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        ใบสอบ <span className="font-semibold tracking-wide text-slate-700">{DEMO_CODE}</span> · {demo.questionCount} ข้อ · กระดาษคำตอบ 1 หน้า
                    </p>
                </div>
                <Card className="p-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <ScanLine size={19} />
                        </span>
                        <div className="min-w-0">
                            <p className="font-medium text-slate-800">ถ่ายรูปกระดาษคำตอบ</p>
                            <p className="text-sm text-slate-500">ระบบอ่านรูปในเครื่องของคุณ แล้วส่งแค่คำตอบกับภาพกระดาษไปตรวจ</p>
                        </div>
                    </div>
                </Card>

                <section className="mt-6" data-demo-anchor="pages">
                    <Card className="flex items-center gap-3 p-3">
                        <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-slate-200">
                            <SheetReplica code={DEMO_CODE} productName={demo.productName} marks={FULL_MARKS} className="block h-full w-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">
                                หน้า 1 <span className="font-normal text-slate-400">· ข้อ 1–100</span>
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                ตอบ {answered} · ไม่ได้ตอบ 2
                                {!picked && <span className="whitespace-nowrap font-medium text-amber-700"> · ต้องยืนยัน 1</span>}
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600">
                            <RotateCcw size={14} />
                            ถ่ายใหม่
                        </span>
                    </Card>
                </section>

                <section className="mt-8">
                    <h2 className="text-sm font-medium text-slate-700">
                        ข้อที่ระบบอ่านไม่ชัด — เลือกให้ตรงกับที่ตั้งใจตอบ
                        {!picked && <span className="text-amber-700"> (เหลือ 1 ข้อ)</span>}
                    </h2>
                    <p className="mb-3 mt-0.5 text-xs text-slate-500">ระบบไม่เดาแทนคุณ ข้อพวกนี้ต้องยืนยันก่อนส่งตรวจ</p>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">ข้อ {DOUBLE_MARK_QUESTION}</span>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">ฝนมากกว่า 1 วง</span>
                        </div>
                        {/* ภาพแถวนั้นจากกระดาษจริง — ของจริงตัดจากภาพที่ถ่าย ที่นี่ตัดจากกระดาษจำลองแผ่นเดียวกัน */}
                        <SheetReplica
                            code={DEMO_CODE}
                            productName={demo.productName}
                            marks={FULL_MARKS}
                            viewBox={ROW_VIEWBOX}
                            className="block h-auto w-full max-w-72 rounded-lg border border-slate-200 bg-white"
                        />
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {CHOICE_TH.map((label, c) => {
                                const selected = picked && c === 1;
                                const candidate = FULL_MARKS[DOUBLE_MARK_QUESTION].includes(c);
                                return (
                                    <span
                                        key={label}
                                        data-demo={c === 1 ? "paper-pick" : undefined}
                                        className={cn(
                                            "flex h-10 min-w-10 items-center justify-center rounded-lg border-2 px-3 text-sm font-semibold transition-colors",
                                            selected
                                                ? "border-brand-600 bg-brand-600 text-white"
                                                : candidate
                                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                                  : "border-slate-200 text-slate-700"
                                        )}
                                    >
                                        {label}
                                    </span>
                                );
                            })}
                            <span className="flex h-10 items-center rounded-lg border-2 border-slate-200 px-3 text-sm text-slate-500">ไม่ได้ตอบ</span>
                        </div>
                    </div>
                </section>

                <section className="mt-8">
                    <h2 className="text-sm font-medium text-slate-700">คำตอบที่อ่านได้</h2>
                    <p className="mb-3 mt-0.5 text-xs text-slate-500">แตะข้อที่อยากแก้ เช่น ข้อที่ระบบอ่านไม่ตรงกับที่ฝนไว้</p>
                    <div className="grid grid-cols-5 gap-1.5">
                        {cells.map((n) => {
                            const unresolved = n === DOUBLE_MARK_QUESTION && !picked;
                            const marks = FULL_MARKS[n];
                            const label = n === DOUBLE_MARK_QUESTION ? (picked ? "ข" : "?") : marks.length ? CHOICE_TH[marks[0]] : "–";
                            return (
                                <span
                                    key={n}
                                    className={cn(
                                        "flex flex-col items-center rounded-lg border py-1 text-xs",
                                        unresolved
                                            ? "border-amber-300 bg-amber-50"
                                            : n === DOUBLE_MARK_QUESTION
                                              ? "border-brand-200 bg-brand-50/60"
                                              : "border-slate-100 bg-white"
                                    )}
                                >
                                    <span className="text-[10px] text-slate-400 tabular-nums">{n}</span>
                                    <span className={cn("font-semibold", unresolved ? "text-amber-700" : "text-slate-800")}>{label}</span>
                                </span>
                            );
                        })}
                    </div>
                </section>
            </div>
        </Page>
    );
}

// ── ฉาก 5: ผลสอบ + เฉลย (ตามหน้าเฉลยจริง — ผลจากกระดาษใช้หน้าเดียวกับทำบนเว็บ) ──────────────────────────
const S5 = { countFrom: 400, countTo: 1600, toastUntil: 1900, scrollStats: 3000, scrollTopics: 4600, scrollReview: 6600, end: 9400 };
const RESULT = { total: 100, correct: 81, wrong: 17, skipped: 2 };

function ResultScreen({ t, demo }: { t: number; demo: PaperDemoData }) {
    const percent = Math.round((RESULT.correct / RESULT.total) * 100);
    const progress = Math.min(1, Math.max(0, (t - S5.countFrom) / (S5.countTo - S5.countFrom)));
    const shown = Math.round(percent * (1 - Math.pow(1 - progress, 3)));
    const shownCorrect = Math.round((shown / 100) * RESULT.total);
    const required = Math.ceil((RESULT.total * PASS_PERCENT) / 100);
    const shownPassed = shownCorrect >= required;
    const scrollTo = t >= S5.scrollReview ? "review" : t >= S5.scrollTopics ? "topics" : t >= S5.scrollStats ? "stats" : undefined;
    const barsIn = t >= S5.scrollTopics - 200;
    const q = REVIEW_QUESTION;
    return (
        <Page
            pageKey="result"
            nav={<DemoNavbar />}
            scrollTo={scrollTo}
            overlay={<DemoToast show={t < S5.toastUntil}>ตรวจเรียบร้อย</DemoToast>}
        >
            <main className="px-4 py-10">
                <div className="text-center mb-10">
                    <p className="text-sm text-slate-400 mb-1">{demo.productName}</p>
                    <h3 className="text-2xl font-semibold text-slate-900 mb-3">เฉลยข้อสอบ</h3>
                    <p className="text-4xl font-semibold text-brand-600 tabular-nums">{shown}%</p>
                </div>
                <ReadinessCard
                    readiness={{
                        passed: shownPassed,
                        overall: {
                            mode: "percent",
                            pass_percent: PASS_PERCENT,
                            passed: shownPassed,
                            unit: "questions",
                            required,
                            have: shownCorrect,
                            out_of: RESULT.total,
                            gap: Math.max(0, required - shownCorrect),
                        },
                        subjects: [],
                    }}
                    pace={null}
                    scorePercent={shown}
                    skippedCount={RESULT.skipped}
                />
                <div data-demo-anchor="stats">
                    <Card className="mb-4 grid grid-cols-3 divide-x divide-slate-100 p-5">
                        {[
                            { n: RESULT.correct, label: "ตอบถูก", c: "text-green-600" },
                            { n: RESULT.wrong, label: "ตอบผิด", c: "text-red-500" },
                            { n: RESULT.skipped, label: "ไม่ได้ตอบ", c: "text-slate-400" },
                        ].map((x) => (
                            <div key={x.label} className="text-center">
                                <p className={cn("text-xl font-semibold", x.c)}>{x.n}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{x.label}</p>
                            </div>
                        ))}
                    </Card>
                    <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                            ตอบถูก {RESULT.correct} จาก {RESULT.total} ข้อ
                        </span>
                        <span>
                            สอบแบบกระดาษ · ใบสอบ <span className="font-medium text-brand-600">{DEMO_CODE}</span>
                        </span>
                    </div>
                </div>
                <div data-demo-anchor="topics">
                    <Card className="mb-4 p-5">
                        <p className="mb-3 text-sm font-medium text-slate-600">ผลรายหมวดของครั้งนี้</p>
                        <div className="flex flex-col gap-2.5">
                            {TOPICS.map((tp) => (
                                <div key={tp.name}>
                                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                                        <span className="min-w-0 text-slate-600">{tp.name}</span>
                                        <span className={cn("shrink-0 font-medium", tp.accuracy < 50 ? "text-red-500" : "text-slate-600")}>{tp.accuracy}%</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tp.accuracy < 50 ? "bg-red-400" : "bg-brand-500")}
                                            style={{ width: barsIn ? `${tp.accuracy}%` : "0%" }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                {/* ตัวอย่างเฉลยรายข้อ — จุดขายหลัก: เห็นว่าเลือกอะไร ข้อไหนถูก ทำไมข้อที่เลือกผิด และวิธีคิดทีละขั้น */}
                <div data-demo-anchor="review">
                    <Card className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <p className="font-medium text-slate-900 leading-relaxed">
                                <span className="text-slate-400 mr-1.5">ข้อ {q.number}.</span>
                                {q.text}
                            </p>
                            <span className="shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">
                                <X size={13} />
                                ผิด
                            </span>
                        </div>
                        <div className="flex flex-col gap-2 mb-4">
                            {q.choices.map((c) => (
                                <div key={c.text}>
                                    <div
                                        className={cn(
                                            "px-3.5 py-2.5 rounded-lg border text-sm flex items-start justify-between gap-2",
                                            c.correct ? "border-green-300 bg-green-50" : c.picked ? "border-red-200 bg-red-50" : "border-slate-100 text-slate-500"
                                        )}
                                    >
                                        <span className="flex-1">{c.text}</span>
                                        {c.correct && <Check size={15} className="text-green-600 shrink-0" />}
                                        {c.picked && <X size={15} className="text-red-500 shrink-0" />}
                                    </div>
                                    {c.reason && <p className={cn("text-xs mt-1 px-1", c.picked ? "text-red-500" : "text-slate-400")}>{c.reason}</p>}
                                </div>
                            ))}
                        </div>
                        <div className="p-3.5 rounded-lg bg-brand-50/60 border border-brand-100">
                            <p className="text-xs font-medium text-brand-700 mb-1">วิธีคิด</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{q.explanation}</p>
                        </div>
                    </Card>
                </div>
            </main>
        </Page>
    );
}

// ── รายการฉาก ─────────────────────────────────────────────────────────────────────────────────────
export const PAPER_SCENES: PaperScene[] = [
    {
        key: "print",
        title: "สร้างชุดสอบ แล้วพิมพ์กระดาษคำตอบ",
        caption: "เลือกชุดที่ซื้อไว้ กดสร้างชุดสอบ ได้ชุดข้อสอบกับกระดาษคำตอบรหัสเดียวกัน พิมพ์ด้วยกระดาษ A4 ธรรมดา",
        duration: S1.end,
        waypoints: [
            { at: S1.tapCreate, target: "paper-create" },
            { at: S1.tapSheet, target: "paper-sheet" },
        ],
        stage: (t) => ({ paper: t >= S1.printed ? PAPER_PEEK : PAPER_HIDDEN, phone: PHONE_FRONT, paperOnTop: false, marks: {} }),
        screen: (p) => <SetupScreen {...p} />,
    },
    {
        key: "fill",
        title: "ทำข้อสอบบนกระดาษเหมือนสนามจริง",
        caption: "ฝนด้วยดินสอ 2B จับเวลาเอง ฝึกมือให้ชินกับกระดาษคำตอบแบบที่เจอในห้องสอบ",
        duration: S2.end,
        waypoints: [],
        stage: (t) => ({
            paper: PAPER_FRONT,
            phone: PHONE_AWAY,
            paperOnTop: true,
            zoom: t >= S2.zoomIn && t < S2.zoomOut ? { scale: 2.4, origin: "14% 27%" } : undefined,
            marks: marksAt(t),
            pencil: pencilAt(t),
        }),
        screen: (p) => <SetupScreen t={S1.end} demo={p.demo} />,
    },
    {
        key: "scan",
        title: "ยกมือถือส่องกระดาษ ระบบถ่ายให้เอง",
        caption: "เจอกระดาษแล้วถือนิ่งแค่ 1 วินาที ระบบถ่ายและอ่านคำตอบทั้งแผ่นให้ทันที ไม่ต้องกดอะไร",
        duration: S3.end,
        dark: true,
        waypoints: [],
        stage: () => ({ paper: PAPER_PEEK, phone: PHONE_FRONT, paperOnTop: false, marks: FULL_MARKS }),
        screen: (p) => <CameraScreen {...p} />,
    },
    {
        key: "confirm",
        title: "ยืนยันข้อที่อ่านไม่ชัด แล้วส่งตรวจ",
        caption: "ข้อที่ฝนสองวงหรือจางเกินไป ระบบไม่เดาแทน แต่โชว์ภาพจากกระดาษจริงให้คุณเลือกเอง แก้ข้อไหนก็ได้ก่อนส่ง",
        duration: S4.end,
        waypoints: [
            { at: S4.tapPick, target: "paper-pick" },
            { at: S4.tapSubmit, target: "paper-submit" },
        ],
        stage: () => ({ paper: PAPER_PEEK, phone: PHONE_FRONT, paperOnTop: false, marks: FULL_MARKS }),
        screen: (p) => <ConfirmScreen {...p} />,
    },
    {
        key: "result",
        title: "ได้คะแนน + เฉลยละเอียดทุกข้อ",
        caption: "ผลเหมือนทำบนเว็บทุกอย่าง — ผ่านเกณฑ์ไหม จุดอ่อนรายหมวด วิธีคิดทีละขั้น และเหตุผลว่าทำไมข้อที่เลือกผิด",
        duration: S5.end,
        waypoints: [],
        stage: () => ({ paper: PAPER_HIDDEN, phone: PHONE_FRONT, paperOnTop: false, marks: FULL_MARKS }),
        screen: (p) => <ResultScreen {...p} />,
    },
];

