"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, X, Minus, RotateCcw, Clock, FileQuestion, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";
import { productCoverUrl, formatBaht, compareAtPrice, effectivePrice } from "@/lib/api";
import type { DiagnosticResult, GradedQuestion } from "@/lib/diagnosticTypes";

// ระดับของคะแนน — เส้น 60% เป็นเกณฑ์ "ควรเร่ง" ของเราเอง (backend ส่งมาใน summary.weak_below_pct)
// ไม่อ้างว่าเป็นเกณฑ์ทางการของสนามสอบใด · สีเป็นสัญญาณสถานะ มีคำกำกับเสมอ ไม่ให้ต้องเดาจากสีอย่างเดียว
function band(pct: number, weakBelow: number) {
    if (pct >= 80) return { label: "แน่น", bar: "bg-green-500", text: "text-green-700", chip: "bg-green-50 text-green-700" };
    if (pct >= weakBelow) return { label: "พอใช้", bar: "bg-amber-400", text: "text-amber-700", chip: "bg-amber-50 text-amber-700" };
    return { label: "ควรเร่ง", bar: "bg-red-500", text: "text-red-600", chip: "bg-red-50 text-red-600" };
}

function verdict(pct: number, weakBelow: number) {
    if (pct >= 80) return { title: "พื้นฐานแน่นแล้ว", text: "เหลือเก็บรายละเอียดหัวข้อที่ยังพลาด แล้วฝึกทำแบบจับเวลาให้คุ้นมือ" };
    if (pct >= weakBelow) return { title: "ใกล้แล้ว", text: "เร่งหัวข้อที่ยังต่ำกว่าเกณฑ์ก่อน จะดันคะแนนรวมขึ้นได้เร็วที่สุด" };
    return { title: "ควรเร่งเตรียมตัว", text: "เริ่มจากหัวข้อที่อ่อนที่สุดด้านล่าง อ่านวิธีคิดจากเฉลยให้เข้าใจทีละข้อ" };
}

function formatDuration(ms: number) {
    const s = Math.max(1, Math.round(ms / 1000));
    return s < 60 ? `${s} วินาที` : `${Math.floor(s / 60)} นาที ${s % 60} วินาที`;
}

// วงแหวนคะแนน — วาดด้วย SVG เอง ขนาดคงที่ ตัวเลขอยู่กลางวง
function ScoreRing({ pct, colorClass }: { pct: number; colorClass: string }) {
    const r = 52;
    const c = 2 * Math.PI * r;
    return (
        <svg viewBox="0 0 128 128" className="h-32 w-32 shrink-0" role="img" aria-label={`คะแนน ${pct}%`}>
            <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-slate-100" />
            <circle
                cx="64" cy="64" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
                transform="rotate(-90 64 64)" className={cn("transition-[stroke-dashoffset] duration-700", colorClass)}
            />
            <text x="64" y="70" textAnchor="middle" className="fill-slate-900 text-[26px] font-semibold">{pct}%</text>
        </svg>
    );
}

const RING_STROKE: Record<string, string> = { "bg-green-500": "stroke-green-500", "bg-amber-400": "stroke-amber-400", "bg-red-500": "stroke-red-500" };

function AnswerReview({ question, number }: { question: GradedQuestion; number: number }) {
    const skipped = !question.selected_choice_id;
    return (
        <Card className="p-5">
            <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="font-medium text-slate-500">ข้อ {number}</span>
                {question.tpc_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{question.tpc_name}</span>}
                <span
                    className={cn(
                        "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                        question.is_correct ? "bg-green-50 text-green-700" : skipped ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-600"
                    )}
                >
                    {question.is_correct ? <Check size={12} /> : skipped ? <Minus size={12} /> : <X size={12} />}
                    {question.is_correct ? "ตอบถูก" : skipped ? "ไม่ได้ตอบ" : "ตอบผิด"}
                </span>
            </div>
            <QuestionImage src={question.ques_image_url} />
            <p className="text-slate-900 font-medium leading-relaxed whitespace-pre-line mb-4">{question.ques_text}</p>
            <div className="flex flex-col gap-2">
                {question.choices.map((choice) => {
                    const reason = question.reveal.choice_reasons.find((r) => r.cho_id === choice.cho_id);
                    const isCorrect = !!reason?.is_correct;
                    const isPicked = question.selected_choice_id === choice.cho_id;
                    return (
                        <div key={choice.cho_id}>
                            <div
                                className={cn(
                                    "flex items-start justify-between gap-3 rounded-xl border-2 px-4 py-2.5 text-sm",
                                    isCorrect ? "border-green-400 bg-green-50" : isPicked ? "border-red-300 bg-red-50" : "border-slate-100 text-slate-400"
                                )}
                            >
                                <span className="flex-1">
                                    <ChoiceImage src={choice.cho_image_url} />
                                    {choice.cho_text}
                                    {isPicked && <span className="ml-1.5 text-xs text-slate-500">(ที่คุณเลือก)</span>}
                                </span>
                                {isCorrect && <Check size={16} className="text-green-600 shrink-0 mt-0.5" />}
                                {isPicked && !isCorrect && <X size={16} className="text-red-500 shrink-0 mt-0.5" />}
                            </div>
                            {!isCorrect && reason?.wrong_reason && (isPicked || !question.is_correct) && (
                                <p className={cn("text-xs mt-1 px-1", isPicked ? "text-red-500" : "text-slate-400")}>{reason.wrong_reason}</p>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 rounded-xl bg-brand-50/60 border border-brand-100 p-4">
                <p className="text-sm font-medium text-brand-700 mb-1.5">วิธีคิด</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{question.reveal.explanation ?? "ไม่มีคำอธิบายเพิ่มเติม"}</p>
            </div>
        </Card>
    );
}

export default function DiagnosticResultView({
    result,
    elapsedMs,
    onRestart,
}: {
    result: DiagnosticResult;
    elapsedMs: number;
    onRestart: () => void;
}) {
    const { summary, topics, recommendations, questions, category } = result;
    const weakBelow = summary.weak_below_pct;
    const overall = band(summary.pct, weakBelow);
    const v = verdict(summary.pct, weakBelow);
    const missed = questions.filter((q) => !q.is_correct);
    const [showAll, setShowAll] = useState(missed.length === 0);
    const reviewList = showAll ? questions : missed;
    // บอกตรงๆ ว่าแต่ละหัวข้อวัดจากกี่ข้อ — ผลรายหัวข้อจากข้อเดียวคลาดได้มาก ลูกค้าควรรู้
    const topicSizes = topics.map((t) => t.total);
    const [minSize, maxSize] = [Math.min(...topicSizes), Math.max(...topicSizes)];
    const perTopicLabel = minSize === maxSize ? `หัวข้อละ ${minSize} ข้อ` : `หัวข้อละ ${minSize}–${maxSize} ข้อ`;

    return (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
            <p className="text-center text-sm font-medium text-brand-600">ผลแบบทดสอบวัดระดับ · {category.cat_name}</p>

            {/* สรุปคะแนน */}
            <Card className="p-6 flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing pct={summary.pct} colorClass={RING_STROKE[overall.bar]} />
                <div className="text-center sm:text-left">
                    <p className={cn("text-sm font-medium", overall.text)}>{v.title}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                        ตอบถูก {summary.correct} จาก {summary.total} ข้อ
                    </p>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{v.text}</p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock size={13} />
                        ใช้เวลา {formatDuration(elapsedMs)}
                        {summary.answered < summary.total && ` · ไม่ได้ตอบ ${summary.total - summary.answered} ข้อ`}
                    </p>
                </div>
            </Card>

            {/* ผลรายหัวข้อ — เรียงอ่อนสุดขึ้นก่อน (backend เรียงให้แล้ว) */}
            <Card className="p-6">
                <h2 className="font-semibold text-slate-900">ผลรายหัวข้อ</h2>
                <p className="mt-1 text-xs text-slate-400">
                    {perTopicLabel} ใช้ประเมินคร่าวๆ ว่าควรเริ่มตรงไหน · ต่ำกว่า {weakBelow}% = ควรเร่ง
                </p>
                <ul className="mt-5 flex flex-col gap-3.5">
                    {topics.map((t) => {
                        const b = band(t.pct, weakBelow);
                        return (
                            <li key={t.tpc_id ?? "none"} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-x-3 gap-y-1.5 text-sm">
                                <span className="truncate text-slate-700" title={t.tpc_name}>{t.tpc_name}</span>
                                <span className="order-3 col-span-2 sm:order-none sm:col-span-1 h-2 rounded-full bg-slate-100" aria-hidden>
                                    <span className={cn("block h-full rounded-full", b.bar)} style={{ width: `${Math.max(t.pct, 3)}%` }} />
                                </span>
                                <span className="flex items-center gap-2 justify-end whitespace-nowrap">
                                    <span className="tabular-nums text-slate-500">ถูก {t.correct}/{t.total}</span>
                                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", b.chip)}>{b.label}</span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Card>

            {/* ชุดที่แนะนำ */}
            {recommendations.length > 0 && (
                <section>
                    <h2 className="font-semibold text-slate-900">
                        {result.weak_topics.length > 0 ? "แนวข้อสอบที่ตรงจุดอ่อนของคุณ" : "ฝึกต่อด้วยแนวข้อสอบชุดเต็ม"}
                    </h2>
                    <p className="mt-1 mb-4 text-sm text-slate-500">
                        {result.weak_topics.length > 0
                            ? "เรียงตามจำนวนข้อของหัวข้อที่คุณควรเร่ง — ทุกข้อมีเฉลยละเอียดแบบที่เพิ่งเห็น"
                            : "ทุกข้อมีเฉลยละเอียดแบบที่เพิ่งเห็น ฝึกให้แม่นขึ้นอีกขั้น"}
                    </p>
                    <div className="flex flex-col gap-3">
                        {recommendations.map((p, i) => {
                            const cover = productCoverUrl(p.prod_cover_url);
                            const compare = compareAtPrice(p);
                            return (
                                <Card key={p.prod_id} className={cn("p-4 flex gap-4", i === 0 && "border-brand-200 shadow-md shadow-brand-100/60")}>
                                    <div className="relative w-20 sm:w-24 aspect-[210/297] shrink-0 overflow-hidden rounded-lg bg-slate-50">
                                        {cover ? (
                                            <Image src={cover} alt={p.prod_name} fill className="object-cover" sizes="96px" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-slate-300"><FileQuestion size={28} /></div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col">
                                        {i === 0 && result.weak_topics.length > 0 && (
                                            <span className="self-start rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white mb-1.5">ตรงที่สุด</span>
                                        )}
                                        <p className="font-medium text-slate-900 leading-snug line-clamp-2">{p.prod_name}</p>
                                        <p className="mt-1 text-xs text-slate-500">{p.question_count} ข้อ พร้อมเฉลยละเอียด</p>
                                        {p.weak_topic_counts.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {p.weak_topic_counts.slice(0, 3).map((w) => (
                                                    <span key={w.tpc_id} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-600">
                                                        {w.tpc_name} {w.count} ข้อ
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-sm">
                                                <span className="font-semibold text-slate-900">
                                                    {effectivePrice(p) === 0 ? "ฟรี" : formatBaht(effectivePrice(p))}
                                                </span>
                                                {compare && <span className="ml-1.5 text-xs text-slate-400 line-through">{formatBaht(compare)}</span>}
                                            </span>
                                            <Link href={`/products/${p.prod_id}`}>
                                                <Button size="sm" variant={i === 0 ? "primary" : "secondary"}>
                                                    ดูชุดนี้ <ArrowRight size={15} />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* เฉลยทุกข้อ — เริ่มที่ข้อที่พลาด (สิ่งที่ควรอ่านก่อน) สลับดูทั้งหมดได้ */}
            <section>
                <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <div>
                        <h2 className="font-semibold text-slate-900">เฉลยละเอียด</h2>
                        <p className="mt-1 text-sm text-slate-500">วิธีคิดทีละขั้น และเหตุผลว่าทำไมตัวเลือกอื่นผิด</p>
                    </div>
                    <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-sm" role="group" aria-label="เลือกข้อที่จะดู">
                        <button
                            type="button"
                            onClick={() => setShowAll(false)}
                            aria-pressed={!showAll}
                            className={cn("rounded-full px-3 py-1", !showAll ? "bg-brand-600 text-white" : "text-slate-600")}
                        >
                            ข้อที่พลาด ({missed.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAll(true)}
                            aria-pressed={showAll}
                            className={cn("rounded-full px-3 py-1", showAll ? "bg-brand-600 text-white" : "text-slate-600")}
                        >
                            ทั้งหมด ({questions.length})
                        </button>
                    </div>
                </div>
                {reviewList.length === 0 ? (
                    <Card className="p-6 text-center text-sm text-slate-500">ถูกทุกข้อ ยอดเยี่ยมมาก 🎉 กด &quot;ทั้งหมด&quot; เพื่อดูเฉลย</Card>
                ) : (
                    <div className="flex flex-col gap-3">
                        {reviewList.map((q) => (
                            <AnswerReview key={q.ques_id} question={q} number={questions.indexOf(q) + 1} />
                        ))}
                    </div>
                )}
            </section>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button variant="secondary" onClick={onRestart}>
                    <RotateCcw size={16} />
                    ทำใหม่ (สุ่มข้อใหม่)
                </Button>
                <Link href="/products">
                    <Button variant="ghost">ดูแนวข้อสอบทั้งหมด</Button>
                </Link>
            </div>
        </div>
    );
}
