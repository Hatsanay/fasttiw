"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";
import type { DiagnosticQuestion, DiagnosticResult } from "@/lib/diagnosticTypes";
import DiagnosticResultView from "./DiagnosticResultView";
import { MathText } from "@/lib/mathClient";

// เก็บผลไว้ในแท็บนี้ — ลูกค้ากดดูชุดที่แนะนำแล้วกดย้อนกลับ ต้องเห็นผลเดิม ไม่ใช่แบบทดสอบชุดใหม่
// (sessionStorage หายเองเมื่อปิดแท็บ ไม่เก็บอะไรข้ามวัน และไม่ส่งไปที่ไหน)
const storageKey = (categoryId: string) => `fasttiw_diagnostic_${categoryId}`;
type Saved = { result: DiagnosticResult; elapsedMs: number };

function formatClock(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function DiagnosticRunner({
    category,
    questions,
}: {
    category: { cat_id: string; cat_name: string };
    questions: DiagnosticQuestion[];
}) {
    const router = useRouter();
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState<Saved | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmSkip, setConfirmSkip] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const startedAtRef = useRef<number>(0);

    // อ่านผลเดิมหลัง mount (sessionStorage ไม่มีตอน SSR) + เริ่มนับเวลา
    useEffect(() => {
        startedAtRef.current = Date.now();
        const kickoff = setTimeout(() => {
            try {
                const raw = sessionStorage.getItem(storageKey(category.cat_id));
                if (raw) setSaved(JSON.parse(raw));
            } catch {
                // ข้อมูลเสีย/เบราว์เซอร์ปิด storage — เริ่มทำใหม่ตามปกติ
            }
        }, 0);
        return () => clearTimeout(kickoff);
    }, [category.cat_id]);

    useEffect(() => {
        if (saved) return;
        const timer = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000);
        return () => clearInterval(timer);
    }, [saved]);

    const question = questions[index];
    const isLast = index === questions.length - 1;
    const answeredCount = Object.keys(answers).length;
    const unanswered = questions.length - answeredCount;

    function select(choId: string) {
        setAnswers((prev) => ({ ...prev, [question.ques_id]: choId }));
        setConfirmSkip(false);
    }

    function goTo(next: number) {
        setIndex(next);
        setConfirmSkip(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function submit() {
        if (unanswered > 0 && !confirmSkip) {
            setConfirmSkip(true);
            return;
        }
        setSubmitting(true);
        setError(null);
        const elapsedMs = Date.now() - startedAtRef.current;
        try {
            const res = await fetch(`/api/diagnostic/${category.cat_id}/grade`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: questions.map((q) => ({ ques_id: q.ques_id, cho_id: answers[q.ques_id] ?? null })) }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.message ?? "ตรวจคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง");
                return;
            }
            const next = { result: data as DiagnosticResult, elapsedMs };
            setSaved(next);
            try { sessionStorage.setItem(storageKey(category.cat_id), JSON.stringify(next)); } catch { /* storage เต็ม/ถูกปิด — แค่ย้อนกลับมาแล้วไม่เห็นผลเดิม */ }
            window.scrollTo({ top: 0 });
        } catch {
            setError("เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
        } finally {
            setSubmitting(false);
        }
    }

    // ทำใหม่ = สุ่มชุดข้อใหม่จาก server (router.refresh ดึง questions ชุดใหม่มาให้ component เดิม)
    function startOver() {
        try { sessionStorage.removeItem(storageKey(category.cat_id)); } catch { /* ไม่มีผล */ }
        setSaved(null);
        setAnswers({});
        setIndex(0);
        setElapsed(0);
        setConfirmSkip(false);
        startedAtRef.current = Date.now();
        router.refresh();
        window.scrollTo({ top: 0 });
    }

    if (saved) return <DiagnosticResultView result={saved.result} elapsedMs={saved.elapsedMs} onRestart={startOver} />;
    if (!question) return null;

    const selectedId = answers[question.ques_id];

    return (
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
            <p className="text-center text-sm font-medium text-brand-600 mb-5">แบบทดสอบวัดระดับ · {category.cat_name}</p>

            <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                <span>ข้อ {index + 1} จาก {questions.length}</span>
                <span className="inline-flex items-center gap-1 tabular-nums" aria-label="เวลาที่ใช้">
                    <Clock size={14} />
                    {formatClock(elapsed)}
                </span>
            </div>
            {/* แถบความคืบหน้าแบ่งช่องรายข้อ — ช่องที่ตอบแล้วทึบ เห็นทันทีว่าข้ามข้อไหนไป กดช่องเพื่อกระโดดไปข้อนั้นได้ */}
            <div className="flex gap-1 mb-6" aria-label="ความคืบหน้า">
                {questions.map((q, i) => (
                    // พื้นที่กดสูงกว่าแถบที่เห็น (py-2) — แถบ 6px กดบนมือถือไม่โดน
                    <button
                        key={q.ques_id}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={i === index ? "step" : undefined}
                        aria-label={`ไปข้อ ${i + 1}${answers[q.ques_id] ? " (ตอบแล้ว)" : ""}`}
                        className="flex-1 py-2"
                    >
                        <span
                            className={cn(
                                "block h-1.5 rounded-full transition-colors",
                                answers[q.ques_id] ? "bg-brand-500" : "bg-slate-200",
                                i === index && "ring-2 ring-brand-300 ring-offset-1"
                            )}
                        />
                    </button>
                ))}
            </div>

            <Card className="p-6">
                <QuestionImage src={question.ques_image_url} />
                <h1 className="text-lg font-medium text-slate-900 mb-6 leading-relaxed whitespace-pre-line"><MathText text={question.ques_text} /></h1>
                <div className="flex flex-col gap-3">
                    {question.choices.map((choice) => {
                        const isSelected = selectedId === choice.cho_id;
                        return (
                            <button
                                key={choice.cho_id}
                                type="button"
                                onClick={() => select(choice.cho_id)}
                                aria-pressed={isSelected}
                                className={cn(
                                    "w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98]",
                                    isSelected ? "border-brand-500 bg-brand-50 text-slate-900" : "border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <ChoiceImage src={choice.cho_image_url} />
                                <MathText text={choice.cho_text} />
                            </button>
                        );
                    })}
                </div>
            </Card>

            {confirmSkip && (
                <p className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
                    ยังไม่ได้ตอบ {unanswered} ข้อ — ข้อที่ไม่ได้ตอบจะนับว่าผิด กด &quot;ส่งคำตอบ&quot; อีกครั้งเพื่อดูผลเลย หรือกดแถบด้านบนเพื่อกลับไปทำ
                </p>
            )}
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-3 mt-6">
                <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0 || submitting}>
                    <ChevronLeft size={18} />
                    ข้อก่อนหน้า
                </Button>
                {isLast ? (
                    <Button onClick={submit} disabled={submitting}>
                        {submitting && <Loader2 size={18} className="animate-spin" />}
                        {submitting ? "กำลังตรวจ..." : "ส่งคำตอบ ดูผล"}
                    </Button>
                ) : (
                    <Button onClick={() => goTo(index + 1)} variant={selectedId ? "primary" : "secondary"}>
                        {selectedId ? "ข้อถัดไป" : "ข้ามข้อนี้"}
                        <ChevronRight size={18} />
                    </Button>
                )}
            </div>
            {!isLast && answeredCount > 0 && (
                <div className="mt-4 text-center">
                    <button type="button" onClick={submit} disabled={submitting} className="text-sm text-slate-500 hover:text-brand-600 underline-offset-2 hover:underline">
                        ส่งคำตอบตอนนี้เลย (ตอบแล้ว {answeredCount} ข้อ)
                    </button>
                </div>
            )}
        </div>
    );
}
