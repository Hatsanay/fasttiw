import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getPublicProduct } from "@/lib/api";
import ModeSelectClient from "./ModeSelectClient";

export const metadata = { title: "เลือกโหมดทำข้อสอบ" };

export default async function ExamModeSelectPage({ params }: { params: Promise<{ productId: string }> }) {
    const { productId } = await params;
    const product = await getPublicProduct(productId);
    if (!product) notFound();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12">
                <div className="text-center mb-10">
                    <p className="text-sm font-medium text-brand-600 mb-1.5">{product.prod_name}</p>
                    <h1 className="text-2xl font-semibold text-slate-900">เลือกโหมดทำข้อสอบ</h1>
                </div>
                <ModeSelectClient productId={productId} examDurationMinutes={product.prod_exam_duration_minutes} />
            </main>
            <Footer />
        </div>
    );
}
