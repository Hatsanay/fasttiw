import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Link2Off } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { authorizedFetch } from "@/lib/session";
import { isFeatureEnabled } from "@/lib/publicData";
import type { JoinPreview } from "@/lib/paper/groups";
import JoinClient from "./JoinClient";

// หน้าลิงก์เชิญเข้ากลุ่มสอบกระดาษ (CLAUDE.md ข้อ 6.9.1) — อยู่ใต้ /exam ต้องล็อกอิน (ไม่มีบัญชี = proxy พาไป login แล้วกลับมาที่นี่)
// เป็นสมาชิกอยู่แล้ว = พาไปหน้ากลุ่มเลย · ลิงก์ผิด/ถูกออกใหม่ = บอกตรงๆ ไม่ใช่หน้า 404 เปล่าๆ
export const metadata = { title: "เข้ากลุ่มสอบกระดาษ", robots: { index: false } };

export default async function JoinPaperGroupPage({ params }: { params: Promise<{ code: string }> }) {
    const [paperOn, groupOn] = await Promise.all([isFeatureEnabled("paper_exam"), isFeatureEnabled("paper_group_exam")]);
    if (!paperOn || !groupOn) notFound();
    const { code } = await params;
    if (!/^[A-Za-z0-9-]{1,40}$/.test(code)) notFound();
    const res = await authorizedFetch(`/store/paper-groups/join/${encodeURIComponent(code)}`);
    const preview: JoinPreview | null = res.ok ? await res.json() : null;
    if (preview?.already_member) redirect(`/exam/paper/groups/${preview.id}`);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-10">
                {preview ? (
                    <JoinClient code={code} preview={preview} />
                ) : (
                    <Card className="p-8 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <Link2Off size={22} />
                        </span>
                        <h1 className="mt-4 text-lg font-semibold text-slate-900">ลิงก์นี้ใช้ไม่ได้</h1>
                        <p className="mt-2 text-sm text-slate-500">ผู้จัดอาจออกลิงก์ใหม่หรือลบกลุ่มไปแล้ว — ขอลิงก์ล่าสุดจากผู้จัดอีกครั้ง</p>
                        <Link href="/library" className="mt-5 inline-block text-sm font-medium text-brand-600 hover:underline">
                            ไปคลังข้อสอบของฉัน
                        </Link>
                    </Card>
                )}
            </main>
            <Footer />
        </div>
    );
}
