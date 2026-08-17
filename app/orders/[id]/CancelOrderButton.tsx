"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/Button";

// ปุ่มยกเลิกคำสั่งซื้อที่ยังไม่จ่าย — ยิงผ่าน Route Handler (app/api/orders/[id]/cancel/route.ts) เพราะ
// client component นี้ไม่ถือ httpOnly JWT cookie เอง (เหมือน OrderStatusPoller ที่ proxy ผ่าน /api/orders/.../status)
export default function CancelOrderButton({ orderId }: { orderId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleClick() {
        if (!window.confirm("ยืนยันยกเลิกคำสั่งซื้อนี้? หากสแกน QR จ่ายเงินไปแล้วกรุณารอสักครู่แล้วรีเฟรชหน้าใหม่แทน")) return;

        startTransition(async () => {
            const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "PUT" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message ?? "ยกเลิกคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่");
                router.refresh();
                return;
            }
            toast.success("ยกเลิกคำสั่งซื้อสำเร็จ");
            router.refresh();
        });
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleClick} disabled={isPending} className="text-red-500 hover:bg-red-50 hover:text-red-600">
            {isPending ? "กำลังยกเลิก..." : "ยกเลิกคำสั่งซื้อ"}
        </Button>
    );
}
