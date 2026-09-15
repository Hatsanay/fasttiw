import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenCheck, Target, Timer } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { getDiagnosticCategories } from "@/lib/diagnostic";

const title = "แบบทดสอบวัดระดับฟรี — รู้ใน 10 นาทีว่าอ่อนตรงไหน";
const description = "ทำแบบทดสอบวัดระดับสั้นๆ คละทุกหัวข้อ ดูผลรายหัวข้อ เฉลยละเอียดทุกข้อ และชุดแนวข้อสอบที่ตรงจุดอ่อนของคุณ ฟรี ไม่ต้องสมัครสมาชิก";

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: "/diagnostic" },
    openGraph: { title, description, url: "/diagnostic" },
    twitter: { card: "summary", title, description },
};

const GETS = [
    { icon: BarChart3, title: "ผลรายหัวข้อ", text: "เห็นทันทีว่าหัวข้อไหนแน่น หัวข้อไหนต้องเร่ง" },
    { icon: BookOpenCheck, title: "เฉลยละเอียดทุกข้อ", text: "วิธีคิดทีละขั้น และเหตุผลว่าทำไมตัวเลือกอื่นผิด" },
    { icon: Target, title: "ชุดที่ตรงจุดอ่อน", text: "แนะนำแนวข้อสอบที่มีข้อหัวข้อที่คุณอ่อนเยอะที่สุด" },
];

export default async function DiagnosticPage() {
    const categories = await getDiagnosticCategories();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-1">
                <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 text-center">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 mb-4">
                        <Timer size={13} />
                        ฟรี · ไม่ต้องสมัคร · ประมาณ 10 นาที
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 text-balance leading-tight">
                        รู้ใน 10 นาที ว่าคุณอ่อนตรงไหน
                    </h1>
                    <p className="mt-4 text-slate-600 leading-relaxed max-w-xl mx-auto text-pretty">
                        ทำแบบทดสอบวัดระดับสั้นๆ คละทุกหัวข้อ แล้วดูผลรายหัวข้อพร้อมเฉลยละเอียดทุกข้อ
                        จะได้รู้ว่าควรเริ่มอ่านจากตรงไหนก่อน
                    </p>
                </section>

                <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
                    <h2 className="text-sm font-medium text-slate-500 mb-3">เลือกสนามสอบที่กำลังเตรียมตัว</h2>
                    {categories.length === 0 ? (
                        <Card className="p-8 text-center text-sm text-slate-500">
                            ยังไม่มีแบบทดสอบวัดระดับให้ทำในตอนนี้ —{" "}
                            <Link href="/products" className="text-brand-600 font-medium hover:underline">ดูแนวข้อสอบทั้งหมด</Link>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {categories.map((c) => (
                                <Link key={c.cat_id} href={`/diagnostic/${c.cat_id}`} className="group">
                                    <Card className="p-5 h-full flex items-center justify-between gap-4 transition-all group-hover:border-brand-200 group-hover:shadow-md group-hover:shadow-slate-200 active:scale-[0.98]">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900">{c.cat_name}</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {c.question_count} ข้อ · คละ {c.topic_count} หัวข้อ
                                            </p>
                                        </div>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-transform group-hover:translate-x-0.5">
                                            <ArrowRight size={18} />
                                        </span>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
                    <h2 className="text-sm font-medium text-slate-500 mb-3">ทำเสร็จแล้วได้อะไร</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {GETS.map((g) => (
                            <div key={g.title} className="rounded-2xl border border-slate-100 bg-white p-4">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 mb-3">
                                    <g.icon size={17} />
                                </span>
                                <p className="text-sm font-medium text-slate-800">{g.title}</p>
                                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{g.text}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
