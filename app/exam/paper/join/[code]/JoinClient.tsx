"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { JoinPreview } from "@/lib/paper/groups";

// กดเข้ากลุ่ม — ต้องติ๊กยอมรับก่อนเสมอว่าผู้จัดจะเห็นคะแนน (backend บังคับ consent === true อีกชั้น)
export default function JoinClient({ code, preview }: { code: string; preview: JoinPreview }) {
    const router = useRouter();
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const full = preview.member_count >= preview.max_members;
    const closed = preview.status !== "open";

    async function join() {
        setBusy(true);
        try {
            const res = await fetch(`/api/paper-groups/join/${encodeURIComponent(code)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consent: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message ?? "เข้ากลุ่มไม่สำเร็จ กรุณาลองใหม่");
            toast.success("เข้ากลุ่มเรียบร้อย");
            router.push(`/exam/paper/groups/${data.id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "เข้ากลุ่มไม่สำเร็จ กรุณาลองใหม่");
            setBusy(false);
        }
    }

    return (
        <Card className="p-6">
            <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Users size={22} />
                </span>
                <p className="mt-4 text-sm text-slate-500">{preview.owner_name} ชวนคุณสอบกระดาษด้วยกัน</p>
                <h1 className="mt-1 text-xl font-semibold text-slate-900 text-balance">{preview.title}</h1>
                <p className="mt-1 text-sm font-medium text-brand-600">{preview.prod_name}</p>
                <p className="mt-2 text-xs text-slate-400">
                    สมาชิก {preview.member_count}/{preview.max_members} คน
                </p>
            </div>

            {closed || full ? (
                <p className="mt-6 rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800">
                    {closed ? "ผู้จัดปิดรับสมาชิกแล้ว — ติดต่อผู้จัดถ้าต้องการเข้ากลุ่ม" : `กลุ่มเต็มแล้ว (${preview.max_members} คน)`}
                </p>
            ) : (
                <>
                    {!preview.has_product && (
                        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                            คุณยังไม่มีสิทธิ์ชุดนี้ — เข้ากลุ่มแล้วสอบได้ เห็นคะแนน ผ่านเกณฑ์ไหม และจุดอ่อนรายหมวด ส่วน<b>เฉลยละเอียดทีละข้อ</b>
                            ต้องซื้อชุดนี้ก่อน
                        </p>
                    )}
                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 hover:border-slate-300">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                        />
                        <span>
                            ฉันยอมรับว่า <b>{preview.owner_name}</b> (ผู้จัด) จะเห็นชื่อและคะแนนสอบของฉันในกลุ่มนี้
                            <span className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                                <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                                เพื่อนคนอื่นในกลุ่มไม่เห็นคะแนนของคุณ · ออกจากกลุ่มได้ทุกเมื่อ
                            </span>
                        </span>
                    </label>
                    <Button type="button" className="mt-5 w-full" disabled={!consent || busy} onClick={join}>
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        เข้ากลุ่ม
                    </Button>
                </>
            )}
        </Card>
    );
}
