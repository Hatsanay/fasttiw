"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, ChevronRight, Loader2, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";

export type PracticeQuestion = {
    ques_id: string;
    ques_text: string;
    ques_image_url: string | null;
    choices: { cho_id: string; cho_text: string; cho_image_url: string | null }[];
    prod_name: string | null;
    tpc_name: string | null;
};
type Reveal = {
    correct_choice_id: string | null;
    explanation: string | null;
    choice_reasons: { cho_id: string; is_correct: boolean; wrong_reason: string | null }[];
};
type Result = { choId: string; isCorrect: boolean; reveal: Reveal };

// ตอบทีละข้อ → เห็นเฉลยทันที (เหมือนโหมดฝึก) · ตอบถูก = ข้อนั้นหลุดจากรายการ "ยังตอบผิดอยู่" (backend บันทึกให้)
export default function MistakePractice({
    questions,
    remaining,
    backHref,
}: {
    questions: PracticeQuestion[];
    remaining: number;
    backHref: string;
}) {
    const router = useRouter();
    const [index, setIndex] = useState(0);
    const [results, setResults] = useState<Record<string, Result>>({});
    const [pending, setPending] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [finished, setFinished] = useState(false);

    const question = questions[index];
    const result = question ? results[question.ques_id] : undefined;
    const fixed = Object.values(results).filter((r) => r.isCorrect).length;
    const answered = Object.keys(results).length;

    async function answer(choId: string) {
        if (result || pending) return;
        setPending(choId);
        setError(null);
        try {
            const res = await fetch(`/api/me/mistakes/${question.ques_id}/retry`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cho_id: choId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.message ?? "บันทึกคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง");
                return;
            }
            setResults((prev) => ({ ...prev, [question.ques_id]: { choId, isCorrect: data.is_correct, reveal: data.reveal } }));
        } catch {
            setError("เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
        } finally {
            setPending(null);
        }
    }

    function next() {
        if (index === questions.length - 1) setFinished(true);
        else setIndex((i) => i + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // อีกชุด = ดึงข้อที่ยังผิดชุดใหม่จาก server (ข้อที่เพิ่งแก้ได้จะไม่ขึ้นแล้ว)
    function another() {
        setIndex(0);
        setResults({});
        setFinished(false);
        router.refresh();
        window.scrollTo({ top: 0 });
    }

    if (finished) {
        const left = Math.max(0, remaining - fixed);
        return (
            <Card className="p-8 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Trophy size={26} />
                </span>
                <p className="text-sm text-slate-500">ทำใหม่ครบ {answered} ข้อ</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">แก้ได้ {fixed} ข้อ</p>
                <p className="mt-2 text-sm text-slate-500">
                    {fixed > 0 && "ข้อที่ตอบถูกหลุดออกจากรายการที่ต้องทบทวนแล้ว · "}
                    {left > 0 ? `ยังเหลืออีก ${left} ข้อ` : "ไม่เหลือข้อที่ต้องทบทวนแล้ว"}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    {left > 0 && (
                        <Button onClick={another}>
                            <RotateCcw size={16} />
                            ทำอีกชุด
                        </Button>
                    )}
                    <Link href={backHref}>
                        <Button variant="secondary">กลับไปหน้าข้อที่ต้องทบทวน</Button>
                    </Link>
                </div>
            </Card>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                <span>ข้อ {index + 1} จาก {questions.length}</span>
                <span className="tabular-nums">แก้ได้ {fixed} ข้อ</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${((index + (result ? 1 : 0)) / questions.length) * 100}%` }} />
            </div>

            <Card className="p-6">
                <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    {question.prod_name && <span className="truncate">{question.prod_name}</span>}
                    {question.tpc_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{question.tpc_name}</span>}
                </div>
                <QuestionImage src={question.ques_image_url} />
                <h1 className="text-lg font-medium text-slate-900 mb-6 leading-relaxed whitespace-pre-line">{question.ques_text}</h1>

                <div className="flex flex-col gap-3">
                    {question.choices.map((choice) => {
                        const reason = result?.reveal.choice_reasons.find((r) => r.cho_id === choice.cho_id);
                        const isCorrect = !!reason?.is_correct;
                        const isPicked = result?.choId === choice.cho_id;
                        return (
                            <div key={choice.cho_id}>
                                <button
                                    type="button"
                                    onClick={() => answer(choice.cho_id)}
                                    disabled={!!result || !!pending}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-start justify-between gap-3 disabled:cursor-default",
                                        !result && "border-slate-200 hover:border-slate-300 active:scale-[0.98]",
                                        result && isCorrect && "border-green-400 bg-green-50",
                                        result && isPicked && !isCorrect && "border-red-300 bg-red-50",
                                        result && !isCorrect && !isPicked && "border-slate-100 text-slate-400",
                                        pending === choice.cho_id && "border-brand-300"
                                    )}
                                >
                                    <span className="flex-1">
                                        <ChoiceImage src={choice.cho_image_url} />
                                        {choice.cho_text}
                                    </span>
                                    {pending === choice.cho_id && <Loader2 size={18} className="shrink-0 animate-spin text-brand-500" />}
                                    {result && isCorrect && <Check size={18} className="shrink-0 text-green-600" />}
                                    {result && isPicked && !isCorrect && <X size={18} className="shrink-0 text-red-500" />}
                                </button>
                                {result && !isCorrect && reason?.wrong_reason && (
                                    <p className={cn("text-xs mt-1.5 px-1", isPicked ? "text-red-500" : "text-slate-400")}>{reason.wrong_reason}</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {result && (
                    <>
                        <p className={cn("mt-6 text-sm font-medium", result.isCorrect ? "text-green-700" : "text-red-600")}>
                            {result.isCorrect ? "ถูกแล้ว — ข้อนี้หลุดจากรายการที่ต้องทบทวน" : "ยังผิดอยู่ — อ่านวิธีคิดแล้วค่อยลองใหม่รอบหน้า"}
                        </p>
                        <div className="mt-3 p-4 rounded-xl bg-brand-50/60 border border-brand-100">
                            <p className="text-sm font-medium text-brand-700 mb-1.5">วิธีคิด</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{result.reveal.explanation ?? "ไม่มีคำอธิบายเพิ่มเติม"}</p>
                        </div>
                    </>
                )}
            </Card>

            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</p>}

            <div className="flex justify-end mt-6">
                <Button onClick={next} disabled={!result}>
                    {index === questions.length - 1 ? "ดูสรุป" : "ข้อถัดไป"}
                    <ChevronRight size={18} />
                </Button>
            </div>
        </div>
    );
}
