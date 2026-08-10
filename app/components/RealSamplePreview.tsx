import Link from "next/link";
import { Check, X, BookOpenCheck } from "lucide-react";
import type { SampleQuestion } from "@/lib/api";

// ใช้โชว์เฉลยจริง 1 ข้อจากชุดข้อสอบนั้นๆ ที่หน้า product detail (ใกล้ปุ่มซื้อ) แทนคำบรรยายเฉยๆ
// เลือกโชว์ตัวเลือกที่ถูก + ตัวเลือกผิด 1 ตัวที่มี wrong_reason พร้อมเฉลยเลย ไม่ต้องรอผู้ใช้กดตอบ
// (ต่างจาก SampleExam ที่ทำ 10 ข้อ เพราะจุดนี้ต้องการให้เห็นจุดขายไวที่สุดโดยไม่ต้องคลิกอะไร)
export default function RealSamplePreview({ question, productId }: { question: SampleQuestion; productId: string }) {
    const correctReason = question.reveal.choice_reasons.find((r) => r.is_correct);
    const wrongReason = question.reveal.choice_reasons.find((r) => !r.is_correct && r.wrong_reason);
    const correctChoice = question.choices.find((c) => c.cho_id === correctReason?.cho_id);
    const wrongChoice = question.choices.find((c) => c.cho_id === wrongReason?.cho_id);
    const otherChoices = question.choices.filter((c) => c.cho_id !== correctChoice?.cho_id && c.cho_id !== wrongChoice?.cho_id);

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-200/50 overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                    <BookOpenCheck size={12} />
                    ตัวอย่างเฉลยจริงจากชุดนี้
                </span>
            </div>

            <div className="p-5 sm:p-6">
                <p className="font-medium text-slate-800 mb-4 leading-relaxed whitespace-pre-line">{question.ques_text}</p>

                <div className="flex flex-col gap-2 mb-4">
                    {correctChoice && (
                        <div className="flex items-center justify-between rounded-lg border-2 border-green-300 bg-green-50 px-3 py-2 text-sm">
                            <span className="text-slate-700">{correctChoice.cho_text}</span>
                            <Check size={16} className="text-green-600 shrink-0" />
                        </div>
                    )}
                    {wrongChoice && (
                        <div>
                            <div className="flex items-center justify-between rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-sm">
                                <span className="text-slate-700">{wrongChoice.cho_text}</span>
                                <X size={16} className="text-red-500 shrink-0" />
                            </div>
                            <p className="text-xs text-red-500 mt-1.5 px-1">{wrongReason?.wrong_reason}</p>
                        </div>
                    )}
                    {otherChoices.map((c) => (
                        <div key={c.cho_id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-400">
                            {c.cho_text}
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-brand-50/70 border border-brand-100 p-3.5">
                    <p className="text-xs font-medium text-brand-700 mb-1">วิธีคิด</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {question.reveal.explanation ?? "ไม่มีคำอธิบายเพิ่มเติม"}
                    </p>
                </div>
            </div>

            <Link
                href={`/products/${productId}/sample`}
                className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50/50 transition-colors py-3 border-t border-slate-100"
            >
                ลองทำเต็มๆ 10 ข้อฟรี
            </Link>
        </div>
    );
}
