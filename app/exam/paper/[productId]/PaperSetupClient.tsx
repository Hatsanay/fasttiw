"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Camera, Check, ChevronRight, Download, FileText, Loader2, Printer, ScanLine, Shuffle, Sparkles, SquareCheckBig } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { QUESTIONS_PER_PAGE } from "@/lib/paper/layout";

export type PaperForm = {
    code: string;
    product_id: string;
    prod_name: string;
    pages: number;
    question_count: number;
    shuffled: boolean;
    status: "printed" | "graded" | "void";
    created_at: string;
    /** ผลตรวจล่าสุดของใบนี้ — null = ยังไม่ได้สแกนส่งตรวจ */
    att_id: string | null;
    att_score: number | null;
};

const STEPS = [
    { icon: Sparkles, title: "สร้างชุดสอบ", desc: "ระบบออกรหัสใบสอบให้ 1 ชุด" },
    { icon: Printer, title: "พิมพ์ 2 ไฟล์", desc: "ชุดข้อสอบ + กระดาษคำตอบ" },
    { icon: SquareCheckBig, title: "ทำข้อสอบ", desc: "ฝนคำตอบในกระดาษคำตอบ" },
    { icon: Camera, title: "ถ่ายรูปให้ระบบตรวจ", desc: "ได้คะแนน + เฉลยละเอียด" },
];

function formatDate(value: string) {
    return new Date(value).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
}

/** ปุ่มดาวน์โหลด PDF — สร้างไฟล์ใช้เวลาหลายวินาที (ชุดใหญ่มีรูป) จึงต้องบอกว่ากำลังสร้าง ไม่งั้นลูกค้ากดซ้ำ */
function DownloadButton({ href, fileName, label, primary }: { href: string; fileName: string; label: string; primary?: boolean }) {
    const [busy, setBusy] = useState(false);
    async function download() {
        setBusy(true);
        try {
            const res = await fetch(href);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? "สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่");
            }
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setBusy(false);
        }
    }
    return (
        <Button type="button" variant={primary ? "primary" : "secondary"} size="sm" onClick={download} disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {busy ? "กำลังสร้างไฟล์..." : label}
        </Button>
    );
}

function FormCard({ form, highlight }: { form: PaperForm; highlight?: boolean }) {
    return (
        <Card className={cn("p-4 sm:p-5", highlight && "border-brand-200 ring-2 ring-brand-100")}>
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold tracking-wide text-brand-700">{form.code}</span>
                {highlight && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Check size={12} />
                        สร้างแล้ว
                    </span>
                )}
                {form.att_id && form.att_score !== null && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">ตรวจแล้ว {form.att_score.toFixed(0)}%</span>
                )}
                <span className="ml-auto text-xs text-slate-400">{formatDate(form.created_at)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
                {form.question_count.toLocaleString("th-TH")} ข้อ · กระดาษคำตอบ {form.pages} หน้า · {form.shuffled ? "สลับลำดับข้อ" : "เรียงตามลำดับ"}
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <DownloadButton
                    href={`/api/paper-forms/${form.code}/booklet`}
                    fileName={`fasttiw-${form.code}-questions.pdf`}
                    label="ชุดข้อสอบ"
                    primary={highlight}
                />
                <DownloadButton href={`/api/paper-forms/${form.code}/answer-sheet`} fileName={`fasttiw-${form.code}-answer-sheet.pdf`} label="กระดาษคำตอบ" primary={highlight} />
            </div>
            {/* ทำเสร็จแล้ว → ถ่ายรูปให้ระบบตรวจ · ตรวจแล้ว → ดูผล (สแกนใหม่ได้ แทนผลเดิม) */}
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
                <Link
                    href={`/exam/paper/forms/${form.code}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <ScanLine size={15} />
                    {form.att_id ? "สแกนใหม่" : "ถ่ายรูปให้ระบบตรวจ"}
                </Link>
                {form.att_id && (
                    <Link
                        href={`/exam/attempts/${form.att_id}/review`}
                        className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                    >
                        ดูผลและเฉลย
                        <ChevronRight size={15} />
                    </Link>
                )}
            </div>
        </Card>
    );
}

export default function PaperSetupClient({
    productId,
    productName,
    questionCount,
    initialForms,
}: {
    productId: string;
    productName: string;
    questionCount: number;
    initialForms: PaperForm[];
}) {
    const [forms, setForms] = useState(initialForms);
    const [shuffle, setShuffle] = useState(false);
    const [creating, setCreating] = useState(false);
    const [justCreated, setJustCreated] = useState<string | null>(null);
    const sheetPages = Math.max(1, Math.ceil(questionCount / QUESTIONS_PER_PAGE));

    async function create() {
        setCreating(true);
        try {
            const res = await fetch("/api/paper-forms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: productId, shuffle }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message ?? "สร้างชุดสอบไม่สำเร็จ กรุณาลองใหม่");
            const form: PaperForm = { ...data, status: "printed", created_at: new Date().toISOString(), att_id: null, att_score: null };
            setForms((prev) => [form, ...prev]);
            setJustCreated(form.code);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "สร้างชุดสอบไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setCreating(false);
        }
    }

    return (
        <>
            <div className="text-center mb-8">
                <p className="text-sm font-medium text-brand-600 mb-1.5">{productName}</p>
                <h1 className="text-2xl font-semibold text-slate-900">สอบแบบกระดาษ</h1>
                <p className="mt-2 text-sm text-slate-500 text-balance">
                    พิมพ์ชุดข้อสอบกับกระดาษคำตอบไปทำเหมือนสนามจริง แล้วถ่ายรูปกระดาษคำตอบให้ระบบตรวจ ได้คะแนนและเฉลยละเอียดเหมือนทำบนเว็บ
                </p>
            </div>

            <ol className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            <Card className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <FileText size={19} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-medium text-slate-800">สร้างชุดสอบใหม่</p>
                        <p className="text-sm text-slate-500">
                            ข้อสอบ {questionCount.toLocaleString("th-TH")} ข้อ · กระดาษคำตอบ {sheetPages} หน้า (A4)
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    role="switch"
                    aria-checked={shuffle}
                    onClick={() => setShuffle((v) => !v)}
                    className={cn(
                        "mt-5 flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-colors",
                        shuffle ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:border-slate-300"
                    )}
                >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", shuffle ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
                        <Shuffle size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">สลับลำดับข้อและตัวเลือก</span>
                        <span className="block text-xs text-slate-500">แต่ละชุดที่พิมพ์ลำดับไม่ซ้ำกัน เหมาะกับการทำซ้ำหลายรอบโดยไม่จำตำแหน่งคำตอบ</span>
                    </span>
                    <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", shuffle ? "bg-brand-600" : "bg-slate-300")}>
                        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", shuffle ? "translate-x-5.5" : "translate-x-0.5")} />
                    </span>
                </button>

                <Button type="button" size="lg" onClick={create} disabled={creating} className="mt-5 w-full">
                    {creating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {creating ? "กำลังสร้าง..." : "สร้างชุดสอบ"}
                </Button>

                <ul className="mt-5 space-y-1.5 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                    <li>• พิมพ์กระดาษ A4 <b>ขนาดจริง 100%</b> (ห้ามเลือก &ldquo;ย่อให้พอดีหน้า&rdquo;) · กระดาษคำตอบพิมพ์ขาวดำได้</li>
                    <li>• ใช้ชุดข้อสอบกับกระดาษคำตอบ<b>รหัสเดียวกัน</b>เสมอ — ลำดับข้อของแต่ละชุดไม่เหมือนกัน</li>
                    <li>• ฝนด้วยดินสอ 2B หรือปากกาดำให้เต็มวง ข้อละ 1 วง · ห้ามพับหรือเขียนทับสี่เหลี่ยมดำที่มุม</li>
                </ul>
            </Card>

            {forms.length > 0 && (
                <section className="mt-8">
                    <h2 className="mb-3 text-sm font-medium text-slate-600">ชุดสอบที่สร้างไว้</h2>
                    <div className="flex flex-col gap-3">
                        {forms.map((f) => (
                            <FormCard key={f.code} form={f} highlight={f.code === justCreated} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
