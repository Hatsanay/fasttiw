"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { checkoutPackageAction } from "@/app/actions/checkout";

export default function BuyPackageButton({ packageId, className }: { packageId: string; className?: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleBuy() {
        startTransition(async () => {
            const result = await checkoutPackageAction(packageId);
            if ("needLogin" in result) {
                router.push("/login?next=/packages");
                return;
            }
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            router.push(`/orders/${result.ord_id}`);
        });
    }

    return (
        <Button size="lg" className={cn("w-full mt-3", className)} onClick={handleBuy} disabled={isPending}>
            {isPending ? "กำลังดำเนินการ..." : "ซื้อแพ็กเกจนี้"}
        </Button>
    );
}
