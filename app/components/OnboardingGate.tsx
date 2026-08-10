import { getSession, authorizedFetch } from "@/lib/session";
import OnboardingModal from "@/app/components/OnboardingModal";

type Profile = { cus_fname: string | null; cus_lname: string | null; cus_email: string | null; cus_phone: string | null };

// ครอบทั้งแอปไว้ใน RootLayout — ถ้าบัญชีนี้ยังต้องเปลี่ยนรหัสผ่าน (แอดมินสร้างให้ ยังไม่เคยตั้งเอง)
// จะโชว์ modal บังคับ 2 ขั้นตอนทับหน้าปัจจุบันไว้ ไม่ว่าผู้ใช้จะอยู่หน้าไหนก็ตาม
// ลูกค้าที่สมัครเองจะไม่โดน gate นี้เลย เพราะ mustChangePassword เป็น false มาตั้งแต่ตอน register
export default async function OnboardingGate({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session || !session.mustChangePassword) {
        return <>{children}</>;
    }

    const res = await authorizedFetch("/store/me");
    const profile: Profile = res.ok ? await res.json() : { cus_fname: null, cus_lname: null, cus_email: null, cus_phone: null };

    return (
        <>
            {children}
            <OnboardingModal initialProfile={profile} />
        </>
    );
}
