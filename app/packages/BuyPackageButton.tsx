"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { checkoutPackageAction, type OwnedInPackage } from "@/app/actions/checkout";

// ปุ่มซื้อแพ็กเกจ — ถ้าแพ็กเกจมีชุดที่ลูกค้ามีอยู่แล้ว backend ไม่สร้างคำสั่งซื้อจนกว่าลูกค้าจะยืนยัน (กติกาซื้อซ้ำ 2026-10-23)
// ชุดที่มีแบบไม่มีวันหมดอายุ = ไม่ได้อะไรเพิ่ม (โมฆะ) · ชุดแบบมีวันหมดอายุ = ต่ออายุ · ราคาแพ็กเกจเต็มเสมอ
// ต้องบอกให้ชัดก่อนจ่าย ไม่งั้นลูกค้ารู้สึกว่าโดนเก็บเงินซ้ำค่าชุดที่มีอยู่แล้ว
export default function BuyPackageButton({ packageId, className }: { packageId: string; className?: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [owned, setOwned] = useState<OwnedInPackage[] | null>(null);

    function handleBuy(confirmOwned: boolean) {
        startTransition(async () => {
            const result = await checkoutPackageAction(packageId, confirmOwned);
            if ("needLogin" in result) {
                router.push("/login?next=/packages");
                return;
            }
            if ("needConfirm" in result) {
                setOwned(result.owned);
                return;
            }
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            router.push(`/orders/${result.ord_id}`);
        });
    }

    if (owned) {
        const forever = owned.filter((o) => o.kind === "lifetime");
        const renew = owned.filter((o) => o.kind === "timed");
        return (
            <div className={cn("mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm", className)} role="alert">
                <p className="flex items-center gap-1.5 font-medium text-amber-900">
                    <AlertTriangle size={15} className="shrink-0" />
                    แพ็กเกจนี้มีชุดที่คุณมีอยู่แล้ว
                </p>
                {forever.length > 0 && (
                    <div className="mt-2">
                        <p className="text-amber-900">มีแบบไม่มีวันหมดอายุ — ชุดเหล่านี้จะไม่ได้อะไรเพิ่ม:</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-amber-800">
                            {forever.map((o) => (
                                <li key={o.prod_id}>{o.prod_name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {renew.length > 0 && (
                    <div className="mt-2">
                        <p className="text-amber-900">มีแบบมีวันหมดอายุ — จะถูกต่ออายุจากวันหมดอายุเดิม:</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-amber-800">
                            {renew.map((o) => (
                                <li key={o.prod_id}>{o.prod_name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <p className="mt-2 text-amber-900">ราคาแพ็กเกจยังเป็นราคาเต็มตามที่แสดง</p>
                <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => handleBuy(true)} disabled={isPending}>
                        {isPending ? "กำลังดำเนินการ..." : "ยืนยันซื้อ"}
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setOwned(null)} disabled={isPending}>
                        ยกเลิก
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Button size="lg" className={cn("w-full mt-3", className)} onClick={() => handleBuy(false)} disabled={isPending}>
            {isPending ? "กำลังดำเนินการ..." : "ซื้อแพ็กเกจนี้"}
        </Button>
    );
}
