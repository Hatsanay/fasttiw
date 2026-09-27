import { notFound } from "next/navigation";
import { isFeatureEnabled } from "@/lib/publicData";
import LabClient from "./LabClient";

// แล็บทดสอบการอ่านกระดาษคำตอบ (ระบบสอบกระดาษ เฟส 0)
// พิมพ์แผ่นทดสอบ → ฝนตามใบบอกวิธีฝน → ถ่ายรูปส่งเข้าหน้านี้ → เห็นผลอ่านทุกวงเทียบกับที่ฝนจริง
// เครื่อง dev เปิดได้เสมอ · เว็บจริงเปิดได้เมื่อแอดมินเปิดฟีเจอร์ paper_exam (เมนู "เปิดใช้งานระบบ") — ให้ทดสอบถ่ายจาก
// มือถือจริงผ่าน https ได้ตรงๆ · ⚠ เฟสที่มีหน้าจริงให้ลูกค้าแล้วต้องจำกัดหน้านี้ใหม่ (ไม่ใช่ของลูกค้า)
export const metadata = { title: "แล็บทดสอบกระดาษคำตอบ", robots: { index: false } };

export default async function PaperLabPage() {
    if (process.env.NODE_ENV === "production" && !(await isFeatureEnabled("paper_exam"))) notFound();
    return <LabClient />;
}
