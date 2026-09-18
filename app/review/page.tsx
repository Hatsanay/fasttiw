import Link from "next/link";
import { CheckCircle2, ClipboardList, Hourglass, Play, Sparkles } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import ExamDateForm from "./ExamDateForm";

export const metadata = { title: "แผนทบทวนวันนี้" };

// แผนทบทวนรายวัน (2026-09-18) — ตอบคำถามเดียวว่า "วันนี้ควรทำอะไร"
// ข้อที่ยังตอบผิด = ต้องเคลียร์ · ข้อที่เคยแก้ได้แล้วจะถูกนัดกลับมาถามซ้ำโดยเว้นห่างขึ้นเรื่อยๆ (กันลืม)
type ReviewPlan = {
    exam_date: string | null;
    days_left: number | null;
    unresolved_count: number;
    scheduled_count: number;
    due_today: number;
    resting_count: number;
    done_today: number;
    daily_target: number;
};

const thaiDate = (iso: string) =>
    new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", {
        day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
    });

export default async function ReviewPlanPage() {
    const res = await authorizedFetch("/store/me/review-plan", { cache: "no-store" });
    const plan: ReviewPlan = res.ok
        ? await res.json()
        : { exam_date: null, days_left: null, unresolved_count: 0, scheduled_count: 0, due_today: 0, resting_count: 0, done_today: 0, daily_target: 0 };

    const target = Math.max(plan.daily_target, 0);
    const doneRatio = target > 0 ? Math.min(100, Math.round((plan.done_today / target) * 100)) : 0;
    const finishedForToday = plan.due_today === 0 || (target > 0 && plan.done_today >= target);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800">แผนทบทวนวันนี้</h1>
                <p className="mt-1 mb-6 text-sm text-slate-500">
                    ทบทวนเฉพาะข้อที่คุณเคยพลาด — ข้อที่แก้ได้แล้วจะกลับมาถามอีกเป็นระยะ เพื่อเช็กว่ายังจำได้จริง
                </p>

                {/* นับถอยหลัง + เป้าวันนี้ */}
                <Card className="mb-4 p-6">
                    {plan.exam_date && plan.days_left !== null && (
                        <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
                            <span className="text-sm text-slate-500">สอบวันที่ {thaiDate(plan.exam_date)}</span>
                            <span className="text-sm">
                                {plan.days_left > 0 ? (
                                    <>เหลืออีก <span className="text-lg font-semibold text-brand-600 tabular-nums">{plan.days_left}</span> วัน</>
                                ) : plan.days_left === 0 ? (
                                    <span className="font-medium text-brand-600">สอบวันนี้ — ขอให้โชคดี</span>
                                ) : (
                                    <span className="text-slate-400">ผ่านวันสอบมาแล้ว</span>
                                )}
                            </span>
                        </div>
                    )}

                    {finishedForToday ? (
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                                <CheckCircle2 size={22} />
                            </span>
                            <div>
                                <p className="text-lg font-semibold text-green-700">
                                    {plan.due_today === 0 ? "วันนี้ไม่มีข้อที่ต้องทบทวน" : "ทบทวนครบเป้าวันนี้แล้ว"}
                                </p>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    {plan.resting_count > 0
                                        ? `มี ${plan.resting_count} ข้อที่แก้ได้แล้วรอทวนซ้ำในวันถัดๆ ไป`
                                        : "ยังไม่มีข้อที่ต้องทบทวน — ทำข้อสอบเพิ่มแล้วข้อที่พลาดจะมาโผล่ที่นี่"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                <ClipboardList size={22} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-lg font-semibold text-slate-900">
                                    วันนี้ทบทวน {target} ข้อ
                                </p>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    {plan.days_left !== null && plan.days_left > 0
                                        ? `เท่านี้ทุกวันจะเคลียร์ข้อที่ยังผิดได้ทันก่อนสอบ`
                                        : `ทบทวนวันละนิดดีกว่ารวดเดียวก่อนสอบ`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ความคืบหน้าของวันนี้ */}
                    {target > 0 && (
                        <div className="mt-5">
                            <div className="mb-1.5 flex items-baseline justify-between text-xs text-slate-400 tabular-nums">
                                <span>ทบทวนแล้ววันนี้</span>
                                <span>{plan.done_today} / {target} ข้อ</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${doneRatio}%` }} />
                            </div>
                        </div>
                    )}

                    {plan.due_today > 0 && (
                        <div className="mt-5">
                            <Link href="/history/mistakes/practice?plan=1">
                                <Button className="w-full sm:w-auto">
                                    <Play size={16} />
                                    เริ่มทบทวน
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>

                {/* แยกให้เห็นว่ากองไหนคืออะไร — ตัวเลขรวมอย่างเดียวไม่บอกว่าควรโฟกัสอะไร */}
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <Card className="p-4">
                        <p className="text-2xl font-semibold text-red-500 tabular-nums">{plan.unresolved_count}</p>
                        <p className="mt-0.5 text-xs text-slate-500">ยังตอบผิดอยู่</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-2xl font-semibold text-amber-600 tabular-nums">{plan.scheduled_count}</p>
                        <p className="mt-0.5 text-xs text-slate-500">ถึงกำหนดทวนซ้ำวันนี้</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-2xl font-semibold text-slate-400 tabular-nums">{plan.resting_count}</p>
                        <p className="mt-0.5 text-xs text-slate-500">แก้ได้แล้ว รอทวนรอบหน้า</p>
                    </Card>
                </div>

                <Card className="mb-4 p-6">
                    <ExamDateForm examDate={plan.exam_date} />
                </Card>

                <Card className="p-5">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Sparkles size={15} className="text-brand-500" />
                        ระบบทวนซ้ำทำงานยังไง
                    </p>
                    <ul className="flex flex-col gap-1.5 text-sm text-slate-500">
                        <li className="flex items-start gap-2">
                            <Hourglass size={14} className="mt-1 shrink-0 text-slate-300" />
                            ตอบถูกครั้งแรก ข้อนั้นจะกลับมาถามอีกใน 1 วัน → 3 วัน → 7 วัน → 14 วัน → 30 วัน
                        </li>
                        <li className="flex items-start gap-2">
                            <Hourglass size={14} className="mt-1 shrink-0 text-slate-300" />
                            ตอบผิดเมื่อไหร่ ข้อนั้นกลับมาอยู่ในกอง &quot;ยังตอบผิดอยู่&quot; ทันที
                        </li>
                        <li className="flex items-start gap-2">
                            <Hourglass size={14} className="mt-1 shrink-0 text-slate-300" />
                            ผ่านครบทุกรอบแล้วถือว่าจำได้จริง จะไม่ถามอีกจนกว่าจะไปเจอในข้อสอบแล้วพลาดใหม่
                        </li>
                    </ul>
                    <Link href="/history/mistakes" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
                        ดูรายการข้อที่ต้องทบทวนทั้งหมด
                    </Link>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
