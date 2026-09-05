import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getPublicProduct, getSampleQuestions } from "@/lib/api";
import SampleExam from "./SampleExam";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const product = await getPublicProduct(id);
    if (!product) return { title: "ตัวอย่างข้อสอบฟรี" };

    const title = `ตัวอย่างข้อสอบฟรี — ${product.prod_name}`;
    const description = `ลองทำตัวอย่างข้อสอบ ${product.prod_name} ฟรี 10 ข้อ พร้อมเฉลยละเอียด ไม่ต้องสมัครสมาชิก`;
    return {
        title,
        description,
        alternates: { canonical: `/products/${id}/sample` },
        openGraph: { title, description, url: `/products/${id}/sample` },
        twitter: { card: "summary", title, description },
    };
}

export default async function SamplePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [product, sample] = await Promise.all([getPublicProduct(id), getSampleQuestions(id)]);
    if (!product || sample.questions.length === 0) notFound();

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-1">
                <p className="pt-8 text-center text-sm font-medium text-brand-600">{product.prod_name} — ตัวอย่างฟรี</p>
                <SampleExam productId={id} questions={sample.questions} totalScore={sample.totalScore} />
            </main>
            <Footer />
        </div>
    );
}
