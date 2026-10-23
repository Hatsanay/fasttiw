import type { ReactNode } from "react";
import { getOwnership } from "@/lib/session";

// เลือกแสดง `owned` หรือ `notOwned` ตามว่าลูกค้าที่ login อยู่ถือสิทธิ์ชุดนี้ไหม (2026-09-24)
//
// ใช้คู่กับ <Suspense fallback={...notOwned...}> เสมอ — ตัวหน้าสินค้าถูกประกอบเป็นหน้าสำเร็จรูปล่วงหน้า
// (เร็วเท่าไฟล์นิ่ง) มีแค่จุดที่ต้องรู้ว่า "ซื้อแล้วหรือยัง" ที่ไหลตามมาในคำตอบเดียวกัน · fallback ให้เป็นแบบ
// ยังไม่ซื้อ เพราะคนที่เปิดหน้าสินค้าเกือบทั้งหมดคือคนที่ยังไม่ซื้อ — เจ้าของชุดจะเห็นปุ่มสลับเป็น
// "ไปทำข้อสอบ" หลังจากนั้นเสี้ยววินาที
//
// ownedTimed (ไม่บังคับ) = ถือแบบมีวันหมดอายุ — รับวันหมดอายุไปแสดงปุ่ม "ต่ออายุ" (กติกาซื้อซ้ำ 2026-10-23:
// ชุดถาวรซื้อซ้ำไม่ได้ ชุดมีวันหมดอายุต่อล่วงหน้าได้) · ไม่ส่งมา = ใช้ `owned` เหมือนเดิม
//
// ของทั้งสองฝั่งส่งมาเป็น JSX ที่เรนเดอร์ไว้แล้ว component นี้ไม่รู้หน้าตาอะไรเลย ใช้ซ้ำได้ทุกจุด
// (getOwnership ครอบ React cache ไว้ เรียกหลายจุดในหน้าเดียวกันยิง backend ครั้งเดียว)
export default async function OwnedSwitch({
    productId,
    owned,
    ownedTimed,
    notOwned = null,
}: {
    productId: string;
    owned: ReactNode;
    ownedTimed?: (expiresAt: string) => ReactNode;
    notOwned?: ReactNode;
}) {
    const ownership = await getOwnership();
    if (!ownership.has(productId)) return <>{notOwned}</>;
    const expiresAt = ownership.get(productId);
    return <>{expiresAt && ownedTimed ? ownedTimed(expiresAt) : owned}</>;
}
