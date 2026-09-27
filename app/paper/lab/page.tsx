import { notFound } from "next/navigation";
import { isFeatureEnabled } from "@/lib/publicData";
import LabClient from "./LabClient";

// แล็บทดสอบการอ่านกระดาษคำตอบ (ระบบสอบกระดาษ เฟส 0)
// พิมพ์แผ่นทดสอบ → ฝนตามใบบอกวิธีฝน → ถ่ายรูปส่งเข้าหน้านี้ → เห็นผลอ่านทุกวงเทียบกับที่ฝนจริง
// หน้าของทีมงาน ไม่ใช่ของลูกค้า (เฟส 3, 2026-09-28) — เปิดได้เมื่อแอดมินเปิดสวิตช์ **paper_lab** แยกจาก paper_exam
// (เปิดระบบให้ลูกค้าใช้แล้ว หน้านี้ยังปิดอยู่) + ต้องล็อกอิน (proxy.ts ส่งไปหน้า login) · ใช้กฎเดียวกันทั้ง dev และเว็บจริง
// เปิดสวิตช์บนเว็บจริงได้ถ้าอยากทดสอบถ่ายจากมือถือจริงผ่าน https — ทดสอบเสร็จปิดกลับ
export const metadata = { title: "แล็บทดสอบกระดาษคำตอบ", robots: { index: false } };

export default async function PaperLabPage() {
    if (!(await isFeatureEnabled("paper_lab"))) notFound();
    return <LabClient />;
}
