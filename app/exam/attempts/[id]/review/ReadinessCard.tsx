import { CheckCircle2, Target, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import Card from "@/components/ui/Card";
import { formatScore } from "@/lib/scoring";

// "ถ้าสอบวันนี้ ผ่านไหม" (2026-09-15) — backend คำนวณให้แล้ว (buildReadiness/buildPace ใน attempt.controller.js)
// readiness = null → ชุดนี้ไม่ได้ตั้งเกณฑ์ผ่าน · pace = null → ไม่ใช่โหมดจับเวลา · ทั้งคู่ null → ไม่แสดงการ์ดเลย
// เกณฑ์รายวิชา (2026-09-16): overall = เกณฑ์รวมทั้งชุด (null = ไม่ตั้ง) · subjects = วิชาที่ตั้งเกณฑ์ไว้
// passed = ผ่านครบทุกเกณฑ์ที่ตั้ง (สนามสอบอย่าง ก.พ. ภาค ก ต้องผ่านทุกวิชา)
export type Judgement = { pass_percent: number; passed: boolean; unit: "questions" | "points"; required: number; gap: number };
export type SubjectJudgement = Judgement & { tpc_id: string; tpc_name: string; percent: number };
export type Readiness = { passed: boolean; overall: Judgement | null; subjects: SubjectJudgement[] };
export type Pace = { used_seconds: number; limit_seconds: number; avg_seconds_per_question: number; target_seconds_per_question: number };

// backend รุ่นก่อนเกณฑ์รายวิชาส่ง Judgement ตรงๆ — รองรับไว้ช่วง deploy ไม่พร้อมกัน
function normalize(r: Readiness | Judgement): Readiness {
    return "subjects" in r ? r : { passed: r.passed, overall: r, subjects: [] };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const amount = (j: Judgement, n: number) => (j.unit === "points" ? `${formatScore(n)} คะแนน` : `${n} ข้อ`);

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

// แถบคะแนนพร้อมเส้นเกณฑ์ — เห็นระยะห่างจากเส้นผ่านด้วยตา ไม่ต้องคิดเลข
function ThresholdBar({ percent, passAt, passed, compact = false }: { percent: number; passAt: number; passed: boolean; compact?: boolean }) {
    const fill = Math.min(100, Math.max(0, percent));
    return (
        <div className={cn("relative", compact ? "mt-2" : "mt-5 mb-6")} role="img" aria-label={`ได้ ${Math.round(percent)}% เกณฑ์ผ่าน ${passAt}%`}>
            <div className={cn("rounded-full bg-white border border-slate-100 overflow-hidden", compact ? "h-1.5" : "h-2.5")}>
                <div className={cn("h-full rounded-full", passed ? "bg-green-500" : "bg-red-400")} style={{ width: `${fill}%` }} />
            </div>
            <div
                className={cn("absolute w-0.5 rounded bg-slate-700", compact ? "-top-1 h-3.5" : "-top-1 h-4.5")}
                style={{ left: `calc(${passAt}% - 1px)` }}
            />
            {!compact && (
                <span
                    className="absolute top-5 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-slate-600"
                    style={{ left: `clamp(2.5rem, ${passAt}%, calc(100% - 2.5rem))` }}
                >
                    เกณฑ์ {passAt}%
                </span>
            )}
        </div>
    );
}

function headline(r: Readiness): string {
    if (r.passed) return r.subjects.length ? "ผ่านเกณฑ์ครบทุกวิชา" : "ผ่านเกณฑ์แล้ว";
    const failed = r.subjects.filter((s) => !s.passed);
    if (failed.length === 0 && r.overall) return `ยังไม่ผ่าน — คะแนนรวมขาดอีก ${amount(r.overall, r.overall.gap)}`;
    if (failed.length === 1 && (!r.overall || r.overall.passed)) {
        return `ยังไม่ผ่าน — ${failed[0].tpc_name} ขาดอีก ${amount(failed[0], failed[0].gap)}`;
    }
    return `ยังไม่ผ่าน — ยังไม่ถึงเกณฑ์ ${failed.length} วิชา${r.overall && !r.overall.passed ? " และคะแนนรวม" : ""}`;
}

export default function ReadinessCard({
    readiness: raw,
    pace,
    scorePercent,
    skippedCount,
}: {
    readiness: Readiness | Judgement | null;
    pace: Pace | null;
    scorePercent: number;
    skippedCount: number;
}) {
    if (!raw && !pace) return null;
    if (!raw) {
        return (
            <Card className="mb-4 p-5">
                <PaceRow pace={pace!} skippedCount={skippedCount} />
            </Card>
        );
    }

    const readiness = normalize(raw);
    const { passed, overall, subjects } = readiness;
    const criteria = [
        subjects.length > 0 && "ต้องผ่านทุกวิชา",
        overall && `เกณฑ์รวม ${overall.pass_percent}% (อย่างน้อย ${amount(overall, overall.required)})`,
    ].filter(Boolean).join(" · ");

    return (
        <Card className={cn("mb-4 p-5", passed ? "border-green-200 bg-green-50/40" : "border-red-100 bg-red-50/30")}>
            <p className="text-xs font-medium text-slate-500 mb-3">ถ้าสอบวันนี้</p>
            <div className="flex items-start gap-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                    {passed ? <CheckCircle2 size={20} /> : <Target size={20} />}
                </span>
                <div className="min-w-0">
                    <p className={cn("text-lg font-semibold", passed ? "text-green-700" : "text-red-600")}>{headline(readiness)}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {criteria} · ครั้งนี้ได้ {Math.round(scorePercent)}%
                    </p>
                </div>
            </div>

            {overall && <ThresholdBar percent={scorePercent} passAt={overall.pass_percent} passed={overall.passed} />}

            {subjects.length > 0 && (
                <ul className={cn("flex flex-col gap-4", overall ? "border-t border-slate-200/70 pt-4" : "mt-5")}>
                    {subjects.map((s) => (
                        <li key={s.tpc_id}>
                            {/* ชื่อวิชาห้ามตัดทิ้ง (ชื่อ ก.พ. ยาวมาก) — ให้ขึ้นบรรทัดใหม่ ตัวเลขชิดขวาเสมอ */}
                            <div className="flex items-start justify-between gap-3 text-sm">
                                <span className="min-w-0 text-slate-700 leading-snug">{s.tpc_name}</span>
                                <span className={cn("shrink-0 text-xs font-medium", s.passed ? "text-green-700" : "text-red-600")}>
                                    {s.passed ? "ผ่าน" : `ขาด ${amount(s, s.gap)}`}
                                </span>
                            </div>
                            <ThresholdBar percent={s.percent} passAt={s.pass_percent} passed={s.passed} compact />
                            <p className="mt-1 text-xs tabular-nums text-slate-400">
                                ได้ <span className="font-medium text-slate-700">{s.percent}%</span> · เกณฑ์ {s.pass_percent}%
                            </p>
                        </li>
                    ))}
                </ul>
            )}

            {pace && (
                <div className={cn("border-t border-slate-200/70 pt-4", subjects.length > 0 && "mt-5")}>
                    <PaceRow pace={pace} skippedCount={skippedCount} />
                </div>
            )}
        </Card>
    );
}
