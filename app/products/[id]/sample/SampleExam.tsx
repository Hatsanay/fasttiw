"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";
import type { SampleQuestion } from "@/lib/api";
import { hasScoring, formatScore } from "@/lib/scoring";

// ตัวอย่างฟรีมีเฉลยเต็มมาจาก backend อยู่แล้ว (reveal=true) ไม่ต้องยิง API ต่อคำตอบเหมือนตอนทำข้อสอบจริง
// ตั้งใจโชว์เฉลยแค่หลังตอบข้อนั้นแล้ว (ไม่ใช่โชว์ทั้งหมดตั้งแต่แรก) ให้ความรู้สึกเหมือนกำลัง "ลองทำ" จริงๆ
export default function SampleExam({
    productId,
    questions,
    totalScore,
}: {
    productId: string;
    questions: SampleQuestion[];
    totalScore: string | number | null;
}) {
    // หน้าตัวอย่างไม่มี attempt จึงไม่มี snapshot — ใช้คะแนนเต็มปัจจุบันของชุดข้อสอบตรงๆ
    const scored = hasScoring(totalScore);
    const [index, setIndex] = useState(0);
    const [answered, setAnswered] = useState<Record<string, string>>({});

    const question = questions[index];
    const isLast = index === questions.length - 1;
    const selectedId = answered[question.ques_id];
    const hasAnswered = question.ques_id in answered;

    function handleSelect(choiceId: string) {
        if (hasAnswered) return;
        setAnswered((prev) => ({ ...prev, [question.ques_id]: choiceId }));
    }

    return (
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
            <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                <span>
                    ตัวอย่างข้อ {index + 1} จาก {questions.length}
                    {scored && <span className="text-slate-400"> · ข้อนี้ {formatScore(question.ques_score)} คะแนน (ชุดเต็ม {formatScore(totalScore)})</span>}
                </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-8">
                <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                />
            </div>

            <Card className="p-6">
                <QuestionImage src={question.ques_image_url} />
                <h1 className="text-lg font-medium text-slate-900 mb-6 leading-relaxed whitespace-pre-line">{question.ques_text}</h1>

                <div className="flex flex-col gap-3">
                    {question.choices.map((choice) => {
                        const isSelected = selectedId === choice.cho_id;
                        const reason = question.reveal.choice_reasons.find((r) => r.cho_id === choice.cho_id);
                        const isRevealedCorrect = hasAnswered && !!reason?.is_correct;
                        const isRevealedWrongSelected = hasAnswered && isSelected && !reason?.is_correct;

                        return (
                            <div key={choice.cho_id}>
                                <button
                                    type="button"
                                    onClick={() => handleSelect(choice.cho_id)}
                                    disabled={hasAnswered}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] flex items-start justify-between gap-3",
                                        "disabled:cursor-default",
                                        isRevealedCorrect && "border-green-400 bg-green-50",
                                        isRevealedWrongSelected && "border-red-300 bg-red-50",
                                        !hasAnswered && "border-slate-200 hover:border-slate-300",
                                        hasAnswered && !isRevealedCorrect && !isRevealedWrongSelected && "border-slate-100 text-slate-400"
                                    )}
                                >
                                    <span className="flex-1">
                                        <ChoiceImage src={choice.cho_image_url} />
                                        {choice.cho_text}
                                    </span>
                                    {isRevealedCorrect && <Check size={18} className="text-green-600 shrink-0" />}
                                    {isRevealedWrongSelected && <X size={18} className="text-red-500 shrink-0" />}
                                </button>
                                {hasAnswered && !reason?.is_correct && reason?.wrong_reason && (
                                    <p className={cn("text-xs mt-1.5 px-1", isSelected ? "text-red-500" : "text-slate-400")}>
                                        {reason.wrong_reason}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {hasAnswered && (
                    <div className="mt-6 p-4 rounded-xl bg-brand-50/60 border border-brand-100">
                        <p className="text-sm font-medium text-brand-700 mb-1.5">วิธีคิด</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                            {question.reveal.explanation ?? "ไม่มีคำอธิบายเพิ่มเติม"}
                        </p>
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-between mt-6">
                <Button variant="secondary" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
                    <ChevronLeft size={18} />
                    ข้อก่อนหน้า
                </Button>
                {isLast ? (
                    <Link href={`/products/${productId}`}>
                        <Button>ซื้อเพื่อทำครบทุกข้อ</Button>
                    </Link>
                ) : (
                    <Button onClick={() => setIndex((i) => i + 1)}>
                        ข้อถัดไป
                        <ChevronRight size={18} />
                    </Button>
                )}
            </div>
        </div>
    );
}
