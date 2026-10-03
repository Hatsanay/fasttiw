import "server-only";
import * as api from "@/lib/api";
import { getFeatureFlags } from "@/lib/publicData";

// สวิตช์ฟีเจอร์แบบค่าสดทุกครั้ง — สำหรับหน้าที่ต้องล็อกอิน (เรนเดอร์ใหม่ทุกครั้งอยู่แล้ว) ที่ปิดหน้าทั้งหน้าด้วย notFound()
//
// ทำไมไม่ใช้ isFeatureEnabled ของ lib/publicData.ts: ตัวนั้น cache แบบ stale-while-revalidate — คำขอแรกหลังแอดมิน
// เปิดสวิตช์ (ต่อโปรเซส · production มีหลายโปรเซส) ยังได้ค่า "ปิด" → ลูกค้าเจอ 404 แวบหนึ่ง รีเฟรชแล้วหาย
// (เจอจริงบน production 2026-10-03) · backend จำค่าไว้ในหน่วยความจำ 30 วิอยู่แล้ว ยิงทุกครั้งจึงเบามาก
//
// ดึงไม่ได้ (backend รีสตาร์ท/ช้า) → ค่าสดล่าสุดที่โปรเซสนี้เคยได้ → ค่าใน cache สาธารณะ — ห้ามตีความว่า "ปิดหมด"
// ไม่งั้นทุกหน้าที่ผูกสวิตช์ 404 พร้อมกันระหว่าง deploy
// ⚠ เรียกได้เฉพาะในหน้าที่อยู่ใต้ <Suspense> (มี loading.tsx) — เป็นการดึงข้อมูลแบบไม่ cache

let lastKnown: Record<string, boolean> | null = null;

async function currentFlags(): Promise<Record<string, boolean>> {
    const fresh = await api.fetchFeatureFlags();
    if (fresh) {
        lastKnown = fresh;
        return fresh;
    }
    return lastKnown ?? (await getFeatureFlags());
}

export async function isFeatureEnabledNow(key: string): Promise<boolean> {
    return (await currentFlags())[key] === true;
}

/** หลายสวิตช์ในคำขอเดียว — หน้าที่ต้องเช็คทั้ง paper_exam และ paper_group_exam */
export async function featuresEnabledNow(...keys: string[]): Promise<boolean[]> {
    const flags = await currentFlags();
    return keys.map((k) => flags[k] === true);
}
