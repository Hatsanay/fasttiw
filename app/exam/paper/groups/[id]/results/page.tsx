import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Crown, Users, XCircle } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { authorizedFetch } from "@/lib/session";
import { featuresEnabledNow } from "@/lib/featureFlags";
import type { GroupResults } from "@/lib/paper/groups";
import DownloadButton from "../../../DownloadButton";

// ผลสอบของกลุ่ม (ผู้จัดเท่านั้น — CLAUDE.md ข้อ 6.9.1 เฟส 4)
// **เรียงตามชื่อ ไม่มีอันดับ** (CLAUDE.md ข้อ 5 ไม่ทำ leaderboard) — ห้ามเพิ่มเลขอันดับ/ปุ่มเรียงตามคะแนน
// สมาชิกยอมรับตอนเข้ากลุ่มแล้วว่าผู้จัดจะเห็นชื่อและคะแนน · ไม่มีรายข้อ/เฉลยของใคร (ผู้จัดเปิดหน้าเฉลยของสมาชิกไม่ได้)
export const metadata = { title: "ผลสอบของกลุ่ม", robots: { index: false } };

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
    });
}

function barTone(percent: number) {
    return percent >= 70 ? "bg-green-500" : percent >= 50 ? "bg-amber-400" : "bg-red-400";
}

export default async function GroupResultsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ round?: string }>;
}) {
    const [paperOn, groupOn] = await featuresEnabledNow("paper_exam", "paper_group_exam");
    if (!paperOn || !groupOn) notFound();
    const [{ id }, { round }] = await Promise.all([params, searchParams]);
    if (!/^[A-Za-z0-9-]{1,40}$/.test(id)) notFound();
    const qs = round && /^\d{1,5}$/.test(round) ? `?round=${round}` : "";
    const res = await authorizedFetch(`/store/paper-groups/${encodeURIComponent(id)}/results${qs}`);
    if (res.status === 404) notFound();
    const body = await res.json().catch(() => ({}));
    const data: GroupResults | null = res.ok ? body : null;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <Link href={`/exam/paper/groups/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
                    <ArrowLeft size={15} />
                    กลับหน้ากลุ่ม
                </Link>
                {!data ? (
                    <Card className="mt-4 p-8 text-center">
                        <p className="text-sm text-slate-600">{body.message ?? "เปิดผลสอบของกลุ่มไม่ได้ กรุณาลองใหม่"}</p>
                    </Card>
                ) : (
                    <ResultsView id={id} data={data} />
                )}
            </main>
            <Footer />
        </div>
    );
}

function ResultsView({ id, data }: { id: string; data: GroupResults }) {
    const { summary } = data;
    const topicName = new Map(data.topics.map((t) => [t.tpc_id, t.tpc_name]));
    return (
        <>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">ผลสอบของกลุ่ม</h1>
            <p className="mt-1 text-sm text-slate-500">
                {data.title} · {data.prod_name}
            </p>

            {data.rounds.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2" data-testid="round-picker">
                    {data.rounds.map((r) => (
                        <Link
                            key={r.round}
                            href={`/exam/paper/groups/${id}/results${r.round === data.current_round ? "" : `?round=${r.round}`}`}
                            className={cn(
                                "rounded-full border px-3 py-1 text-sm",
                                r.round === data.round ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600 hover:border-brand-300"
                            )}
                        >
                            {`รอบที่ ${r.round}${r.round === data.current_round ? " (ล่าสุด)" : ""}`}
                        </Link>
                    ))}
                </div>
            )}

            <div className={cn("mt-5 grid gap-3", data.has_criterion ? "grid-cols-3" : "grid-cols-2")}>
                <Card className="p-4">
                    <p className="text-xs text-slate-500">ตรวจแล้ว</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">
                        {summary.graded}
                        <span className="text-sm font-normal text-slate-500"> / {summary.members} คน</span>
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-slate-500">คะแนนเฉลี่ย</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{summary.average_score != null ? `${summary.average_score}%` : "-"}</p>
                </Card>
                {data.has_criterion && (
                    <Card className="p-4">
                        <p className="text-xs text-slate-500">ผ่านเกณฑ์</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                            {summary.passed ?? 0}
                            <span className="text-sm font-normal text-slate-500"> / {summary.graded} คน</span>
                        </p>
                    </Card>
                )}
            </div>

            <div className="mt-4">
                <DownloadButton
                    href={`/api/paper-group-print/${id}/results${data.round === data.current_round ? "" : `?round=${data.round}`}`}
                    fileName={`fasttiw-group-${id}-r${data.round}-results.xlsx`}
                    label="ดาวน์โหลดเป็น Excel"
                />
            </div>

            {data.topics.length > 0 && (
                <Card className="mt-5 p-5">
                    <p className="flex items-center gap-2 font-medium text-slate-800">
                        <BarChart3 size={17} className="text-brand-600" />
                        ผลรายหมวดของทั้งกลุ่ม
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">หมวดที่ทำได้น้อยที่สุดอยู่บนสุด — ใช้เลือกเรื่องที่ควรติวเพิ่ม</p>
                    <ul className="mt-4 space-y-3">
                        {data.topics.map((t) => (
                            <li key={t.tpc_id}>
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="min-w-0 truncate text-slate-700">{t.tpc_name}</span>
                                    <span className="w-12 shrink-0 text-right font-medium text-slate-800">{t.accuracy}%</span>
                                </div>
                                <div className="mt-1 h-2 rounded-full bg-slate-100">
                                    <div className={cn("h-2 rounded-full", barTone(t.accuracy))} style={{ width: `${t.accuracy}%` }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Card className="mt-5 p-5">
                <p className="flex items-center gap-2 font-medium text-slate-800">
                    <Users size={17} className="text-brand-600" />
                    ผลรายคน
                </p>
                <p className="mt-0.5 text-xs text-slate-500">เรียงตามชื่อ ไม่จัดอันดับ · เห็นเฉพาะสมาชิกที่ยังอยู่ในกลุ่ม</p>
                <ul className="mt-3 divide-y divide-slate-100" data-testid="member-results">
                    {data.members.map((m) => {
                        const r = m.result;
                        return (
                            <li key={m.customer_id} className="py-3" data-testid="member-result">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                            <span className="truncate">{m.name}</span>
                                            {m.is_owner && <Crown size={13} className="shrink-0 text-amber-500" aria-label="ผู้จัด" />}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {m.form ? (
                                                <>
                                                    {m.form.variant && `ชุด ${m.form.variant} · `}
                                                    {m.form.code}
                                                    {r && ` · ตรวจ ${formatDateTime(r.graded_at)}`}
                                                </>
                                            ) : (
                                                "ยังไม่มีใบสอบของรอบนี้"
                                            )}
                                        </p>
                                    </div>
                                    {r ? (
                                        <div className="shrink-0 text-right">
                                            <p className="text-lg font-semibold text-slate-900">{r.score}%</p>
                                            <p className="text-xs text-slate-500">
                                                {r.max != null ? `${r.earned}/${r.max} คะแนน` : `ถูก ${r.correct}/${r.total} ข้อ`}
                                            </p>
                                        </div>
                                    ) : (
                                        m.form && (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                                <Clock size={12} />
                                                รอตรวจ
                                            </span>
                                        )
                                    )}
                                </div>
                                {r && r.passed != null && (
                                    <p
                                        className={cn(
                                            "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                            r.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                        )}
                                    >
                                        {r.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                        {r.passed ? "ผ่านเกณฑ์" : "ยังไม่ผ่าน"}
                                        {!r.passed && r.failed_subjects.length > 0 && ` · ${r.failed_subjects.join(", ")}`}
                                    </p>
                                )}
                                {r && Object.keys(r.topics).length > 1 && (
                                    <details className="mt-1.5 text-xs">
                                        <summary className="cursor-pointer text-brand-600">ผลรายหมวด</summary>
                                        <ul className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                                            {Object.entries(r.topics)
                                                .sort(([a], [b]) => (topicName.get(a) ?? "").localeCompare(topicName.get(b) ?? "", "th"))
                                                .map(([tid, pct]) => (
                                                    <li key={tid} className="flex justify-between gap-2 text-slate-600">
                                                        <span className="truncate">{topicName.get(tid) ?? tid}</span>
                                                        <span className="shrink-0 font-medium">{pct}%</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    </details>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Card>
        </>
    );
}
