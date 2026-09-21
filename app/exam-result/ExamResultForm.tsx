"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { postJson } from "@/lib/http";

export type OutcomeInfo = {
    round_name: string;
    exam_date: string;
    closed: boolean;
    name: string;
    answered: {
        outcome: Outcome;
        score: string | null;
        comment: string | null;
        publish_consent: boolean;
        display_name: string | null;
    } | null;
    default_display_name: string;
};

type Outcome = "passed" | "failed" | "pending_result" | "absent";

// เรียง "ยังไม่ประกาศผล" ไว้ให้เห็นชัด — ผลสอบไทยมักประกาศช้าเป็นเดือน ถ้าไม่มีตัวเลือกนี้
// คนที่ยังไม่รู้ผลจะปิดหน้าไปเฉยๆ แล้วเราไม่ได้อะไรเลย (มีตัวเลือกนี้ = ได้สิทธิ์กลับมาถามซ้ำ)
const OPTIONS: { value: Outcome; label: string; hint: string }[] = [
    { value: "passed", label: "ผ่านแล้ว 🎉", hint: "ยินดีด้วยครับ" },
    { value: "failed", label: "ยังไม่ผ่าน", hint: "บอกเราได้ว่าติดตรงไหน จะได้ปรับเนื้อหาให้ตรงขึ้น" },
    { value: "pending_result", label: "ยังไม่ประกาศผล", hint: "เดี๋ยวเราจะกลับมาถามอีกครั้งตอนผลออก" },
    { value: "absent", label: "ไม่ได้ไปสอบ", hint: "ไม่เป็นไรครับ" },
];

// ยิงผ่าน Route Handler (`/api/exam-result`) ไม่ใช้ Server Action — WAF ของโฮสต์ตอบ 403 ให้ request
// ที่มีสตริง `$@` ซึ่ง Next แนบมากับฟอร์ม Server Action (ดู CLAUDE.md 6.2)
export default function ExamResultForm({ token, info }: { token: string; info: OutcomeInfo }) {
    const [outcome, setOutcome] = useState<Outcome | null>(info.answered?.outcome ?? null);
    const [score, setScore] = useState(info.answered?.score ?? "");
    const [comment, setComment] = useState(info.answered?.comment ?? "");
    const [consent, setConsent] = useState(info.answered?.publish_consent ?? false);
    const [displayName, setDisplayName] = useState(info.answered?.display_name ?? info.default_display_name);
    const [pending, setPending] = useState(false);
    const [done, setDone] = useState<string>();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!outcome) return toast.error("กรุณาเลือกผลสอบก่อน");

        setPending(true);
        const res = await postJson("/api/exam-result", {
            token, outcome, score, comment,
            publish_consent: consent,
            display_name: displayName,
        });
        setPending(false);
        if (!res.ok) return toast.error(res.message ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่");
        setDone(res.message ?? "บันทึกคำตอบแล้ว");
    }

    async function handleOptOut() {
        setPending(true);
        const res = await postJson("/api/exam-result", { token, opt_out: true });
        setPending(false);
        if (!res.ok) return toast.error(res.message ?? "ทำรายการไม่สำเร็จ");
        setDone(res.message ?? "รับทราบแล้ว");
    }

    if (done) {
        return (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <CheckCircle2 size={22} />
                </span>
                <p className="text-sm text-slate-600">{done}</p>
                {outcome === "pending_result" && (
                    <p className="text-xs text-slate-400">เราจะส่งอีเมลมาถามอีกครั้งตอนผลประกาศ</p>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                {OPTIONS.map((o) => (
                    <label
                        key={o.value}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                            outcome === o.value ? "border-brand-300 bg-brand-50/60" : "border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        <input
                            type="radio"
                            name="outcome"
                            checked={outcome === o.value}
                            onChange={() => setOutcome(o.value)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                        />
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-800">{o.label}</span>
                            <span className="block text-xs text-slate-500">{o.hint}</span>
                        </span>
                    </label>
                ))}
            </div>

            {(outcome === "passed" || outcome === "failed") && (
                <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">คะแนนที่ได้ (ถ้าจำได้ ไม่บังคับ)</span>
                    <Input value={score} onChange={(e) => setScore(e.target.value)} placeholder="เช่น 112/200 หรือ 65%" />
                </label>
            )}

            <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">อยากบอกอะไรเราเพิ่มไหม (ไม่บังคับ)</span>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="เช่น ข้อสอบจริงออกแนวไหนเยอะ ส่วนไหนของเว็บช่วยได้มากที่สุด"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
            </label>

            {/* ความยินยอมต้องติ๊กเอง ไม่ติ๊กมาให้ล่วงหน้า และบอกให้ชัดว่าจะแสดงชื่อว่าอะไร (PDPA) */}
            {comment.trim() !== "" && (
                <div className="rounded-xl border border-slate-200 p-3">
                    <label className="flex cursor-pointer gap-2">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                        />
                        <span className="text-sm text-slate-700">
                            ยินยอมให้นำข้อความนี้ไปแสดงบนเว็บไซต์ได้
                            <span className="block text-xs text-slate-500">ไม่ติ๊กก็ตอบได้ตามปกติ เราใช้ข้อมูลภายในเท่านั้น</span>
                        </span>
                    </label>
                    {consent && (
                        <label className="mt-3 flex flex-col gap-1">
                            <span className="text-xs text-slate-600">ชื่อที่จะแสดงคู่กับข้อความ</span>
                            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
                        </label>
                    )}
                </div>
            )}

            <Button type="submit" disabled={pending} className="w-full">
                {pending ? "กำลังบันทึก…" : info.answered ? "อัปเดตคำตอบ" : "ส่งคำตอบ"}
            </Button>

            <button
                type="button"
                onClick={handleOptOut}
                disabled={pending}
                className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
                ไม่ต้องส่งอีเมลเรื่องนี้ถึงฉันอีก
            </button>
        </form>
    );
}
