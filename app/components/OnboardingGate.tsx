import { getSession, authorizedFetch } from "@/lib/session";
import OnboardingModal from "@/app/components/OnboardingModal";

type Profile = { cus_fname: string | null; cus_lname: string | null; cus_email: string | null; cus_phone: string | null };

// วางไว้ใน RootLayout — ถ้าบัญชีนี้ยังต้องเปลี่ยนรหัสผ่าน (แอดมินสร้างให้ ยังไม่เคยตั้งเอง)
// จะโชว์ modal บังคับ 2 ขั้นตอนทับหน้าปัจจุบันไว้ ไม่ว่าผู้ใช้จะอยู่หน้าไหนก็ตาม
// ลูกค้าที่สมัครเองจะไม่โดน gate นี้เลย เพราะ mustChangePassword เป็น false มาตั้งแต่ตอน register
//
// **ไม่ห่อ children แล้ว** (2026-09-24) — เดิมครอบทั้งแอปแล้ว await session ก่อนเรนเดอร์ children ทำให้ทุกหน้า
// ต้องรอ cookie ก่อน ตอนนี้เป็นชิ้นแยกใน <Suspense> หน้าเว็บแสดงได้ทันที modal ไหลตามมาทีหลัง
// (modal เป็น overlay เต็มจออยู่แล้ว การมาช้ากว่าเนื้อหาไม่กี่มิลลิวินาทีไม่มีผลกับการบังคับ — ปุ่มปิดก็ไม่มี)
export default async function OnboardingGate() {
    const session = await getSession();

    if (!session || !session.mustChangePassword) {
        return null;
    }

    const res = await authorizedFetch("/store/me");
    const profile: Profile = res.ok ? await res.json() : { cus_fname: null, cus_lname: null, cus_email: null, cus_phone: null };

    return <OnboardingModal initialProfile={profile} />;
}
