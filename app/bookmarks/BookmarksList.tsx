"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, BookmarkX } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BookmarkButton from "@/app/components/BookmarkButton";
import ReportQuestionButton from "@/app/components/ReportQuestionButton";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";
import { cn } from "@/lib/cn";

type ChoiceReason = { cho_id: string; cho_text: string; cho_image_url: string | null; is_correct: boolean; wrong_reason: string | null };
export type BookmarkedQuestion = {
    bmk_id: string;
    ques_id: string;
    ques_text: string;
    ques_explanation: string | null;
    ques_image_url: string | null;
    prod_id: string;
    prod_name: string;
    choices: ChoiceReason[];
};

// แยกเป็น client component เพราะต้องเอาการ์ดออกจากลิสต์ทันทีที่กด "เอาออก" ไม่ต้องรอรีเฟรชหน้า —
// ก่อนหน้านี้ทั้งหน้าเป็น server component ล้วน กดเอาออกแล้ว backend ลบสำเร็จจริง แต่การ์ดยังค้างโชว์อยู่
// จนกว่าจะรีเฟรชเอง (หน้านี้มีไว้เพื่อดู "รายการปัจจุบัน" โดยเฉพาะ ค้างแบบนี้สร้างความสับสน)
export default function BookmarksList({ initialBookmarks }: { initialBookmarks: BookmarkedQuestion[] }) {
    const [bookmarks, setBookmarks] = useState(initialBookmarks);

    function handleRemoved(bmkId: string) {
        setBookmarks((prev) => prev.filter((b) => b.bmk_id !== bmkId));
    }

    if (bookmarks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <BookmarkX size={40} className="mb-3" />
                <p className="mb-4">ยังไม่มีข้อที่บันทึกไว้ทบทวน</p>
                <Link href="/library">
                    <Button variant="secondary">ไปที่คลังข้อสอบของฉัน</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {bookmarks.map((b) => (
                <Card key={b.bmk_id} className="p-5">
                    <p className="text-xs text-brand-600 font-medium mb-2">{b.prod_name}</p>
                    <QuestionImage src={b.ques_image_url} />
                    <h2 className="font-medium text-slate-900 leading-relaxed whitespace-pre-line mb-4">{b.ques_text}</h2>

                    <div className="flex flex-col gap-2 mb-4">
                        {b.choices.map((c) => (
                            <div key={c.cho_id}>
                                <div
                                    className={cn(
                                        "px-3.5 py-2.5 rounded-lg border text-sm flex items-start justify-between gap-2",
                                        c.is_correct ? "border-green-300 bg-green-50" : "border-slate-100 text-slate-500"
                                    )}
                                >
                                    <span className="flex-1">
                                        <ChoiceImage src={c.cho_image_url} />
                                        {c.cho_text}
                                    </span>
                                    {c.is_correct && <Check size={15} className="text-green-600 shrink-0" />}
                                    {!c.is_correct && c.wrong_reason && <X size={15} className="text-slate-300 shrink-0" />}
                                </div>
                                {!c.is_correct && c.wrong_reason && (
                                    <p className="text-xs text-slate-400 mt-1 px-1">{c.wrong_reason}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {b.ques_explanation && (
                        <div className="p-3.5 rounded-lg bg-brand-50/60 border border-brand-100 mb-3">
                            <p className="text-xs font-medium text-brand-700 mb-1">วิธีคิด</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{b.ques_explanation}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <BookmarkButton
                            questionId={b.ques_id}
                            initialBookmarked
                            onToggled={(bookmarked) => { if (!bookmarked) handleRemoved(b.bmk_id); }}
                        />
                        <ReportQuestionButton questionId={b.ques_id} />
                    </div>
                </Card>
            ))}
        </div>
    );
}
