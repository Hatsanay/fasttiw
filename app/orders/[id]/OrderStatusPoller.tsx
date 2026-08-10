"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// poll สถานะออเดอร์เป็นระยะตอนยัง "pending" เท่านั้น (PromptPay ไม่ real-time — ลูกค้าสแกน QR แล้ว
// webhook อาจมาถึงหลังจากนั้นไม่กี่วินาที) พอสถานะเปลี่ยนแล้วสั่ง router.refresh() ให้ Server Component
// ของหน้านี้ไปดึงข้อมูลเต็มใหม่ (รวมสถานะ paid + สิทธิ์ที่เพิ่งได้) ไม่ render อะไรเอง คืน null เสมอ
export default function OrderStatusPoller({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
    const router = useRouter();

    useEffect(() => {
        if (initialStatus !== "pending") return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}/status`);
                if (!res.ok) return;
                const { ord_status } = await res.json();
                if (ord_status !== "pending") {
                    clearInterval(interval);
                    router.refresh();
                }
            } catch {
                // เน็ตหลุดชั่วคราว/request ล้มเหลว — ไม่ต้องทำอะไร รอบถัดไปลองใหม่เอง
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [orderId, initialStatus, router]);

    return null;
}
