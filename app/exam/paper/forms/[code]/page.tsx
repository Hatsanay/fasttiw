import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { authorizedFetch } from "@/lib/session";
import { isFeatureEnabled } from "@/lib/publicData";
import ScanClient, { type PaperFormInfo } from "./ScanClient";

// สแกนกระดาษคำตอบของใบสอบหนึ่งใบ → ตรวจ → ไปหน้าเฉลย (ระบบสอบกระดาษ เฟส 2 — CLAUDE.md ข้อ 6.9)
// อยู่ใต้ /exam จึงต้องล็อกอินเสมอ (proxy.ts) · ใบสอบของคนอื่น/สิทธิ์หมด = backend ตอบไม่ใช่ 200 → 404
export const metadata = { title: "ตรวจกระดาษคำตอบ", robots: { index: false } };

export default async function PaperFormPage({ params }: { params: Promise<{ code: string }> }) {
    if (!(await isFeatureEnabled("paper_exam"))) notFound();
    const { code } = await params;
    const res = await authorizedFetch(`/store/paper-forms/${encodeURIComponent(code)}`);
    if (!res.ok) notFound();
    const form: PaperFormInfo = await res.json();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <ScanClient form={form} />
            </main>
            <Footer />
        </div>
    );
}
