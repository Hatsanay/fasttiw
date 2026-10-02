import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { authorizedFetch } from "@/lib/session";
import { isFeatureEnabled } from "@/lib/publicData";
import type { PaperGroup } from "@/lib/paper/groups";
import GroupClient from "./GroupClient";

// หน้ากลุ่มสอบกระดาษ — ผู้จัด: ลิงก์เชิญ/สมาชิก/ตั้งค่า · สมาชิก: ข้อมูลกลุ่ม/ออกจากกลุ่ม (CLAUDE.md ข้อ 6.9.1)
// อยู่ใต้ /exam จึงต้องล็อกอินเสมอ · ไม่ใช่สมาชิก = 404 (backend)
export const metadata = { title: "กลุ่มสอบกระดาษ", robots: { index: false } };

export default async function PaperGroupPage({ params }: { params: Promise<{ id: string }> }) {
    const [paperOn, groupOn] = await Promise.all([isFeatureEnabled("paper_exam"), isFeatureEnabled("paper_group_exam")]);
    if (!paperOn || !groupOn) notFound();
    const { id } = await params;
    const res = await authorizedFetch(`/store/paper-groups/${encodeURIComponent(id)}`);
    if (!res.ok) notFound();
    const group: PaperGroup = await res.json();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <GroupClient initial={group} />
            </main>
            <Footer />
        </div>
    );
}
