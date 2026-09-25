import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getPublicProduct, getSampleQuestions, getPublicProducts } from "@/lib/publicData";
import SampleExam from "./SampleExam";

// สร้างหน้าตัวอย่างของทุกชุดไว้ล่วงหน้าตอน build (เหตุผลเดียวกับหน้ารายละเอียดชุด ../page.tsx)
export async function generateStaticParams() {
    const { data } = await getPublicProducts({ limit: 100 });
    return data.length > 0 ? data.map((p) => ({ id: p.prod_id })) : [{ id: "_" }];
}

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
