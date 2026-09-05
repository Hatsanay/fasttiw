import Link from "next/link";
import { History, Timer, BookOpen, TriangleAlert } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import { cn } from "@/lib/cn";
import { hasScoring, formatScore } from "@/lib/scoring";

export const metadata = { title: "ประวัติการทำข้อสอบ" };

type Attempt = {
    att_id: string;
    att_product_id: string;
    prod_name: string;
    att_mode: "practice" | "timed";
    att_status: "in_progress" | "submitted" | "abandoned";
    att_score: string | null;
    // สองค่านี้เป็น null ถ้าชุดข้อสอบนั้นไม่ใช้ระบบคะแนน (คิดผลเป็น % จากจำนวนข้อเหมือนเดิม)
    att_earned_score: string | null;
    att_max_score: string | null;
    att_total_questions: number;
    att_started_at: string;
    att_submitted_at: string | null;
};

// accuracy คิดจาก earned/possible (คะแนน) เสมอ — คำตอบจากชุดที่ไม่ใช้ระบบคะแนนนับเป็นข้อละ 1 คะแนน
// ผลจึงเท่ากับการนับจำนวนข้อแบบเดิมเป๊ะ scored บอกว่าหมวดนี้มีคำตอบจากชุดที่ใช้ระบบคะแนนปนอยู่ไหม
type WeakArea = {
    tpc_id: string; tpc_name: string;
    correct: number; total: number;
    earned: number; possible: number; scored: boolean;
    accuracy: number;
};

export default async function HistoryPage() {
    const [attemptsRes, weakAreasRes] = await Promise.all([
        authorizedFetch("/store/attempts"),
        authorizedFetch("/store/me/weak-areas"),
    ]);
    const { data: attempts }: { data: Attempt[] } = attemptsRes.ok ? await attemptsRes.json() : { data: [] };
    const { data: weakAreas }: { data: WeakArea[] } = weakAreasRes.ok ? await weakAreasRes.json() : { data: [] };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-8">ประวัติการทำข้อสอบ</h1>

                {weakAreas.length > 0 && (
                    <Card className="p-5 mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                <TriangleAlert size={16} />
                            </span>
                            <h2 className="font-medium text-slate-800">จุดอ่อนที่ควรทบทวน</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            {weakAreas.map((w) => (
                                <div key={w.tpc_id}>
                                    <div className="flex items-center justify-between mb-1 text-sm">
                                        <span className="text-slate-700">{w.tpc_name}</span>
                                        <span className={cn("font-medium", w.accuracy < 50 ? "text-red-500" : "text-slate-500")}>
                                            {w.accuracy}% ({formatScore(w.scored ? w.earned : w.correct)}/
                                            {formatScore(w.scored ? w.possible : w.total)} {w.scored ? "คะแนน" : "ข้อ"})
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", w.accuracy < 50 ? "bg-red-400" : "bg-brand-500")}
                                            style={{ width: `${w.accuracy}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {attempts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <History size={40} className="mb-3" />
                        <p className="mb-4">ยังไม่มีประวัติการทำข้อสอบ</p>
                        <Link href="/library">
                            <Button variant="secondary">ไปที่คลังข้อสอบของฉัน</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {attempts.map((a) => (
                            <Card key={a.att_id} className="p-4 flex items-center gap-4">
                                <span
                                    className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                        a.att_mode === "timed" ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"
                                    )}
                                >
                                    {a.att_mode === "timed" ? <Timer size={18} /> : <BookOpen size={18} />}
                                </span>

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 truncate">{a.prod_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-slate-400">
                                            {a.att_mode === "timed" ? "โหมดจับเวลา" : "โหมดฝึก"}
                                        </span>
                                        <span className="text-xs text-slate-300">•</span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(a.att_started_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                </div>

                                {a.att_status === "submitted" && (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            {/* ชุดที่ใช้ระบบคะแนนโชว์คะแนนดิบเป็นตัวหลัก (สื่อความหมายกว่า %)
                                                แล้วยก % ไปเป็นบรรทัดรอง — ชุดที่ไม่ใช้ระบบคะแนนแสดงเหมือนเดิมทุกอย่าง */}
                                            {hasScoring(a.att_max_score) ? (
                                                <>
                                                    <p className="text-lg font-semibold text-brand-600">
                                                        {formatScore(a.att_earned_score)}
                                                        <span className="text-sm text-slate-400">/{formatScore(a.att_max_score)}</span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {Number(a.att_score).toFixed(0)}% · {a.att_total_questions} ข้อ
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-lg font-semibold text-brand-600">{Number(a.att_score).toFixed(0)}%</p>
                                                    <p className="text-[11px] text-slate-400">{a.att_total_questions} ข้อ</p>
                                                </>
                                            )}
                                        </div>
                                        <Link href={`/exam/attempts/${a.att_id}/review`}>
                                            <Button size="sm" variant="secondary">ดูเฉลย</Button>
                                        </Link>
                                    </div>
                                )}
                                {a.att_status === "in_progress" && (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge tone="neutral">ทำค้างไว้</Badge>
                                        <Link href={`/exam/attempts/${a.att_id}`}>
                                            <Button size="sm">ทำต่อ</Button>
                                        </Link>
                                    </div>
                                )}
                                {a.att_status === "abandoned" && (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge tone="neutral" className="text-slate-400">ยกเลิกแล้ว</Badge>
                                        <Link href={`/exam/${a.att_product_id}`}>
                                            <Button size="sm" variant="secondary">เริ่มใหม่</Button>
                                        </Link>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
