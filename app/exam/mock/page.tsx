import Link from "next/link";
import { ArrowLeft, Clock, ListChecks, Timer, TriangleAlert } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import StartMockExamButton from "./StartMockExamButton";

export const metadata = { title: "สนามสอบเสมือนจริง" };

type Section = {
    tpc_id: string;
    tpc_name: string;
    question_count: number;
    // ทำได้จริงกี่ข้อด้วยสิทธิ์ที่ลูกค้ามีตอนนี้ (น้อยกว่าโควตาได้ถ้ายังมีชุดไม่ครบ)
    usable: number;
    pass_percent: number | null;
    pass_min: number | null;
};
type MockExam = {
    me_id: string;
    me_name: string;
    me_description: string | null;
    me_time_limit_minutes: number;
    me_pass_percent: number | null;
    me_pass_min: number | null;
    me_category_name: string | null;
    sections: Section[];
    planned_questions: number;
    usable_questions: number;
    can_start: boolean;
    in_progress_attempt_id: string | null;
};

const criterionText = (percent: number | null, min: number | null) =>
    percent != null ? `ผ่าน ${percent}%` : min != null ? `ผ่าน ${min} ข้อ` : null;

export default async function MockExamListPage() {
    const res = await authorizedFetch("/store/mock-exams", { cache: "no-store" });
    const { data: exams }: { data: MockExam[] } = res.ok ? await res.json() : { data: [] };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
                <Link href="/library" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={15} />
                    กลับไปคลังข้อสอบ
                </Link>
                <h1 className="text-2xl font-semibold text-slate-800">สนามสอบเสมือนจริง</h1>
                <p className="mt-1 mb-8 text-sm text-slate-500">
                    ซ้อมทั้งสนามในรอบเดียวตามโครงสร้างจริง จับเวลา ตัดผ่านรายวิชา — ข้อสุ่มใหม่ทุกครั้งจากทุกชุดที่คุณมีสิทธิ์
                </p>

                {exams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                        <Timer size={40} className="mb-3" />
                        <p className="mb-1 font-medium text-slate-600">ยังไม่มีสนามสอบให้ทำตอนนี้</p>
                        <p className="mb-5 text-sm">เมื่อเปิดสนามสอบแล้วจะแสดงที่หน้านี้</p>
                        <Link href="/library">
                            <Button variant="secondary">กลับไปคลังข้อสอบ</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {exams.map((exam) => {
                            const overall = criterionText(exam.me_pass_percent, exam.me_pass_min);
                            const short = exam.usable_questions < exam.planned_questions;
                            return (
                                <Card key={exam.me_id} className="p-6">
                                    <div className="mb-4">
                                        {exam.me_category_name && (
                                            <span className="mb-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                                {exam.me_category_name}
                                            </span>
                                        )}
                                        <h2 className="text-lg font-semibold text-slate-900">{exam.me_name}</h2>
                                        {exam.me_description && (
                                            <p className="mt-1 text-sm text-slate-500 whitespace-pre-line">{exam.me_description}</p>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock size={13} /> {exam.me_time_limit_minutes} นาที
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <ListChecks size={13} /> {exam.planned_questions} ข้อ
                                            </span>
                                            {overall && <span>เกณฑ์รวม {overall.replace("ผ่าน ", "")}</span>}
                                            <span>ต้องผ่านทุกวิชา</span>
                                        </div>
                                    </div>

                                    {/* โครงสร้างข้อสอบ — คนเตรียมสอบเทียบกับประกาศของสนามจริงได้ทันที */}
                                    <ul className="mb-4 flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
                                        {exam.sections.map((s) => {
                                            const rule = criterionText(s.pass_percent, s.pass_min);
                                            return (
                                                <li key={s.tpc_id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                                                    <span className="min-w-0 text-slate-700">{s.tpc_name}</span>
                                                    <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                                                        {s.question_count} ข้อ
                                                        {rule && <span className="text-slate-500"> · {rule}</span>}
                                                        {s.usable < s.question_count && (
                                                            <span className="text-amber-600"> · มีให้ทำ {s.usable} ข้อ</span>
                                                        )}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    {/* บอกตรงๆ ว่าด้วยสิทธิ์ที่มีตอนนี้ ซ้อมได้ไม่ครบโครงสร้าง ดีกว่าให้ไปเจอตอนเริ่มสอบ */}
                                    {short && exam.can_start && (
                                        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                                            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                                            <span>
                                                ด้วยชุดข้อสอบที่คุณมีตอนนี้ ทำได้ {exam.usable_questions} จาก {exam.planned_questions} ข้อ —
                                                ซื้อชุดเพิ่มในวิชาที่ยังขาด แล้วสนามสอบนี้จะครบตามโครงสร้างจริง
                                            </span>
                                        </p>
                                    )}

                                    {exam.can_start ? (
                                        <StartMockExamButton examId={exam.me_id} resumeAttemptId={exam.in_progress_attempt_id} />
                                    ) : (
                                        <div>
                                            <p className="mb-3 text-sm text-slate-500">
                                                คุณยังไม่มีชุดข้อสอบในวิชาของสนามสอบนี้ จึงยังไม่มีข้อให้สุ่ม
                                            </p>
                                            <Link href="/products">
                                                <Button variant="secondary">เลือกดูแนวข้อสอบ</Button>
                                            </Link>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
