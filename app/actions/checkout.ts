"use server";

import { authorizedFetch, getSession } from "@/lib/session";

// ownedIds = ชุดในตะกร้าที่ลูกค้ามีแบบไม่มีวันหมดอายุอยู่แล้ว (backend ปฏิเสธ — ซื้อซ้ำไม่ได้) ให้ตะกร้าไฮไลต์ชุดนั้น
export type CheckoutResult = { ord_id: string } | { error: string; ownedIds?: string[] };
/** ชุดในแพ็กเกจที่ลูกค้ามีอยู่แล้ว — lifetime = ไม่ได้อะไรเพิ่ม (โมฆะ) · timed = ต่ออายุจากวันหมดอายุเดิม */
export type OwnedInPackage = { prod_id: string; prod_name: string; kind: "lifetime" | "timed" };
// ผลของการซื้อแพ็กเกจ — เพิ่ม needLogin ให้ปุ่มพาไปหน้า login เอง (หน้า /packages จึงไม่ต้องอ่าน cookie)
// needConfirm = แพ็กเกจมีชุดที่ลูกค้ามีอยู่แล้ว ต้องให้ลูกค้ายืนยันก่อน แล้วเรียกซ้ำด้วย confirmOwned = true
export type PackageCheckoutResult = CheckoutResult | { needLogin: true } | { needConfirm: true; owned: OwnedInPackage[] };

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
        return {
            error: checkoutData.message ?? "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่",
            ...(checkoutData.code === "ALREADY_OWNED" ? { ownedIds: checkoutData.product_ids as string[] } : {}),
        };
    }

    return { ord_id: checkoutData.ord_id as string };
}

// ซื้อแพ็กเกจตรงๆ ไม่ผ่านตะกร้า (ตะกร้าฝั่ง client เก็บแค่ product เดี่ยว ผสมกับแพ็กเกจจะซับซ้อนเกินจำเป็น) —
// v1: ซื้อแพ็กเกจใช้คูปองพร้อมกันไม่ได้ (ดู checkout() ฝั่ง backend) — ไม่ mock-confirm อัตโนมัติเหมือนกัน
export async function checkoutPackageAction(packageId: string, confirmOwned = false): Promise<PackageCheckoutResult> {
    // เดิมหน้า /packages อ่าน session เองเพื่อส่ง isLoggedIn ให้ปุ่ม ซึ่งทำให้ทั้งหน้าต้องเรนเดอร์ใหม่ทุกครั้งที่มีคนเข้า
    // ย้ายมาเช็คตอนกดซื้อแทน (2026-09-24) — ตรงจุดกว่าด้วย เพราะ session อาจหมดอายุระหว่างเปิดหน้าทิ้งไว้
    if (!(await getSession())) return { needLogin: true };

    const checkoutRes = await authorizedFetch("/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId, ...(confirmOwned ? { confirm_owned: true } : {}) }),
    });
    const checkoutData = await checkoutRes.json().catch(() => ({}));

    if (checkoutRes.status === 409 && checkoutData.code === "PACKAGE_HAS_OWNED") {
        return { needConfirm: true, owned: checkoutData.owned as OwnedInPackage[] };
    }
    if (!checkoutRes.ok) {
        return { error: checkoutData.message ?? "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่" };
    }

    return { ord_id: checkoutData.ord_id as string };
}
