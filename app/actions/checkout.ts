"use server";

import { authorizedFetch } from "@/lib/session";

export type CheckoutResult = { ord_id: string } | { error: string };

// สร้าง order (pending) แล้วจบแค่นั้น — **ห้าม**เรียกยืนยันจ่ายเงินต่อจากตรงนี้เด็ดขาด (ผิดกฎเหล็กข้อ 1
// ใน CLAUDE.md: "ให้สิทธิ์เฉพาะตอนรับ webhook เท่านั้น") checkout() ฝั่ง backend สร้าง PromptPay payment intent +
// QR ให้เองถ้ามีบัญชี Stripe ตั้งไว้แล้ว (คืนมาใน response พร้อม ord_id) หน้า /orders/[id] จะโชว์ QR ให้
// สแกนแล้วรอ webhook จริงยืนยันแทน — ไม่มีการ mock-confirm อัตโนมัติจากฝั่ง client อีกต่อไป
export async function checkoutAction(productIds: string[], couponCode?: string): Promise<CheckoutResult> {
    if (productIds.length === 0) {
        return { error: "ไม่มีชุดข้อสอบในตะกร้า" };
    }

    const checkoutRes = await authorizedFetch("/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: productIds, coupon_code: couponCode || undefined }),
    });
    const checkoutData = await checkoutRes.json().catch(() => ({}));

    if (!checkoutRes.ok) {
        return { error: checkoutData.message ?? "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่" };
    }

    return { ord_id: checkoutData.ord_id as string };
}

// ซื้อแพ็กเกจตรงๆ ไม่ผ่านตะกร้า (ตะกร้าฝั่ง client เก็บแค่ product เดี่ยว ผสมกับแพ็กเกจจะซับซ้อนเกินจำเป็น) —
// v1: ซื้อแพ็กเกจใช้คูปองพร้อมกันไม่ได้ (ดู checkout() ฝั่ง backend) — ไม่ mock-confirm อัตโนมัติเหมือนกัน
export async function checkoutPackageAction(packageId: string): Promise<CheckoutResult> {
    const checkoutRes = await authorizedFetch("/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
    });
    const checkoutData = await checkoutRes.json().catch(() => ({}));

    if (!checkoutRes.ok) {
        return { error: checkoutData.message ?? "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่" };
    }

    return { ord_id: checkoutData.ord_id as string };
}
