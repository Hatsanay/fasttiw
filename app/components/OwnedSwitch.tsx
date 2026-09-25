import type { ReactNode } from "react";
import { getOwnedProductIds } from "@/lib/session";

// เลือกแสดง `owned` หรือ `notOwned` ตามว่าลูกค้าที่ login อยู่ถือสิทธิ์ชุดนี้ไหม (2026-09-24)
//
// ใช้คู่กับ <Suspense fallback={...notOwned...}> เสมอ — ตัวหน้าสินค้าถูกประกอบเป็นหน้าสำเร็จรูปล่วงหน้า
// (เร็วเท่าไฟล์นิ่ง) มีแค่จุดที่ต้องรู้ว่า "ซื้อแล้วหรือยัง" ที่ไหลตามมาในคำตอบเดียวกัน · fallback ให้เป็นแบบ
// ยังไม่ซื้อ เพราะคนที่เปิดหน้าสินค้าเกือบทั้งหมดคือคนที่ยังไม่ซื้อ — เจ้าของชุดจะเห็นปุ่มสลับเป็น
// "ไปทำข้อสอบ" หลังจากนั้นเสี้ยววินาที
//
// ของทั้งสองฝั่งส่งมาเป็น JSX ที่เรนเดอร์ไว้แล้ว component นี้ไม่รู้หน้าตาอะไรเลย ใช้ซ้ำได้ทุกจุด
// (getOwnedProductIds ครอบ React cache ไว้ เรียกหลายจุดในหน้าเดียวกันยิง backend ครั้งเดียว)
export default async function OwnedSwitch({
    productId,
    owned,
    notOwned = null,
}: {
    productId: string;
    owned: ReactNode;
    notOwned?: ReactNode;
}) {
    const ownedIds = await getOwnedProductIds();
    return <>{ownedIds.has(productId) ? owned : notOwned}</>;
}
