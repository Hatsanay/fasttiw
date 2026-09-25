import "server-only";
import { cacheLife } from "next/cache";
import * as api from "@/lib/api";
import { getDiagnosticCategories as fetchDiagnosticCategories } from "@/lib/diagnostic";

// ข้อมูลสาธารณะ (ไม่ขึ้นกับว่าใครดู) ที่หน้าเว็บฝั่งลูกค้าใช้ — ครอบด้วย `use cache` ให้ Next เอาไปประกอบ
// เป็นหน้าสำเร็จรูป (static shell) ได้ แทนการเรนเดอร์ใหม่ทุกครั้งที่มีคนเข้า (2026-09-24)
//
// **ทำไมแยกไฟล์จาก lib/api.ts**: lib/api.ts ถูก import จาก client component หลายตัว (formatBaht,
// productCoverUrl ฯลฯ) ส่วนฟังก์ชัน `use cache` ทำงานได้เฉพาะฝั่ง server — ถ้าอยู่ไฟล์เดียวกัน client bundle
// จะดึงโค้ดฝั่ง server ติดไปด้วย · หน้า server ให้ import ตัวดึงข้อมูลจากไฟล์นี้เสมอ ห้ามเรียก lib/api ตรงๆ
// (เรียกตรงยังทำงานได้ แต่หน้านั้นจะกลับไปเรนเดอร์ใหม่ทุก request โดยไม่มีใครรู้)
//
// **อายุ cache = 'minutes'** (ข้อมูลใหม่ภายใน ~1 นาที) เท่ากับ `revalidate: 60` ที่ใช้มาตลอด — แอดมิน
// publish ชุดใหม่/แก้ราคา ลูกค้าเห็นภายในหนึ่งนาทีเหมือนเดิม ไม่ได้ช้าลง
//
// ⚠ ข้อมูลที่ขึ้นกับตัวลูกค้า (โปรไฟล์ สิทธิ์ที่ถือ ตะกร้า) ห้ามเข้าไฟล์นี้เด็ดขาด — ผลของ `use cache`
// ถูกแชร์ให้ทุกคนที่เข้าหน้าเดียวกัน ของคนหนึ่งจะไปโผล่ให้อีกคนเห็น ของพวกนั้นอยู่ที่ lib/session.ts

export async function getPublicProducts(params: Parameters<typeof api.getPublicProducts>[0] = {}) {
    "use cache";
    cacheLife("minutes");
    return api.getPublicProducts(params);
}

export async function getPublicProduct(id: string) {
    "use cache";
    cacheLife("minutes");
    return api.getPublicProduct(id);
}

export async function getSampleQuestions(id: string) {
    "use cache";
    cacheLife("minutes");
    return api.getSampleQuestions(id);
}

export async function getPublicPackages() {
    "use cache";
    cacheLife("minutes");
    return api.getPublicPackages();
}

export async function getPopularProducts() {
    "use cache";
    cacheLife("minutes");
    return api.getPopularProducts();
}

export async function getPublicCategories() {
    "use cache";
    cacheLife("minutes");
    return api.getPublicCategories();
}

export async function getPublicNewsFeed() {
    "use cache";
    cacheLife("minutes");
    return api.getPublicNewsFeed();
}

export async function getLandingNewsBlocks() {
    "use cache";
    cacheLife("minutes");
    return api.getLandingNewsBlocks();
}

export async function getDiagnosticCategories() {
    "use cache";
    cacheLife("minutes");
    return fetchDiagnosticCategories();
}

// ตัวเลขผลสอบจริงขยับช้ามาก (เปลี่ยนตอนลูกค้าตอบแบบสอบถามเท่านั้น) — รีเฟรชทุก 10 นาทีเหมือนเดิม
export async function getOutcomeStats() {
    "use cache";
    cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
    return api.getOutcomeStats();
}
