import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getDiagnosticQuestions } from "@/lib/diagnostic";
import DiagnosticRunner from "./DiagnosticRunner";

// ชุดข้อสุ่มใหม่ทุกครั้งที่เปิด — ไม่ index (หน้าที่ควรขึ้นผลค้นหาคือ /diagnostic)
export const metadata: Metadata = {
    title: "แบบทดสอบวัดระดับฟรี",
    robots: { index: false, follow: true },
};

export default async function DiagnosticRunPage({ params }: { params: Promise<{ categoryId: string }> }) {
    const { categoryId } = await params;
    const data = await getDiagnosticQuestions(categoryId);
    if (!data || data.questions.length === 0) notFound();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-1">
                <DiagnosticRunner category={data.category} questions={data.questions} />
            </main>
            <Footer />
        </div>
    );
}
