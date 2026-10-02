import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { isFeatureEnabled } from "@/lib/publicData";
import { fetchGroupSheets } from "@/lib/paper/printData";
import BatchScanClient from "./BatchScanClient";

// สแกนกระดาษคำตอบทั้งกองของกลุ่ม (ผู้จัด — CLAUDE.md ข้อ 6.9.1 เฟส 3)
// backend ให้ข้อมูลเฉพาะผู้จัดที่ยังถือสิทธิ์ชุดนั้น · สมาชิก/คนนอก = บอกตรงๆ ว่าเปิดไม่ได้
export const metadata = { title: "สแกนกระดาษคำตอบทั้งกลุ่ม", robots: { index: false } };

export default async function GroupScanPage({ params }: { params: Promise<{ id: string }> }) {
    const [paperOn, groupOn] = await Promise.all([isFeatureEnabled("paper_exam"), isFeatureEnabled("paper_group_exam")]);
    if (!paperOn || !groupOn) notFound();
    const { id } = await params;
    if (!/^[A-Za-z0-9-]{1,40}$/.test(id)) notFound();
    const result = await fetchGroupSheets(id);
    if (!result.ok && result.status === 404) notFound();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                {result.ok ? (
                    <BatchScanClient groupId={id} data={result.data} />
                ) : (
                    <Card className="p-8 text-center">
                        <p className="text-sm text-slate-600">{result.message}</p>
                        <Link href={`/exam/paper/groups/${id}`} className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
                            กลับหน้ากลุ่ม
                        </Link>
                    </Card>
                )}
            </main>
            <Footer />
        </div>
    );
}
