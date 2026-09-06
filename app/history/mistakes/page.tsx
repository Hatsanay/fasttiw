import Link from "next/link";
import { Check, X, PartyPopper, ArrowLeft, RotateCcw } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import BookmarkButton from "@/app/components/BookmarkButton";
import ReportQuestionButton from "@/app/components/ReportQuestionButton";
import QuestionImage from "@/app/components/QuestionImage";
import ChoiceImage from "@/app/components/ChoiceImage";
import { authorizedFetch } from "@/lib/session";
import { cn } from "@/lib/cn";

export const metadata = { title: "ข้อที่ต้องทบทวน" };

const PAGE_SIZE = 10;

type Choice = { cho_id: string; cho_text: string; cho_image_url: string | null; is_correct: boolean; wrong_reason: string | null };
type Mistake = {
    ques_id: string;
    ques_text: string;
    ques_explanation: string | null;
    ques_image_url: string | null;
    prod_id: string;
    prod_name: string;
    tpc_id: string | null;
    tpc_name: string | null;
    wrong_count: number;
    answered_count: number;
    /** ครั้งล่าสุดตอบถูกแล้ว = เคยพลาดแต่แก้ได้แล้ว */
    resolved: boolean;
    /** ตัวเลือกที่เลือกไปในครั้งล่าสุด — ใช้ไฮไลต์ให้เห็นว่า "พลาดตรงไหน" */
    latest_choice_id: string | null;
    is_bookmarked: boolean;
    choices: Choice[];
};

// หน้ารวมข้อที่เคยตอบผิด — เป็นจุดที่หน้าประวัติเปลี่ยนจาก "รายงานผล" เป็น "เครื่องมือฝึก"
// ตรงกับจุดขายหลักของธุรกิจตาม ../CLAUDE.md ข้อ 4 (เฉลยที่อธิบายวิธีคิด ไม่ใช่แค่บอกว่าข้อไหนถูก)
export default async function MistakesPage({
    searchParams,
}: {
    searchParams: Promise<{ product_id?: string; topic_id?: string; all?: string; page?: string }>;
}) {
    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page) || 1);
    const includeResolved = sp.all === "1";

    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (sp.product_id) query.set("product_id", sp.product_id);
    if (sp.topic_id) query.set("topic_id", sp.topic_id);
    if (includeResolved) query.set("include_resolved", "1");

    const res = await authorizedFetch(`/store/me/mistakes?${query}`);
    const { data, total }: { data: Mistake[]; total: number } = res.ok ? await res.json() : { data: [], total: 0 };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const buildHref = (next: { all?: boolean; page?: number }) => {
        const q = new URLSearchParams();
        if (sp.product_id) q.set("product_id", sp.product_id);
        if (sp.topic_id) q.set("topic_id", sp.topic_id);
        if (next.all ?? includeResolved) q.set("all", "1");
        if (next.page && next.page > 1) q.set("page", String(next.page));
        const qs = q.toString();
        return qs ? `/history/mistakes?${qs}` : "/history/mistakes";
    };

    // ชื่อชุด/หมวดที่กรองอยู่ ดึงจากข้อมูลที่ได้มา ไม่ต้องยิง API เพิ่มเพื่อรู้แค่ชื่อ
    const filterLabel = sp.topic_id
        ? data[0]?.tpc_name
        : sp.product_id
          ? data[0]?.prod_name
          : null;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <Link href="/history" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={15} />
                    กลับไปหน้าประวัติ
                </Link>

                <h1 className="text-2xl font-semibold text-slate-800">ข้อที่ต้องทบทวน</h1>
                <p className="mt-1 text-sm text-slate-400">
                    {filterLabel ? `เฉพาะ ${filterLabel} · ` : ""}
                    {includeResolved ? `เคยตอบผิด ${total} ข้อ` : `ยังตอบผิดอยู่ ${total} ข้อ`}
                </p>

                {/* สลับดู "ข้อที่แก้ได้แล้ว" — ข้อที่เคยผิดแต่ครั้งล่าสุดตอบถูก เป็นหลักฐานว่าพัฒนาขึ้นจริง
                    แต่ไม่ควรอยู่ในลิสต์หลักเพราะไม่ใช่สิ่งที่ต้องลงมือทบทวนแล้ว */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                    <Link
                        href={buildHref({ all: false, page: 1 })}
                        className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            !includeResolved ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                    >
                        ยังตอบผิดอยู่
                    </Link>
                    <Link
                        href={buildHref({ all: true, page: 1 })}
                        className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            includeResolved ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                    >
                        รวมข้อที่แก้ได้แล้ว
                    </Link>
                </div>

                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                        <PartyPopper size={40} className="mb-3 text-brand-400" />
                        <p className="mb-1 font-medium text-slate-600">ไม่มีข้อที่ต้องทบทวน</p>
                        <p className="mb-5 text-sm">
                            {sp.product_id || sp.topic_id ? "ในส่วนที่เลือกไว้ตอบถูกหมดแล้ว" : "ตอบถูกหมดทุกข้อที่เคยทำ"}
                        </p>
                        <Link href="/history">
                            <Button variant="secondary">กลับไปหน้าประวัติ</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="mt-6 flex flex-col gap-6">
                        {data.map((m) => (
                            <Card key={m.ques_id} className="p-5">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-brand-600">{m.prod_name}</span>
                                    {m.tpc_name && <Badge tone="neutral" className="text-[11px]">{m.tpc_name}</Badge>}
                                    {/* ผิดกี่ครั้งจากที่ทำกี่ครั้ง — "ผิด 1 จาก 1" กับ "ผิด 3 จาก 5" คนละความหมายกัน */}
                                    <span className={cn("text-[11px]", m.wrong_count > 1 ? "font-medium text-red-500" : "text-slate-400")}>
                                        ตอบผิด {m.wrong_count} จาก {m.answered_count} ครั้ง
                                    </span>
                                    {m.resolved && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                            <Check size={11} /> ครั้งล่าสุดตอบถูกแล้ว
                                        </span>
                                    )}
                                </div>

                                <QuestionImage src={m.ques_image_url} />
                                <h2 className="mb-4 font-medium leading-relaxed text-slate-900 whitespace-pre-line">{m.ques_text}</h2>

                                <div className="mb-4 flex flex-col gap-2">
                                    {m.choices.map((c) => {
                                        // ไฮไลต์ตัวที่เลือกไปครั้งล่าสุดถ้ามันผิด — เห็นชัดว่า "เราพลาดตรงไหน"
                                        // ไม่ใช่แค่รู้ว่าข้อไหนถูก ซึ่งเป็นหัวใจของการทบทวน
                                        const pickedWrong = m.latest_choice_id === c.cho_id && !c.is_correct;
                                        return (
                                            <div key={c.cho_id}>
                                                <div
                                                    className={cn(
                                                        "flex items-start justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-sm",
                                                        c.is_correct
                                                            ? "border-green-300 bg-green-50"
                                                            : pickedWrong
                                                              ? "border-red-200 bg-red-50"
                                                              : "border-slate-100 text-slate-500"
                                                    )}
                                                >
                                                    <span className="flex-1">
                                                        <ChoiceImage src={c.cho_image_url} />
                                                        {c.cho_text}
                                                        {pickedWrong && <span className="ml-2 text-xs text-red-500">(ที่คุณเลือก)</span>}
                                                    </span>
                                                    {c.is_correct && <Check size={15} className="shrink-0 text-green-600" />}
                                                    {pickedWrong && <X size={15} className="shrink-0 text-red-500" />}
                                                </div>
                                                {!c.is_correct && c.wrong_reason && (
                                                    <p className="mt-1 px-1 text-xs text-slate-400">{c.wrong_reason}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {m.ques_explanation && (
                                    <div className="mb-3 rounded-lg border border-brand-100 bg-brand-50/60 p-3.5">
                                        <p className="mb-1 text-xs font-medium text-brand-700">วิธีคิด</p>
                                        <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{m.ques_explanation}</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <BookmarkButton questionId={m.ques_id} initialBookmarked={m.is_bookmarked} />
                                    <ReportQuestionButton questionId={m.ques_id} />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-3">
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

                {data.length > 0 && sp.product_id && (
                    <div className="mt-8 flex justify-center">
                        <Link href={`/exam/${sp.product_id}`}>
                            <Button variant="secondary" className="inline-flex items-center gap-1.5">
                                <RotateCcw size={15} />
                                ทำชุดนี้อีกครั้ง
                            </Button>
                        </Link>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
