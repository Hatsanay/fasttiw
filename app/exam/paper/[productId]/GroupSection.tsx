"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Crown, Loader2, Users } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { PaperGroup } from "@/lib/paper/groups";

// สอบเป็นกลุ่มกับเพื่อน — สร้างกลุ่มของชุดนี้ + กลุ่มของชุดนี้ที่มีอยู่แล้ว (CLAUDE.md ข้อ 6.9.1) · โผล่เฉพาะตอนเปิด paper_group_exam
export default function GroupSection({ productId, productName, groups }: { productId: string; productName: string; groups: PaperGroup[] }) {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [busy, setBusy] = useState(false);

    async function create() {
        setBusy(true);
        try {
            const res = await fetch("/api/paper-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: productId, title: title.trim() || `สอบ ${productName}` }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message ?? "สร้างกลุ่มไม่สำเร็จ กรุณาลองใหม่");
            router.push(`/exam/paper/groups/${data.id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "สร้างกลุ่มไม่สำเร็จ กรุณาลองใหม่");
            setBusy(false);
        }
    }

    return (
        <section className="mt-10">
            <Card className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Users size={19} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-medium text-slate-800">สอบเป็นกลุ่มกับเพื่อน</p>
                        <p className="text-sm text-slate-500">
                            ติวกันหลายคน? สร้างกลุ่มแล้วส่งลิงก์ให้เพื่อนกดเข้า — นัดสอบพร้อมกันเหมือนสนามจริง แล้วดูคะแนนของทุกคนได้ในที่เดียว
                        </p>
                    </div>
                </div>
                <form
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                        e.preventDefault();
                        create();
                    }}
                >
                    <Input
                        value={title}
                        maxLength={120}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={`ชื่อกลุ่ม เช่น "ติว ก.พ. ห้อง 3"`}
                        aria-label="ชื่อกลุ่ม"
                        className="sm:flex-1"
                    />
                    <Button type="submit" disabled={busy} className="shrink-0">
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        สร้างกลุ่ม
                    </Button>
                </form>
                <p className="mt-3 text-xs text-slate-500">เพื่อนทุกคนต้องมีบัญชี Fasttiw · เพื่อนที่ยังไม่ได้ซื้อชุดนี้สอบได้และเห็นคะแนน แต่ดูเฉลยละเอียดไม่ได้</p>
            </Card>

            {groups.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                    {groups.map((g) => (
                        <Link key={g.id} href={`/exam/paper/groups/${g.id}`}>
                            <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-brand-200">
                                {g.role === "owner" ? <Crown size={16} className="shrink-0 text-brand-600" /> : <Users size={16} className="shrink-0 text-slate-400" />}
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{g.title}</span>
                                <span className="shrink-0 text-xs text-slate-500">{g.member_count} คน</span>
                                <ChevronRight size={16} className="shrink-0 text-slate-300" />
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
