import Link from "next/link";
import { History, Timer, BookOpen, TriangleAlert, ListChecks, ChevronRight } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import { cn } from "@/lib/cn";
import { hasScoring, formatScore } from "@/lib/scoring";

export const metadata = { title: "ประวัติการทำข้อสอบ" };

const PAGE_SIZE = 20;

type Attempt = {
    att_id: string;
    att_product_id: string;
    prod_name: string;
    att_mode: "practice" | "timed";
    att_status: "in_progress" | "submitted" | "abandoned";
    att_score: string | null;
    // ครั้งที่เท่าไรของชุดนี้ + คะแนนครั้งก่อนของชุดเดียวกัน (backend คิดจากข้อมูลทั้งหมดก่อนตัดหน้า)
    attempt_no: number;
    prev_score: string | null;
    att_time_limit_minutes: number | null;
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

type Summary = {
    submitted_count: number;
    avg_score: number | null;
    latest_score: number | null;
};

// เวลาที่ใช้ทำจริง — มีข้อมูลอยู่แล้วทั้งเวลาเริ่มและเวลาส่ง แต่เดิมไม่เคยเอามาแสดง
// ทั้งที่การคุมเวลาเป็นทักษะสอบโดยตรง โดยเฉพาะโหมดจับเวลา
function formatDuration(startedAt: string, submittedAt: string | null): string | null {
    if (!submittedAt) return null;
    const minutes = Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 60000);
    if (minutes < 1) return "ไม่ถึง 1 นาที";
    if (minutes < 60) return `${minutes} นาที`;
    return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
}

// สรุปแยกรายชุดข้อสอบ — ตอบว่า "ควรกลับไปซ้อมชุดไหน" (ต่างจากสรุปภาพรวมที่รวมทุกชุดเป็นก้อนเดียว
// และต่างจากจุดอ่อนรายหมวดที่ตัดข้ามชุด)
type ProductSummary = {
    att_product_id: string;
    prod_name: string;
    attempts: number;
    best_score: number | null;
    avg_score: number | null;
    latest_score: number | null;
    last_attempt_at: string;
    // สองค่านี้เป็น null ถ้าชุดนั้นไม่ใช้ระบบคะแนน
    best_earned_score: number | null;
    max_score: number | null;
    // หมวดที่ควรทบทวน "ของชุดนี้" เรียงหมวดที่แม่นน้อยสุดขึ้นก่อน
    weak_topics: WeakArea[];
    // จำนวนข้อที่เคยตอบผิดและครั้งล่าสุดยังผิดอยู่ — กดเข้าไปดูเฉลยรายข้อได้ที่ /history/mistakes
    mistake_count: number;
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
    const sp = await searchParams;
    const status = ["submitted", "in_progress", "abandoned"].includes(sp.status ?? "") ? sp.status! : "";
    const page = Math.max(1, Number(sp.page) || 1);

    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (status) query.set("status", status);

    const [attemptsRes, productSummaryRes] = await Promise.all([
        authorizedFetch(`/store/attempts?${query}`),
        authorizedFetch("/store/attempts/summary"),
    ]);
    const {
        data: attempts,
        total,
        summary,
    }: { data: Attempt[]; total: number; summary: Summary } = attemptsRes.ok
        ? await attemptsRes.json()
        : { data: [], total: 0, summary: { submitted_count: 0, avg_score: null, latest_score: null } };
    const { data: productSummary }: { data: ProductSummary[] } = productSummaryRes.ok
        ? await productSummaryRes.json()
        : { data: [] };

    // ผลรวมข้อที่ต้องทบทวน — บวกจาก productSummary ที่ดึงมาแล้ว ไม่ต้องยิง API เพิ่มเพื่อนับซ้ำ
    const totalMistakes = productSummary.reduce((sum, ps) => sum + ps.mistake_count, 0);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const buildHref = (next: { status?: string; page?: number }) => {
        const q = new URLSearchParams();
        const s = next.status ?? status;
        if (s) q.set("status", s);
        if (next.page && next.page > 1) q.set("page", String(next.page));
        const qs = q.toString();
        return qs ? `/history?${qs}` : "/history";
    };

    const FILTERS = [
        { value: "", label: "ทั้งหมด" },
        { value: "submitted", label: "ทำเสร็จแล้ว" },
        { value: "in_progress", label: "ทำค้างไว้" },
        { value: "abandoned", label: "ยกเลิก" },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-6">ประวัติการทำข้อสอบ</h1>

                {/* สรุปภาพรวม — คิดจาก attempt ที่ส่งคำตอบแล้วทั้งหมด ไม่ใช่เฉพาะหน้าที่เปิดอยู่
                    เดิมต้องไล่อ่านทีละใบเองถึงจะรู้ว่าเฉลี่ยเท่าไร ดีขึ้นหรือแย่ลง */}
                {summary.submitted_count > 0 && (
                    <Card className="p-5 mb-6 grid grid-cols-3 divide-x divide-slate-100">
                        <div className="text-center">
                            <p className="text-xl font-semibold text-slate-800">{summary.submitted_count}</p>
                            <p className="text-xs text-slate-400 mt-0.5">ครั้งที่ทำเสร็จ</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold text-slate-800">{summary.avg_score?.toFixed(0) ?? "—"}%</p>
                            <p className="text-xs text-slate-400 mt-0.5">คะแนนเฉลี่ย</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold text-brand-600">{summary.latest_score?.toFixed(0) ?? "—"}%</p>
                            <p className="text-xs text-slate-400 mt-0.5">ครั้งล่าสุด</p>
                        </div>
                    </Card>
                )}

                {/* ทางเข้าหลักไปหน้าทบทวน — วางไว้บนสุดถัดจากสรุปโดยตั้งใจ เพราะเป็น "สิ่งที่ควรทำต่อ"
                    เพียงอย่างเดียวของหน้านี้ ตัวเลขอื่นทั้งหมดเป็นการรายงานผลย้อนหลัง */}
                {totalMistakes > 0 && (
                    <Link href="/history/mistakes" className="mb-8 block">
                        <Card className="flex items-center gap-4 p-5 transition-colors hover:border-brand-200">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <ListChecks size={20} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-medium text-slate-800">
                                    มี {totalMistakes} ข้อที่ควรกลับไปทบทวน
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-400">
                                    ข้อที่เคยตอบผิดและครั้งล่าสุดยังผิดอยู่ — ดูเฉลยพร้อมวิธีคิดรายข้อ
                                </span>
                            </span>
                            <ChevronRight size={18} className="shrink-0 text-slate-300" />
                        </Card>
                    </Link>
                )}

                {/* สรุป + จุดอ่อนรายชุด — แยกเป็นการ์ดละชุด เรียงชุดที่ทำล่าสุดขึ้นก่อน */}
                {productSummary.length > 0 && (
                    <section className="mb-8">
                        <h2 className="mb-3 text-sm font-semibold text-slate-500">สรุปรายชุดข้อสอบ</h2>

                        <div className="flex flex-col gap-3">
                            {productSummary.map((ps) => {
                                const scored = ps.max_score !== null && ps.max_score > 0;
                                // ล่าสุดต่ำกว่าดีที่สุดชัดเจน = ฟอร์มตก ควรเตือนให้กลับไปซ้อม
                                const droppedFromBest =
                                    ps.best_score !== null && ps.latest_score !== null && ps.best_score - ps.latest_score >= 5;
                                return (
                                    <Card key={ps.att_product_id} className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/exam/${ps.att_product_id}`}
                                                    className="block font-medium text-slate-800 hover:text-brand-600"
                                                >
                                                    {ps.prod_name}
                                                </Link>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    ทำไปแล้ว {ps.attempts} ครั้ง
                                                    {scored && ` · เต็ม ${formatScore(ps.max_score)} คะแนน`}
                                                </p>
                                            </div>
                                            <Link href={`/exam/${ps.att_product_id}`} className="shrink-0">
                                                <Button size="sm" variant="secondary">ทำอีกครั้ง</Button>
                                            </Link>
                                        </div>

                                        {/* ตัวเลขหลัก 3 ตัวเรียงเป็นแถวเดียว อ่านทีเดียวจบ ไม่ต้องกวาดตาหาตามมุม */}
                                        <div className="mt-4 flex items-center gap-6">
                                            <div>
                                                <p className="text-lg font-semibold text-slate-800">
                                                    {ps.best_score?.toFixed(0) ?? "—"}%
                                                </p>
                                                <p className="text-[11px] text-slate-400">ดีที่สุด</p>
                                            </div>
                                            <div>
                                                <p className={cn("text-lg font-semibold", droppedFromBest ? "text-amber-600" : "text-slate-800")}>
                                                    {ps.latest_score?.toFixed(0) ?? "—"}%
                                                </p>
                                                <p className="text-[11px] text-slate-400">ล่าสุด</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-semibold text-slate-400">
                                                    {ps.avg_score?.toFixed(0) ?? "—"}%
                                                </p>
                                                <p className="text-[11px] text-slate-400">เฉลี่ย</p>
                                            </div>
                                        </div>

                                        {droppedFromBest && (
                                            <p className="mt-2 text-xs text-amber-600">
                                                ครั้งล่าสุดต่ำกว่าที่เคยทำได้ ลองกลับมาซ้อมอีกรอบ
                                            </p>
                                        )}

                                        {/* จุดอ่อนของชุดนี้ — โชว์ 3 หมวดที่แม่นน้อยสุดพอ บางชุดมีเป็นสิบหมวด
                                            ถ้าโชว์หมดจะยาวจนกลบข้อมูลชุดอื่น */}
                                        {ps.weak_topics.length > 0 && (
                                            <div className="mt-4 border-t border-slate-100 pt-4">
                                                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                    <TriangleAlert size={13} className="text-amber-500" />
                                                    ควรทบทวนในชุดนี้
                                                </p>
                                                {/* แต่ละหมวดกดเข้าไปดูข้อที่ผิดของหมวดนั้นได้เลย — เดิมบอกแค่ว่า
                                                    "อ่อนอนุกรม 45%" แล้วจบ ผู้ใช้ต้องไปหาเองว่าผิดข้อไหน */}
                                                <div className="flex flex-col gap-2.5">
                                                    {ps.weak_topics.slice(0, 3).map((t) => (
                                                        <Link
                                                            key={t.tpc_id}
                                                            href={`/history/mistakes?product_id=${ps.att_product_id}&topic_id=${t.tpc_id}`}
                                                            className="group block"
                                                        >
                                                            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                                                                <span className="min-w-0 truncate text-slate-600 group-hover:text-brand-600">
                                                                    {t.tpc_name}
                                                                </span>
                                                                <span className="shrink-0 text-slate-400">
                                                                    <span className={cn("font-medium", t.accuracy < 50 ? "text-red-500" : "text-slate-600")}>
                                                                        {t.accuracy}%
                                                                    </span>
                                                                    {" · จาก "}{t.total} ข้อ
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                                <div
                                                                    className={cn("h-full rounded-full", t.accuracy < 50 ? "bg-red-400" : "bg-brand-500")}
                                                                    style={{ width: `${t.accuracy}%` }}
                                                                />
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                                {ps.weak_topics.length > 3 && (
                                                    <p className="mt-2 text-xs text-slate-400">และอีก {ps.weak_topics.length - 3} หมวด</p>
                                                )}
                                            </div>
                                        )}

                                        {/* ทางเข้าทบทวนเฉพาะชุดนี้ — แยกจากปุ่มบนสุดที่รวมทุกชุด เพราะคนที่มีหลายชุด
                                            มักอยากซ้อมทีละชุดตามที่จะสอบจริง ไม่ใช่ปนกันหมด */}
                                        {ps.mistake_count > 0 && (
                                            <Link
                                                href={`/history/mistakes?product_id=${ps.att_product_id}`}
                                                className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    <ListChecks size={14} />
                                                    ทบทวน {ps.mistake_count} ข้อที่ยังตอบผิด
                                                </span>
                                                <ChevronRight size={14} />
                                            </Link>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                )}

                <h2 className="mb-3 text-sm font-semibold text-slate-500">ประวัติทีละครั้ง</h2>

                {/* ตัวกรองสถานะ — ของจริงมี attempt ที่ยกเลิกมากกว่าที่ทำเสร็จเกือบเท่าตัว ถ้าปนกันหมด
                    หน้าจะดูเหมือนประวัติที่ล้มเหลวมากกว่าสำเร็จ */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {FILTERS.map((f) => (
                        <Link
                            key={f.value || "all"}
                            href={buildHref({ status: f.value, page: 1 })}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                status === f.value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                        >
                            {f.label}
                        </Link>
                    ))}
                </div>

                {attempts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <History size={40} className="mb-3" />
                        <p className="mb-4">{status ? "ไม่มีรายการในตัวกรองนี้" : "ยังไม่มีประวัติการทำข้อสอบ"}</p>
                        <Link href={status ? "/history" : "/library"}>
                            <Button variant="secondary">{status ? "ดูทั้งหมด" : "ไปที่คลังข้อสอบของฉัน"}</Button>
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
                                        {a.attempt_no > 1 && (
                                            <>
                                                <span className="text-xs text-slate-300">•</span>
                                                <span className="text-xs text-slate-400">ครั้งที่ {a.attempt_no}</span>
                                            </>
                                        )}
                                    </div>
                                    {(() => {
                                        const duration = formatDuration(a.att_started_at, a.att_submitted_at);
                                        if (!duration) return null;
                                        return (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                ใช้เวลา {duration}
                                                {a.att_time_limit_minutes ? ` จาก ${a.att_time_limit_minutes} นาที` : ""}
                                            </p>
                                        );
                                    })()}
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
                                        {/* เทียบกับครั้งก่อนของ "ชุดเดียวกัน" — ข้อมูลจริงมีการทำซ้ำชุดเดิมเยอะ
                                            แต่เดิมหน้านี้ไม่บอกเลยว่าพัฒนาขึ้นหรือไม่ ซึ่งเป็นสิ่งที่คนซ้อมอยากรู้ที่สุด */}
                                        {(() => {
                                            if (a.prev_score === null || a.att_score === null) return null;
                                            const diff = Math.round(Number(a.att_score) - Number(a.prev_score));
                                            if (diff === 0) return <Badge tone="neutral" className="shrink-0">เท่าเดิม</Badge>;
                                            return (
                                                <span
                                                    className={cn(
                                                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                                                        diff > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                                                    )}
                                                >
                                                    {diff > 0 ? `ดีขึ้น +${diff}%` : `ลดลง ${diff}%`}
                                                </span>
                                            );
                                        })()}
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

                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                        {page > 1 ? (
                            <Link href={buildHref({ page: page - 1 })}>
                                <Button size="sm" variant="secondary">ก่อนหน้า</Button>
                            </Link>
                        ) : (
                            <span />
                        )}
                        <span className="text-sm text-slate-400">หน้า {page} / {totalPages}</span>
                        {page < totalPages ? (
                            <Link href={buildHref({ page: page + 1 })}>
                                <Button size="sm" variant="secondary">ถัดไป</Button>
                            </Link>
                        ) : (
                            <span />
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
