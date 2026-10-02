import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Crown, Users } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { authorizedFetch } from "@/lib/session";
import { isFeatureEnabled } from "@/lib/publicData";
import type { PaperGroup } from "@/lib/paper/groups";

// กลุ่มสอบกระดาษของฉัน — ที่เป็นผู้จัดก่อน แล้วตามด้วยที่เข้าร่วม (CLAUDE.md ข้อ 6.9.1)
export const metadata = { title: "กลุ่มสอบกระดาษ", robots: { index: false } };

export default async function PaperGroupsPage() {
    const [paperOn, groupOn] = await Promise.all([isFeatureEnabled("paper_exam"), isFeatureEnabled("paper_group_exam")]);
    if (!paperOn || !groupOn) notFound();
    const res = await authorizedFetch("/store/paper-groups");
    const groups: PaperGroup[] = res.ok ? (await res.json()).data : [];

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900">กลุ่มสอบกระดาษ</h1>
                    <p className="mt-2 text-sm text-slate-500">ชวนเพื่อนสอบกระดาษพร้อมกัน — สร้างกลุ่มได้จากหน้า &quot;สอบแบบกระดาษ&quot; ของชุดที่คุณมีสิทธิ์</p>
                </div>

                {groups.length === 0 ? (
                    <Card className="p-8 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <Users size={22} />
                        </span>
                        <p className="mt-4 text-sm text-slate-500">ยังไม่มีกลุ่ม — ถ้าเพื่อนชวน ให้กดลิงก์เชิญที่เพื่อนส่งมา</p>
                        <Link href="/library" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
                            ไปคลังข้อสอบเพื่อสร้างกลุ่ม
                        </Link>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-3">
                        {groups.map((g) => (
                            <Link key={g.id} href={`/exam/paper/groups/${g.id}`}>
                                <Card className="flex items-center gap-3 p-4 transition-colors hover:border-brand-200">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                        {g.role === "owner" ? <Crown size={18} /> : <Users size={18} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium text-slate-800">{g.title}</span>
                                        <span className="block truncate text-xs text-slate-500">
                                            {g.prod_name} · {g.role === "owner" ? "คุณเป็นผู้จัด" : `ผู้จัด ${g.owner_name}`} · {g.member_count} คน
                                            {g.status === "closed" && " · ปิดรับสมาชิก"}
                                        </span>
                                    </span>
                                    <ChevronRight size={18} className="shrink-0 text-slate-300" />
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
