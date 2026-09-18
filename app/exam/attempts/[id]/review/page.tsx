import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, MinusCircle, ListChecks, ChevronRight, RotateCcw, TrendingUp, TrendingDown, Users } from "lucide-react";
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
import ReadinessCard, { type Readiness, type Pace } from "./ReadinessCard";

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
// ผลรายหมวด "ของครั้งนี้" — accuracy คิดจาก earned/possible เหมือนทุกหน้า (ชุดที่ไม่ใช้ระบบคะแนน
// นับข้อละ 1 คะแนน ผลจึงเท่ากับการนับจำนวนข้อ)
type TopicResult = {
    tpc_id: string; tpc_name: string;
    correct: number; total: number;
    earned: number; possible: number; scored: boolean;
    accuracy: number;
};
type Review = {
    att_id: string;
    att_product_id: string;
    prod_name: string;
    att_mode: "practice" | "timed";
    att_score: number;
    // สองค่านี้เป็น null ถ้าชุดข้อสอบนั้นไม่ใช้ระบบคะแนน (คิดผลเป็น % จากจำนวนข้อเหมือนเดิม)
    att_earned_score: string | number | null;
    att_max_score: string | number | null;
    att_total_questions: number;
    att_started_at: string;
    att_submitted_at: string | null;
    // null = ครั้งแรกที่ทำชุดนี้ จึงไม่มีอะไรให้เทียบ
    prev_score: string | number | null;
    // ข้อของชุดนี้ที่ยังตอบผิดอยู่ นับข้ามทุกครั้งที่ทำ (ไม่ใช่เฉพาะใบนี้) — ตรงกับที่หน้า /history/mistakes โชว์
    mistake_count: number;
    // null = ชุดนี้ไม่ได้ตั้งเกณฑ์ผ่าน / ไม่ใช่โหมดจับเวลา (ดู ReadinessCard)
    readiness: Readiness | null;
    pace: Pace | null;
    // null = คนทำชุดนี้ยังน้อยเกินกว่าจะเทียบได้อย่างมีความหมาย (backend ซ่อนให้เอง)
    peer_comparison: { peers: number; better_than_percent: number; average_score: number } | null;
    topic_breakdown: TopicResult[];
    questions: ReviewQuestion[];
};

// เวลาที่ใช้ทำจริง — คิดจากเวลาเริ่มถึงเวลาส่ง เหมือนที่หน้า /history ใช้
function formatDuration(startedAt: string, submittedAt: string | null): string | null {
    if (!submittedAt) return null;
    const minutes = Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 60000);
    if (minutes < 1) return "ไม่ถึง 1 นาที";
    if (minutes < 60) return `${minutes} นาที`;
    return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
}

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

    // แยก "ตอบผิด" ออกจาก "ไม่ได้ตอบ" — สองอย่างนี้แก้คนละวิธี (ตอบผิดคือไม่เข้าใจ ไม่ได้ตอบคือคุมเวลาไม่ทัน)
    // แต่ทั้งคู่ได้ 0 คะแนนเหมือนกัน % คะแนนจึงไม่เปลี่ยน
    //
    // นับทั้งสองค่าจากคำถามที่มีอยู่จริงตรงๆ ไม่ใช่ลบออกจาก att_total_questions — ถ้าแอดมินปิดคำถามบางข้อ
    // หลังลูกค้าทำไปแล้ว ข้อนั้นจะหายจาก questions แต่ att_total_questions ที่ freeze ไว้ยังนับรวมอยู่
    // การลบจะทำให้ข้อที่ถูกปิดไปโผล่เป็น "ตอบผิด" ทั้งที่ลูกค้าอาจตอบถูก
    const skippedCount = review.questions.filter((q) => !q.selected_choice_id).length;
    const wrongCount = review.questions.filter((q) => q.selected_choice_id && !q.is_correct).length;
    const duration = formatDuration(review.att_started_at, review.att_submitted_at);
    const prevScore = review.prev_score === null ? null : Number(review.prev_score);
    const diff = prevScore === null ? null : Number(review.att_score) - prevScore;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <div className="text-center mb-10">
                    <p className="text-sm text-slate-400 mb-1">{review.prod_name}</p>
                    <h1 className="text-2xl font-semibold text-slate-900 mb-3">เฉลยข้อสอบ</h1>
                    {/* หัวหน้าเหลือแค่คะแนน — "ตอบถูก X จาก Y ข้อ" ย้ายไปอยู่ในบล็อกสรุปถัดลงไปแล้ว
                        (เดิมอยู่ทั้งสองที่ อ่านเจอเรื่องเดียวกันซ้ำสองรอบติดกัน) */}
                    {scored ? (
                        <>
                            <p className="text-4xl font-semibold text-brand-600">
                                {formatScore(review.att_earned_score)}
                                <span className="text-2xl text-slate-400"> / {formatScore(review.att_max_score)}</span>
                            </p>
                            <p className="text-sm text-slate-400 mt-1">คิดเป็น {Number(review.att_score).toFixed(0)}%</p>
                        </>
                    ) : (
                        <p className="text-4xl font-semibold text-brand-600">{Number(review.att_score).toFixed(0)}%</p>
                    )}
                </div>

                {/* "ถ้าสอบวันนี้ ผ่านไหม" — สิ่งแรกที่คนเพิ่งสอบเสร็จอยากรู้ ขึ้นเฉพาะชุดที่ตั้งเกณฑ์ผ่าน/โหมดจับเวลา */}
                <ReadinessCard
                    readiness={review.readiness ?? null}
                    pace={review.pace ?? null}
                    scorePercent={Number(review.att_score)}
                    skippedCount={skippedCount}
                />

                {/* เทียบกับคนอื่นแบบไม่เปิดเผยตัว — ไม่มีชื่อ ไม่มีอันดับ เป็นค่าสถิติล้วน
                    สนามที่แข่งกับคนอื่น (เช่น ก.พ.) "ได้กี่ %" อย่างเดียวไม่บอกว่าพอหรือยัง */}
                {review.peer_comparison && (
                    <Card className="mb-4 flex items-center gap-4 p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <Users size={20} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-slate-700">
                                คะแนนครั้งนี้สูงกว่า{" "}
                                <span className="text-lg font-semibold text-brand-600 tabular-nums">
                                    {review.peer_comparison.better_than_percent}%
                                </span>{" "}
                                ของคนที่ทำชุดนี้
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                                เทียบกับ {review.peer_comparison.peers} คน · คะแนนเฉลี่ยของคนอื่น {review.peer_comparison.average_score}%
                                · นับคนละครั้งที่ดีที่สุด ไม่มีการเปิดเผยว่าใครได้เท่าไหร่
                            </p>
                        </div>
                    </Card>
                )}

                {/* สรุปผลครั้งนี้ — วางไว้บนสุดก่อนข้อ 1 ตามที่ผู้ใช้ระบุ
                    เดิมหน้านี้บอกแค่ % แล้วโยนรายการคำถามใส่ทันที ผู้ใช้ต้องไล่นับเองว่าผิดกี่ข้อ พลาดหมวดไหน */}
                <Card className="mb-4 grid grid-cols-3 divide-x divide-slate-100 p-5">
                    <div className="text-center">
                        <p className="text-xl font-semibold text-green-600">{correctCount}</p>
                        <p className="mt-0.5 text-xs text-slate-400">ตอบถูก</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-semibold text-red-500">{wrongCount}</p>
                        <p className="mt-0.5 text-xs text-slate-400">ตอบผิด</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-semibold text-slate-400">{skippedCount}</p>
                        <p className="mt-0.5 text-xs text-slate-400">ไม่ได้ตอบ</p>
                    </div>
                </Card>

                {/* ยอดรวม + เวลาที่ใช้ + เทียบกับครั้งก่อนของชุดเดียวกัน — เทียบกับ "ครั้งก่อน" ไม่ใช่ "ดีที่สุด"
                    เพราะสิ่งที่อยากรู้ทันทีหลังส่งคำตอบคือรอบนี้พัฒนาขึ้นไหม */}
                <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>ตอบถูก {correctCount} จาก {review.att_total_questions} ข้อ</span>
                    {/* ชุดที่ใช้ระบบคะแนนต้องเห็นคะแนนคู่กับจำนวนข้อเสมอ (ผู้ใช้สั่ง 2026-09-18) — ข้อละกี่คะแนน
                        ไม่เท่ากัน "ถูก 34 จาก 100 ข้อ" จึงบอกไม่ได้ว่าได้กี่คะแนน */}
                    {scored && (
                        <span>
                            ได้ {formatScore(review.att_earned_score)} จาก {formatScore(review.att_max_score)} คะแนน
                        </span>
                    )}
                    {duration && <span>ใช้เวลา {duration}</span>}
                    {diff !== null && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 font-medium",
                                diff > 0 ? "text-green-600" : diff < 0 ? "text-amber-600" : "text-slate-400"
                            )}
                        >
                            {diff > 0 ? <TrendingUp size={13} /> : diff < 0 ? <TrendingDown size={13} /> : null}
                            {diff === 0
                                ? `เท่ากับครั้งก่อน (${prevScore?.toFixed(0)}%)`
                                : `${diff > 0 ? "+" : ""}${diff.toFixed(0)}% จากครั้งก่อน (${prevScore?.toFixed(0)}%)`}
                        </span>
                    )}
                </div>

                {/* ผลรายหมวด เรียงหมวดที่แม่นน้อยสุดขึ้นก่อน = จุดอ่อนของรอบนี้อยู่บนสุดเสมอ
                    ไม่ซ่อนหมวดที่ทำได้ดี เพราะการเห็นว่า "หมวดนี้แม่นแล้ว" มีค่าพอกับการเห็นจุดอ่อน */}
                {review.topic_breakdown.length > 0 && (
                    <Card className="mb-4 p-5">
                        <p className="mb-3 text-sm font-medium text-slate-600">ผลรายหมวดของครั้งนี้</p>
                        <div className="flex flex-col gap-2.5">
                            {review.topic_breakdown.map((t) => (
                                <div key={t.tpc_id}>
                                    {/* ชื่อหมวดยาวได้ (ชื่อวิชา ก.พ.) ให้ขึ้นบรรทัดใหม่แทนการตัดทิ้ง ตัวเลขชิดขวาเสมอ
                                        หมวดของชุดที่ใช้ระบบคะแนนบอกคะแนนต่อท้ายจำนวนข้อด้วย */}
                                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                                        <span className="min-w-0 text-slate-600">{t.tpc_name}</span>
                                        <span className="shrink-0 text-slate-400">
                                            <span className={cn("font-medium", t.accuracy < 50 ? "text-red-500" : "text-slate-600")}>
                                                {t.accuracy}%
                                            </span>
                                            {" · ถูก "}{t.correct}/{t.total} ข้อ
                                            {t.scored && ` · ${formatScore(t.earned)}/${formatScore(t.possible)} คะแนน`}
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={cn("h-full rounded-full", t.accuracy < 50 ? "bg-red-400" : "bg-brand-500")}
                                            style={{ width: `${t.accuracy}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* ทางไปทบทวนต่อ — ปิดท้ายบล็อกสรุป ก่อนเข้ารายการคำถาม */}
                {review.mistake_count > 0 && (
                    <Link href={`/history/mistakes?product_id=${review.att_product_id}`} className="block">
                        <Card className="flex items-center gap-4 p-5 transition-colors hover:border-brand-200">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <ListChecks size={20} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-medium text-slate-800">
                                    ทบทวน {review.mistake_count} ข้อที่ยังตอบผิดในชุดนี้
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-400">
                                    รวมทุกครั้งที่ทำชุดนี้ ไม่ใช่เฉพาะรอบนี้ — ดูเฉลยพร้อมวิธีคิดทีละข้อ
                                </span>
                            </span>
                            <ChevronRight size={18} className="shrink-0 text-slate-300" />
                        </Card>
                    </Link>
                )}

                {/* ปิดท้ายบล็อกสรุปด้วยทางไปหน้าประวัติ — สรุปตรงนี้เป็นของ "ครั้งนี้ครั้งเดียว"
                    ส่วนหน้าประวัติรวมทุกครั้งทุกชุด (กราฟพัฒนาการ สรุปรายชุด จุดอ่อนสะสม) */}
                <div className="mb-10 mt-4 flex justify-center">
                    <Link href="/history">
                        <Button variant="ghost" size="sm" className="inline-flex items-center gap-1 text-slate-500">
                            ดูรายละเอียดเพิ่มเติม
                            <ChevronRight size={14} />
                        </Button>
                    </Link>
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

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    <Link href={`/exam/${review.att_product_id}`}>
                        <Button className="inline-flex items-center gap-1.5">
                            <RotateCcw size={15} />
                            ทำชุดนี้อีกครั้ง
                        </Button>
                    </Link>
                    <Link href="/library">
                        <Button variant="secondary">กลับไปคลังข้อสอบ</Button>
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
