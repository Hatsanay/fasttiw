"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Clock, ChevronLeft, ChevronRight, LogOut, Trash2, Flag, TriangleAlert, PanelRightOpen, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/cn";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";
import { submitAnswerAction, submitAttemptAction, abandonAttemptAction, type AnswerReveal } from "@/app/actions/exam";
import { hasScoring, formatScore } from "@/lib/scoring";

type Question = {
    ques_id: string;
    ques_text: string;
    ques_image_url: string | null;
    choices: { cho_id: string; cho_text: string; cho_image_url: string | null }[];
    selected_choice_id: string | null;
    ques_score: string | number | null;
    reveal: AnswerReveal | null;
};

type Attempt = {
    att_id: string;
    att_mode: "practice" | "timed";
    // null = ชุดนี้ไม่ใช้ระบบคะแนน (snapshot ไว้ตอนเริ่มทำ ไม่อ่านค่าปัจจุบันของชุดข้อสอบ)
    att_max_score: string | number | null;
    att_total_questions: number;
    att_time_limit_minutes: number | null;
    att_started_at: string;
    questions: Question[];
};

function formatClock(totalSeconds: number): string {
    const m = Math.max(0, Math.floor(totalSeconds / 60));
    const s = Math.max(0, Math.floor(totalSeconds % 60));
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const VIEW_MODE_STORAGE_KEY = "examViewMode";
// ปักหมุดเป็นแค่ตัวช่วยจำระหว่างทำข้อสอบรอบนี้ ไม่ต้องเก็บฝั่ง backend (ไม่กระทบคะแนน/ผลลัพธ์ใดๆ) —
// เก็บ localStorage แยกตาม attempt เพื่อไม่ให้ปักหมุดของ attempt เก่าไปปนกับ attempt ใหม่
const flagStorageKey = (attId: string) => `examFlags:${attId}`;

export default function ExamRunner({ attempt }: { attempt: Attempt }) {
    const router = useRouter();
    // ชุดนี้ใช้ระบบคะแนนไหม — ยึด snapshot ตอนเริ่มทำ ไม่ใช่ค่าปัจจุบันของชุดข้อสอบ (แอดมินอาจเปลี่ยนกลางคัน)
    const scored = hasScoring(attempt.att_max_score);
    const [questions, setQuestions] = useState(attempt.questions);
    const [index, setIndex] = useState(0);
    const [viewMode, setViewMode] = useState<"single" | "all">("single");
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    // แถบรายการข้อเริ่มต้นแบบย่อ (icon เดียว) เหมือน sidebar ที่พับไว้ กดถึงจะกางออกมาเต็ม
    const [navigatorOpen, setNavigatorOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isSubmitting, startSubmitTransition] = useTransition();
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showUnansweredConfirm, setShowUnansweredConfirm] = useState(false);
    const [isExiting, startExitTransition] = useTransition();
    const submittedRef = useRef(false);
    // เก็บ promise ของการบันทึกคำตอบข้อล่าสุดไว้เสมอ — handleSubmit ต้องรอให้ตัวนี้จบก่อนเสมอ กัน race
    // ที่ผู้ใช้เพิ่งกดเลือกคำตอบข้อสุดท้ายแล้วกด "ส่งคำตอบ" (หรือหมดเวลาพอดี) เร็วมากจน PUT บันทึกคำตอบ
    // ยังไปไม่ถึง backend เลย ทำให้ข้อนั้นถูกส่งเป็น "ไม่ได้ตอบ" ทั้งที่ผู้ใช้เลือกคำตอบไปแล้วจริง
    const pendingAnswerRef = useRef<Promise<unknown>>(Promise.resolve());
    // ใช้เก็บ DOM ref ของการ์ดแต่ละข้อไว้ scroll ไปหาตอนกดเลขข้อในแถบด้านข้าง (โหมด "แสดงทุกข้อ" เท่านั้น
    // โหมด "ทีละข้อ" ไม่ต้องใช้ เพราะสลับ index ไปเลยตรงๆ)
    const questionRefs = useRef<Array<HTMLDivElement | null>>([]);

    const question = questions[index];
    const answeredCount = questions.filter((q) => q.selected_choice_id).length;
    const unansweredIndices = questions.reduce<number[]>((acc, q, i) => {
        if (!q.selected_choice_id) acc.push(i);
        return acc;
    }, []);
    const isLast = index === questions.length - 1;

    const deadline = useMemo(() => {
        if (!attempt.att_time_limit_minutes) return null;
        return new Date(attempt.att_started_at).getTime() + attempt.att_time_limit_minutes * 60_000;
    }, [attempt.att_started_at, attempt.att_time_limit_minutes]);

    // เริ่มที่ null เสมอทั้งฝั่ง server และ client (ไม่เรียก Date.now() ตอน render) — ถ้าคำนวณค่าเริ่มต้นจาก
    // Date.now() ตรงๆ ตั้งแต่ initial render ค่าที่ได้ตอน SSR กับตอน client hydrate จะไม่มีทางตรงกันเป๊ะ
    // (ต่างกันตามเวลาที่ผ่านไประหว่าง render ทั้งสองฝั่ง) ทำให้ข้อความตัวเลขวินาทีไม่ตรงกัน เกิด hydration
    // mismatch ค่าเริ่มต้นจริงจึงต้องตั้งใน useEffect ด้านล่าง (รันหลัง mount ฝั่ง client เท่านั้น) แทน
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Date.now() ต้องรอ mount เท่านั้น กัน hydration mismatch
        setRemainingSeconds(deadline ? Math.round((deadline - Date.now()) / 1000) : null);
    }, [deadline]);

    useEffect(() => {
        const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        // อ่านค่าที่จำไว้ได้แค่ฝั่ง client เท่านั้น ต้องรอ mount ก่อนเสมอ กัน hydration mismatch กับที่ SSR
        // render มาด้วยค่า default "single" เสมอ
        // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
        if (stored === "single" || stored === "all") setViewMode(stored);
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem(flagStorageKey(attempt.att_id));
        if (!stored) return;
        try {
            const ids: string[] = JSON.parse(stored);
            // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
            setFlagged(new Set(ids));
        } catch {
            // เผื่อค่าที่เก็บไว้เพี้ยน (แก้ localStorage เองผ่าน devtools ฯลฯ) ไม่ต้องถึงกับพังทั้งหน้า
        }
    }, [attempt.att_id]);

    function handleViewModeChange(mode: "single" | "all") {
        setViewMode(mode);
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }

    function handleToggleFlag(quesId: string) {
        setFlagged((prev) => {
            const next = new Set(prev);
            if (next.has(quesId)) next.delete(quesId);
            else next.add(quesId);
            localStorage.setItem(flagStorageKey(attempt.att_id), JSON.stringify([...next]));
            return next;
        });
    }

    function handleSubmit() {
        if (submittedRef.current) return;
        submittedRef.current = true;
        startSubmitTransition(async () => {
            try {
                // รอให้คำตอบข้อล่าสุดที่กำลังบันทึกอยู่ (ถ้ามี) เสร็จก่อนเสมอ ก่อนค่อยส่งคำตอบทั้งชุด
                await pendingAnswerRef.current.catch(() => {});
                const result = await submitAttemptAction(attempt.att_id);
                if ("error" in result) {
                    toast.error(result.error);
                    submittedRef.current = false;
                    return;
                }
                router.push(`/exam/attempts/${attempt.att_id}/review`);
            } catch {
                // เผื่อ submitAttemptAction/authorizedFetch throw ตรงๆ (เช่น network ล่ม) แทนที่จะคืน {error}
                // ปกติ — ต้องปลด submittedRef คืนด้วย ไม่งั้นผู้ใช้ส่งคำตอบไม่ได้อีกเลยจนกว่าจะรีเฟรชหน้า
                toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
                submittedRef.current = false;
            }
        });
    }

    // ออกจากข้อสอบกลางคัน แบบ "บันทึกไว้ทำต่อ" — ไม่ต้องเรียก submit/endpoint ใดๆ เพิ่ม เพราะคำตอบแต่ละข้อ
    // บันทึกอัตโนมัติทันทีที่เลือกอยู่แล้ว (handleSelectChoice) กลับมาทำต่อได้ทีหลังผ่าน /library → เลือกโหมด
    // → startAttemptAction จะ resume attempt เดิมตัวนี้เอง (ไม่สร้างใหม่ ดู startOrResumeAttempt ฝั่ง backend)
    // เวลาของโหมดจับเวลาเป็น wall-clock เทียบกับ att_started_at อยู่แล้ว (ดู deadline ด้านบน) จึงเดินต่อเอง
    // โดยอัตโนมัติไม่ต้องทำอะไรเพิ่ม รอ pendingAnswerRef ให้เสร็จก่อนเสมอ กันกดเลือกคำตอบข้อสุดท้ายแล้วกดออก
    // เร็วเกินจน PUT ยังไปไม่ถึง backend
    function handleSaveAndExit() {
        startExitTransition(async () => {
            await pendingAnswerRef.current.catch(() => {});
            router.push("/library");
        });
    }

    // ยกเลิกทำข้อสอบทั้งชุด (ไม่บันทึกไว้ทำต่อ) — เรียก abandonAttemptAction ตั้ง att_status เป็น abandoned
    // ฝั่ง backend ทำให้ครั้งหน้ากด "เริ่มทำข้อสอบ" ได้ attempt ใหม่ทั้งชุด (สุ่มลำดับข้อ/ตัวเลือกใหม่)
    // แทนที่จะ resume ชุดนี้ต่อ — ยังรอ pendingAnswerRef ก่อนเสมอเพื่อไม่ให้ชนกับคำขอ abandon (แม้คำตอบ
    // ที่ pending อยู่จะไม่มีผลอะไรกับชุดที่ถูกยกเลิกแล้วก็ตาม)
    function handleAbandon() {
        startExitTransition(async () => {
            await pendingAnswerRef.current.catch(() => {});
            const result = await abandonAttemptAction(attempt.att_id);
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            router.push("/library");
        });
    }

    useEffect(() => {
        if (deadline === null) return;
        const interval = setInterval(() => {
            const remaining = Math.round((deadline - Date.now()) / 1000);
            setRemainingSeconds(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                toast.message("หมดเวลาทำข้อสอบ กำลังส่งคำตอบอัตโนมัติ");
                handleSubmit();
            }
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deadline]);

    // รับ question ตรงๆ แทนที่จะอิงจาก questions[index] เสมอ — โหมด "แสดงทุกข้อ" ผู้ใช้ตอบข้อไหนก่อนก็ได้
    // ไม่จำเป็นต้องเป็นข้อที่ index ปัจจุบันชี้อยู่
    function handleSelectChoice(q: Question, choiceId: string) {
        // โหมดฝึก + เปิดเฉลยแล้ว = ล็อกไม่ให้แก้คำตอบข้อนี้อีก (เห็นผลแล้วควรไปข้อถัดไป)
        if (q.reveal) return;

        const quesId = q.ques_id;
        const promise = (async () => {
            const result = await submitAnswerAction(attempt.att_id, quesId, choiceId);
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            setQuestions((prev) =>
                prev.map((item) => (item.ques_id === quesId ? { ...item, selected_choice_id: result.selected_choice_id, reveal: result.reveal } : item))
            );
        })();
        pendingAnswerRef.current = promise;

        startTransition(() => promise);
    }

    // กดเลขข้อจากแถบนำทางด้านข้าง — โหมดทีละข้อสลับ index ตรงๆ, โหมดแสดงทุกข้อ scroll ไปหาการ์ดข้อนั้นแทน
    // (ทุกข้อ render อยู่แล้วในหน้าเดียว ไม่มี "index ปัจจุบัน" ให้สลับ)
    function handleJumpToQuestion(i: number) {
        if (viewMode === "single") {
            setIndex(i);
        } else {
            questionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function handleSubmitClick() {
        if (answeredCount < questions.length) {
            setShowUnansweredConfirm(true);
            return;
        }
        handleSubmit();
    }

    function handleJumpFromUnansweredModal(i: number) {
        setShowUnansweredConfirm(false);
        handleJumpToQuestion(i);
    }

    function handleNext() {
        if (isLast) {
            handleSubmitClick();
            return;
        }
        setIndex((i) => i + 1);
    }

    // เนื้อหาการ์ดคำถาม 1 ข้อ — ใช้ร่วมกันทั้งโหมด "ทีละข้อ" (เรียกครั้งเดียวกับ question ปัจจุบัน) และ
    // โหมด "แสดงทุกข้อ" (เรียกวนทุกข้อ) showNumber โชว์เลขข้อในการ์ดเฉพาะโหมดหลัง เพราะโหมดทีละข้อมีแถบ
    // บนสุด "ข้อ N จาก M" บอกอยู่แล้ว ไม่ต้องซ้ำ
    function renderQuestionCard(q: Question, displayNumber: number, showNumber: boolean) {
        const isFlagged = flagged.has(q.ques_id);
        return (
            <Card className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {showNumber && <p className="text-sm font-medium text-brand-600">ข้อที่ {displayNumber}</p>}
                        {scored && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                {formatScore(q.ques_score)} คะแนน
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleToggleFlag(q.ques_id)}
                        title={isFlagged ? "เอาปักหมุดออก" : "ปักหมุดไว้ทบทวน"}
                        className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
                            isFlagged ? "text-amber-500 hover:bg-amber-50" : "text-slate-300 hover:text-slate-400 hover:bg-slate-50"
                        )}
                    >
                        <Flag size={15} className={isFlagged ? "fill-amber-400" : ""} />
                    </button>
                </div>
                <QuestionImage src={q.ques_image_url} />
                <h1 className="text-lg font-medium text-slate-900 mb-6 leading-relaxed whitespace-pre-line">{q.ques_text}</h1>

                <div className="flex flex-col gap-3">
                    {q.choices.map((choice) => {
                        const isSelected = q.selected_choice_id === choice.cho_id;
                        const reason = q.reveal?.choice_reasons.find((r) => r.cho_id === choice.cho_id);
                        const isRevealedCorrect = q.reveal && reason?.is_correct;
                        const isRevealedWrongSelected = q.reveal && isSelected && !reason?.is_correct;

                        return (
                            <div key={choice.cho_id}>
                                <button
                                    type="button"
                                    onClick={() => handleSelectChoice(q, choice.cho_id)}
                                    disabled={isPending || !!q.reveal}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] flex items-start justify-between gap-3",
                                        "disabled:cursor-default",
                                        isRevealedCorrect && "border-green-400 bg-green-50",
                                        isRevealedWrongSelected && "border-red-300 bg-red-50",
                                        !q.reveal && isSelected && "border-brand-500 bg-brand-50/50",
                                        !q.reveal && !isSelected && "border-slate-200 hover:border-slate-300",
                                        !isRevealedCorrect && !isRevealedWrongSelected && q.reveal && "border-slate-100 text-slate-400"
                                    )}
                                >
                                    <span className="flex-1">
                                        <ChoiceImage src={choice.cho_image_url} />
                                        {choice.cho_text}
                                    </span>
                                    {isRevealedCorrect && <Check size={18} className="text-green-600 shrink-0" />}
                                    {isRevealedWrongSelected && <X size={18} className="text-red-500 shrink-0" />}
                                </button>
                                {q.reveal && !reason?.is_correct && reason?.wrong_reason && (
                                    <p className={cn("text-xs mt-1.5 px-1", isSelected ? "text-red-500" : "text-slate-400")}>
                                        {reason.wrong_reason}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {q.reveal && (
                    <div className="mt-6 p-4 rounded-xl bg-brand-50/60 border border-brand-100">
                        <p className="text-sm font-medium text-brand-700 mb-1.5">วิธีคิด</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{q.reveal.explanation ?? "ไม่มีคำอธิบายเพิ่มเติม"}</p>
                    </div>
                )}
            </Card>
        );
    }

    return (
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 flex flex-col">
            {/* แถบบนสุด: ปุ่มออก + progress + ตัวจับเวลา */}
            <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                <button
                    type="button"
                    onClick={() => setShowExitConfirm(true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">ออกจากข้อสอบ</span>
                </button>
                <span>
                    {viewMode === "single" ? (
                        <>ข้อ {index + 1} จาก {questions.length}</>
                    ) : (
                        <>ตอบแล้ว {answeredCount} จาก {questions.length} ข้อ</>
                    )}
                    {scored && <span className="text-slate-400"> · เต็ม {formatScore(attempt.att_max_score)} คะแนน</span>}
                </span>
                {remainingSeconds !== null ? (
                    <span className={cn("flex items-center gap-1.5 font-medium", remainingSeconds < 60 ? "text-red-500" : "text-slate-600")}>
                        <Clock size={16} />
                        {formatClock(remainingSeconds)}
                    </span>
                ) : (
                    <span />
                )}
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${(viewMode === "single" ? (index + 1) / questions.length : answeredCount / questions.length) * 100}%` }}
                />
            </div>

            {/* สลับ view: ทีละข้อ (ของเดิม) / แสดงทุกข้อรวดเดียวแบบข้อสอบกระดาษ */}
            <div className="flex items-center justify-center gap-1 rounded-full bg-slate-100 p-1 text-sm mb-8">
                <button
                    type="button"
                    onClick={() => handleViewModeChange("single")}
                    className={cn(
                        "rounded-full px-3.5 py-1.5 font-medium transition-colors",
                        viewMode === "single" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    ทีละข้อ
                </button>
                <button
                    type="button"
                    onClick={() => handleViewModeChange("all")}
                    className={cn(
                        "rounded-full px-3.5 py-1.5 font-medium transition-colors",
                        viewMode === "all" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    แสดงทุกข้อ
                </button>
            </div>

            {viewMode === "single" ? (
                <>
                    {renderQuestionCard(question, index + 1, false)}

                    <div className="flex items-center justify-between mt-6">
                        <Button variant="secondary" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
                            <ChevronLeft size={18} />
                            ข้อก่อนหน้า
                        </Button>
                        <Button onClick={handleNext} disabled={isSubmitting}>
                            {isLast ? (isSubmitting ? "กำลังส่ง..." : "ส่งคำตอบ") : "ข้อถัดไป"}
                            {!isLast && <ChevronRight size={18} />}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-col gap-6">
                        {questions.map((q, i) => (
                            <div key={q.ques_id} ref={(el) => { questionRefs.current[i] = el; }}>
                                {renderQuestionCard(q, i + 1, true)}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end mt-6">
                        <Button onClick={handleSubmitClick} disabled={isSubmitting}>
                            {isSubmitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
                        </Button>
                    </div>
                </>
            )}

            {/* แถบนำทางไปข้อต่างๆ — fixed ติดมุมขวาบนของจอเสมอ ไม่เลื่อนหายไปตอน scroll เริ่มต้นย่อเป็น
                icon เดียวเหมือน sidebar ที่พับไว้ กดถึงกางออกมาเต็ม สีน้ำเงิน = ทำแล้ว, สีขาว = ยังไม่ได้ทำ,
                ห่วงรอบเลข = ข้อที่กำลังทำอยู่ (โหมดทีละข้อ) */}
            <div className="fixed top-6 right-3 sm:right-6 z-30">
                {navigatorOpen ? (
                    <Card className="p-4 w-56 max-h-[90vh] overflow-y-auto shadow-xl shadow-slate-900/10">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-slate-700">รายการข้อ</p>
                            <button
                                type="button"
                                onClick={() => setNavigatorOpen(false)}
                                title="ย่อแถบรายการข้อ"
                                className="flex items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            >
                                <PanelRightClose size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto pr-0.5">
                            {questions.map((q, i) => {
                                const isAnswered = !!q.selected_choice_id;
                                const isCurrent = viewMode === "single" && i === index;
                                const isFlagged = flagged.has(q.ques_id);
                                return (
                                    <div key={q.ques_id} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => handleJumpToQuestion(i)}
                                            title={`ข้อที่ ${i + 1}${isAnswered ? " (ทำแล้ว)" : ""}${isFlagged ? " (ปักหมุดไว้)" : ""}`}
                                            className={cn(
                                                "h-8 w-8 rounded-lg border text-xs font-medium flex items-center justify-center transition-all",
                                                isAnswered
                                                    ? "bg-brand-600 border-brand-600 text-white"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300",
                                                isCurrent && "ring-2 ring-brand-400 ring-offset-1"
                                            )}
                                        >
                                            {i + 1}
                                        </button>
                                        {isFlagged && (
                                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-white" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-sm bg-brand-600" />
                                ทำแล้ว
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-sm border border-slate-300 bg-white" />
                                ยังไม่ได้ทำ
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="relative h-3 w-3 rounded-sm border border-slate-300 bg-white">
                                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 border border-white" />
                                </span>
                                ปักหมุดไว้ทบทวน
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="p-2 flex items-center justify-center shadow-xl shadow-slate-900/10">
                        <button
                            type="button"
                            onClick={() => setNavigatorOpen(true)}
                            title="แสดงรายการข้อ"
                            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                        >
                            <PanelRightOpen size={20} />
                            <span className="text-[11px] font-medium tabular-nums">{answeredCount}/{questions.length}</span>
                        </button>
                    </Card>
                )}
            </div>

            {showExitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <Card className="animate-modal-pop-in relative w-full max-w-sm overflow-hidden p-6 pt-8 sm:p-8 sm:pt-9 shadow-xl shadow-slate-900/10">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-brand-50 to-transparent" />

                        <div className="relative flex flex-col items-center text-center gap-2 mb-2">
                            <div className="relative mb-1 h-14 w-14">
                                <span className="absolute -inset-2.5 rounded-full bg-brand-300/60 blur-md" />
                                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/40">
                                    <LogOut size={22} />
                                </span>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">ออกจากข้อสอบตอนนี้?</h2>
                            <p className="text-sm text-slate-500 max-w-xs">
                                คำตอบที่เลือกไว้บันทึกให้อัตโนมัติแล้ว กลับมาทำต่อได้ทีหลังที่หน้า &quot;คลังข้อสอบของฉัน&quot;
                                {attempt.att_time_limit_minutes !== null && " เวลานับถอยหลังจะเดินต่อตามปกติแม้ไม่ได้เปิดหน้านี้ทิ้งไว้"}
                            </p>
                        </div>
                        <div className="relative flex gap-3 mt-4">
                            <Button type="button" variant="secondary" onClick={() => setShowExitConfirm(false)} disabled={isExiting} className="flex-1">
                                ทำต่อ
                            </Button>
                            <Button type="button" onClick={handleSaveAndExit} disabled={isExiting} className="flex-1">
                                {isExiting ? "กำลังบันทึก..." : "บันทึกแล้วออก"}
                            </Button>
                        </div>

                        <div className="relative mt-3 flex flex-col items-center gap-1">
                            <button
                                type="button"
                                onClick={handleAbandon}
                                disabled={isExiting}
                                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={14} />
                                ยกเลิกข้อสอบชุดนี้ทั้งหมด
                            </button>
                            <p className="text-xs text-slate-400">ไม่บันทึกไว้ทำต่อ ครั้งหน้าจะเริ่มข้อสอบชุดใหม่</p>
                        </div>
                    </Card>
                </div>
            )}

            {showUnansweredConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <Card className="animate-modal-pop-in relative w-full max-w-sm overflow-hidden p-6 pt-8 sm:p-8 sm:pt-9 shadow-xl shadow-slate-900/10">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-amber-50 to-transparent" />

                        <div className="relative flex flex-col items-center text-center gap-2 mb-2">
                            <div className="relative mb-1 h-14 w-14">
                                <span className="absolute -inset-2.5 rounded-full bg-amber-300/60 blur-md" />
                                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/40">
                                    <TriangleAlert size={22} />
                                </span>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">ยังตอบไม่ครบ {unansweredIndices.length} ข้อ</h2>
                            <p className="text-sm text-slate-500 max-w-xs">แตะเลขข้อด้านล่างเพื่อกลับไปตอบ หรือส่งคำตอบตอนนี้เลยก็ได้</p>
                        </div>

                        <div className="relative flex flex-wrap justify-center gap-2 my-4 max-h-40 overflow-y-auto">
                            {unansweredIndices.map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleJumpFromUnansweredModal(i)}
                                    className="h-9 w-9 rounded-lg border border-amber-200 bg-amber-50 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <div className="relative flex gap-3 mt-2">
                            <Button type="button" variant="secondary" onClick={() => setShowUnansweredConfirm(false)} className="flex-1">
                                กลับไปตอบ
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    setShowUnansweredConfirm(false);
                                    handleSubmit();
                                }}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                {isSubmitting ? "กำลังส่ง..." : "ส่งคำตอบเลย"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
