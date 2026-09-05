import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, MinusCircle } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import { cn } from "@/lib/cn";
import { hasScoring, formatScore } from "@/lib/scoring";
import BookmarkButton from "@/app/components/BookmarkButton";
import ReportQuestionButton from "@/app/components/ReportQuestionButton";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";

export const metadata = { title: "เฉลยข้อสอบ" };

type ChoiceReason = { cho_id: string; is_correct: boolean; wrong_reason: string | null };
type ReviewQuestion = {
    ques_id: string;
    ques_text: string;
    ques_image_url: string | null;
    choices: { cho_id: string; cho_text: string; cho_image_url: string | null }[];
    selected_choice_id: string | null;
    ques_score: string | number | null;
    reveal: { correct_choice_id: string; explanation: string | null; choice_reasons: ChoiceReason[] };
    is_correct: boolean;
};
type Review = {
    att_id: string;
    prod_name: string;
    att_mode: "practice" | "timed";
    att_score: number;
    // สองค่านี้เป็น null ถ้าชุดข้อสอบนั้นไม่ใช้ระบบคะแนน (คิดผลเป็น % จากจำนวนข้อเหมือนเดิม)
    att_earned_score: string | number | null;
    att_max_score: string | number | null;
    att_total_questions: number;
    questions: ReviewQuestion[];
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [reviewRes, bookmarksRes] = await Promise.all([
        authorizedFetch(`/store/attempts/${id}/review`),
        authorizedFetch("/store/bookmarks"),
    ]);
    if (!reviewRes.ok) notFound();
    const review: Review = await reviewRes.json();
    const bookmarkedIds = new Set<string>(
        bookmarksRes.ok ? (await bookmarksRes.json()).data.map((b: { bmk_question_id: string }) => b.bmk_question_id) : []
    );

    // นับจาก is_correct ที่ freeze ไว้ตอนตอบจริง ห้ามเทียบกับ reveal.correct_choice_id (เฉลยสดปัจจุบัน) ตรงๆ
    // เพราะถ้าแอดมินแก้เฉลยทีหลัง (เช่น มีคนแจ้งปัญหาข้อนี้) ตัวเลขจะไม่ตรงกับ % คะแนนรวมด้านบนที่ freeze ไว้แล้ว
    const correctCount = review.questions.filter((q) => q.is_correct).length;

    // ชุดนี้ใช้ระบบคะแนนไหม — ดูจาก att_max_score ที่ freeze ไว้ตอนเริ่มทำ ไม่ใช่ค่าปัจจุบันของชุดข้อสอบ
    // (แอดมินอาจเปิด/ปิดระบบคะแนนทีหลัง ผลสอบใบนี้ต้องแสดงตามกติกา ณ ตอนที่ลูกค้าทำจริง)
    const scored = hasScoring(review.att_max_score);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <div className="text-center mb-10">
                    <p className="text-sm text-slate-400 mb-1">{review.prod_name}</p>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-3">เฉลยข้อสอบ</h1>
                    {scored ? (
                        <>
                            <p className="text-4xl font-semibold text-brand-600">
                                {formatScore(review.att_earned_score)}
                                <span className="text-2xl text-slate-400"> / {formatScore(review.att_max_score)}</span>
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                คิดเป็น {Number(review.att_score).toFixed(0)}% — ตอบถูก {correctCount} จาก {review.att_total_questions} ข้อ
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-4xl font-semibold text-brand-600">{Number(review.att_score).toFixed(0)}%</p>
                            <p className="text-sm text-slate-400 mt-1">
                                ตอบถูก {correctCount} จาก {review.att_total_questions} ข้อ
                            </p>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-6">
                    {review.questions.map((q, i) => {
                        const isCorrect = q.is_correct;
                        const isSkipped = !q.selected_choice_id;
                        return (
                            <Card key={q.ques_id} className="p-5">
                                <QuestionImage src={q.ques_image_url} />
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <h2 className="font-medium text-slate-900 leading-relaxed whitespace-pre-line">
                                        <span className="text-slate-400 mr-1.5">ข้อ {i + 1}.</span>
                                        {q.ques_text}
                                    </h2>
                                    <span
                                        className={cn(
                                            "shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                                            isSkipped ? "bg-slate-100 text-slate-500" : isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                                        )}
                                    >
                                        {isSkipped ? <MinusCircle size={13} /> : isCorrect ? <Check size={13} /> : <X size={13} />}
                                        {isSkipped ? "ไม่ได้ตอบ" : isCorrect ? "ถูก" : "ผิด"}
                                        {/* ได้กี่คะแนนจากเต็มกี่คะแนนของข้อนี้ — ตอบผิด/ไม่ตอบ = 0 */}
                                        {scored && (
                                            <span className="font-normal opacity-70">
                                                · {isCorrect ? formatScore(q.ques_score) : "0"}/{formatScore(q.ques_score)} คะแนน
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2 mb-4">
                                    {q.choices.map((choice) => {
                                        const reason = q.reveal.choice_reasons.find((r) => r.cho_id === choice.cho_id);
                                        const isSelected = q.selected_choice_id === choice.cho_id;
                                        return (
                                            <div key={choice.cho_id}>
                                                <div
                                                    className={cn(
                                                        "px-3.5 py-2.5 rounded-lg border text-sm flex items-start justify-between gap-2",
                                                        reason?.is_correct ? "border-green-300 bg-green-50" : isSelected ? "border-red-200 bg-red-50" : "border-slate-100 text-slate-500"
                                                    )}
                                                >
                                                    <span className="flex-1">
                                                        <ChoiceImage src={choice.cho_image_url} />
                                                        {choice.cho_text}
                                                    </span>
                                                    {reason?.is_correct && <Check size={15} className="text-green-600 shrink-0" />}
                                                    {isSelected && !reason?.is_correct && <X size={15} className="text-red-500 shrink-0" />}
                                                </div>
                                                {!reason?.is_correct && reason?.wrong_reason && (
                                                    <p className={cn("text-xs mt-1 px-1", isSelected ? "text-red-500" : "text-slate-400")}>
                                                        {reason.wrong_reason}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-3.5 rounded-lg bg-brand-50/60 border border-brand-100 mb-3">
                                    <p className="text-xs font-medium text-brand-700 mb-1">วิธีคิด</p>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                        {q.reveal.explanation ?? "ไม่มีคำอธิบายเพิ่มเติม"}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <BookmarkButton questionId={q.ques_id} initialBookmarked={bookmarkedIds.has(q.ques_id)} />
                                    <ReportQuestionButton questionId={q.ques_id} />
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="flex justify-center mt-10">
                    <Link href="/library">
                        <Button variant="secondary">กลับไปคลังข้อสอบ</Button>
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
