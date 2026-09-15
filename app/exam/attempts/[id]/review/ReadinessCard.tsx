import { CheckCircle2, Target, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import Card from "@/components/ui/Card";
import { formatScore } from "@/lib/scoring";

// "ถ้าสอบวันนี้ ผ่านไหม" (2026-09-15) — backend คำนวณให้แล้ว (buildReadiness/buildPace ใน attempt.controller.js)
// readiness = null → ชุดนี้ไม่ได้ตั้งเกณฑ์ผ่าน · pace = null → ไม่ใช่โหมดจับเวลา · ทั้งคู่ null → ไม่แสดงการ์ดเลย
export type Readiness = { pass_percent: number; passed: boolean; unit: "questions" | "points"; required: number; gap: number };
export type Pace = { used_seconds: number; limit_seconds: number; avg_seconds_per_question: number; target_seconds_per_question: number };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// เวลา: โหมดจับเวลาใช้เกินกำหนดไม่ได้อยู่แล้ว เฉลี่ยจึงไม่มีทางเกินเป้า — สิ่งที่มีประโยชน์จริงคือ "หมดเวลาก่อนทำครบไหม"
function PaceRow({ pace, skippedCount }: { pace: Pace; skippedCount: number }) {
    const ranOut = pace.used_seconds >= pace.limit_seconds - 5;
    const leftMinutes = Math.floor((pace.limit_seconds - pace.used_seconds) / 60);
    return (
        <div className="flex items-start gap-2.5 text-sm">
            <Clock size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <p className="text-slate-600 leading-relaxed">
                เฉลี่ยข้อละ <span className="font-medium text-slate-800 tabular-nums">{clock(pace.avg_seconds_per_question)}</span> นาที
                <span className="text-slate-400"> · ชุดนี้ให้ข้อละ {clock(pace.target_seconds_per_question)} นาที</span>
                <br />
                {ranOut ? (
                    <span className={skippedCount > 0 ? "text-amber-700" : "text-slate-500"}>
                        {skippedCount > 0
                            ? `หมดเวลาก่อนทำครบ — ไม่ได้ตอบ ${skippedCount} ข้อ ลองฝึกทำให้ได้ข้อละไม่เกิน ${clock(pace.target_seconds_per_question)} นาที`
                            : "ใช้เวลาเต็มที่กำหนดพอดี"}
                    </span>
                ) : (
                    <span className="text-slate-500">ทำเสร็จก่อนหมดเวลา{leftMinutes > 0 ? ` ${leftMinutes} นาที` : ""}</span>
                )}
            </p>
        </div>
    );
}

export default function ReadinessCard({
    readiness,
    pace,
    scorePercent,
    skippedCount,
}: {
    readiness: Readiness | null;
    pace: Pace | null;
    scorePercent: number;
    skippedCount: number;
}) {
    if (!readiness && !pace) return null;
    if (!readiness) {
        return (
            <Card className="mb-4 p-5">
                <PaceRow pace={pace!} skippedCount={skippedCount} />
            </Card>
        );
    }

    const { passed, pass_percent: passAt } = readiness;
    const gapText = readiness.unit === "points" ? `${formatScore(readiness.gap)} คะแนน` : `${readiness.gap} ข้อ`;
    const requiredText = readiness.unit === "points" ? `${formatScore(readiness.required)} คะแนน` : `${readiness.required} ข้อ`;
    const fill = Math.min(100, Math.max(0, scorePercent));

    return (
        <Card className={cn("mb-4 p-5", passed ? "border-green-200 bg-green-50/40" : "border-red-100 bg-red-50/30")}>
            <p className="text-xs font-medium text-slate-500 mb-3">ถ้าสอบวันนี้</p>
            <div className="flex items-start gap-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                    {passed ? <CheckCircle2 size={20} /> : <Target size={20} />}
                </span>
                <div className="min-w-0">
                    <p className={cn("text-lg font-semibold", passed ? "text-green-700" : "text-red-600")}>
                        {passed ? "ผ่านเกณฑ์แล้ว" : `ยังไม่ผ่าน — ขาดอีก ${gapText}`}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                        เกณฑ์ผ่านของชุดนี้ {passAt}% (ต้องได้อย่างน้อย {requiredText}) · ครั้งนี้ได้ {Math.round(scorePercent)}%
                    </p>
                </div>
            </div>

            {/* แถบคะแนนพร้อมเส้นเกณฑ์ — เห็นระยะห่างจากเส้นผ่านด้วยตา ไม่ต้องคิดเลข */}
            <div className="relative mt-5 mb-6" role="img" aria-label={`ได้ ${Math.round(scorePercent)}% เกณฑ์ผ่าน ${passAt}%`}>
                <div className="h-2.5 rounded-full bg-white border border-slate-100 overflow-hidden">
                    <div className={cn("h-full rounded-full", passed ? "bg-green-500" : "bg-red-400")} style={{ width: `${fill}%` }} />
                </div>
                <div className="absolute -top-1 h-4.5 w-0.5 rounded bg-slate-700" style={{ left: `calc(${passAt}% - 1px)` }} />
                <span
                    className="absolute top-5 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-slate-600"
                    style={{ left: `clamp(2.5rem, ${passAt}%, calc(100% - 2.5rem))` }}
                >
                    เกณฑ์ {passAt}%
                </span>
            </div>

            {pace && (
                <div className="border-t border-slate-200/70 pt-4">
                    <PaceRow pace={pace} skippedCount={skippedCount} />
                </div>
            )}
        </Card>
    );
}
