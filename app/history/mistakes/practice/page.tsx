import Link from "next/link";
import { ArrowLeft, PartyPopper } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import MistakePractice, { type PracticeQuestion } from "./MistakePractice";

export const metadata = { title: "ทำใหม่ข้อที่เคยผิด" };

// "ทำใหม่ 10 ข้อที่เคยผิด" (2026-09-15) — สุ่มใหม่ทุกครั้งที่เปิด (ข้อที่ผิดซ้ำบ่อยมาก่อน) ดูกติกาที่
// getMistakePractice ใน backend/src/controllers/attempt.controller.js
export default async function MistakePracticePage({
    searchParams,
}: {
    searchParams: Promise<{ product_id?: string; topic_id?: string; plan?: string }>;
}) {
    const sp = await searchParams;
    const filter = new URLSearchParams();
    if (sp.product_id) filter.set("product_id", sp.product_id);
    if (sp.topic_id) filter.set("topic_id", sp.topic_id);
    // โหมดแผนวันนี้ (2026-09-18): รวมข้อที่ถึงกำหนดทวนซ้ำเข้ามาด้วย ไม่ใช่เฉพาะข้อที่ยังตอบผิด
    const planMode = sp.plan === "1";
    if (planMode) filter.set("plan", "1");
    const backHref = planMode ? "/review" : `/history/mistakes${filter.size ? `?${filter}` : ""}`;

    const res = await authorizedFetch(`/store/me/mistakes/practice${filter.size ? `?${filter}` : ""}`, { cache: "no-store" });
    const { questions, remaining, locked }: { questions: PracticeQuestion[]; remaining: number; locked: number } =
        res.ok ? await res.json() : { questions: [], remaining: 0, locked: 0 };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
                <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={15} />
                    {planMode ? "กลับไปหน้าแผนทบทวน" : "กลับไปหน้าข้อที่ต้องทบทวน"}
                </Link>
                {questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                        <PartyPopper size={40} className="mb-3 text-brand-400" />
                        <p className="mb-1 font-medium text-slate-600">ไม่มีข้อที่ต้องทำใหม่แล้ว</p>
                        <p className="mb-5 text-sm">
                            {locked > 0
                                ? `ยังมีอีก ${locked} ข้อในชุดที่สิทธิ์หมดอายุแล้ว — ต่ออายุชุดนั้นเพื่อทำใหม่ได้`
                                : "ข้อที่เคยพลาดตอบถูกหมดแล้ว เยี่ยมมาก"}
                        </p>
                        <Link href="/history">
                            <Button variant="secondary">กลับไปหน้าประวัติ</Button>
                        </Link>
                    </div>
                ) : (
                    <MistakePractice questions={questions} remaining={remaining} backHref={backHref} />
                )}
            </main>
            <Footer />
        </div>
    );
}
