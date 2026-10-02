import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { authorizedFetch } from "@/lib/session";
import { getPublicProduct, isFeatureEnabled } from "@/lib/publicData";
import type { PaperGroup } from "@/lib/paper/groups";
import PaperSetupClient, { type PaperForm } from "./PaperSetupClient";
import GroupSection from "./GroupSection";

// สอบแบบกระดาษ — สร้างใบสอบ + ดาวน์โหลดชุดข้อสอบ/กระดาษคำตอบ (ระบบสอบกระดาษ เฟส 1 — CLAUDE.md ข้อ 6.9)
// อยู่ใต้ /exam จึงต้องล็อกอินเสมอ (proxy.ts) · ปิดฟีเจอร์ paper_exam = ไม่มีหน้านี้
export const metadata = { title: "สอบแบบกระดาษ" };

export default async function PaperSetupPage({ params }: { params: Promise<{ productId: string }> }) {
    const [paperOn, groupOn] = await Promise.all([isFeatureEnabled("paper_exam"), isFeatureEnabled("paper_group_exam")]);
    if (!paperOn) notFound();
    const { productId } = await params;
    const [product, formsRes, groupsRes] = await Promise.all([
        getPublicProduct(productId),
        authorizedFetch(`/store/paper-forms?product_id=${encodeURIComponent(productId)}`),
        groupOn ? authorizedFetch(`/store/paper-groups?product_id=${encodeURIComponent(productId)}`) : null,
    ]);
    if (!product) notFound();
    const forms: PaperForm[] = formsRes.ok ? (await formsRes.json()).data : [];
    const groups: PaperGroup[] = groupsRes?.ok ? (await groupsRes.json()).data : [];

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <PaperSetupClient productId={product.prod_id} productName={product.prod_name} questionCount={product.question_count} initialForms={forms} />
                {groupOn && <GroupSection productId={product.prod_id} productName={product.prod_name} groups={groups} />}
            </main>
            <Footer />
        </div>
    );
}
