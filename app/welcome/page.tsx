import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { authorizedFetch } from "@/lib/session";
import { productCoverUrl } from "@/lib/api";
import { safeNextPath } from "@/lib/safeNext";
import WelcomeForm from "./WelcomeForm";

export const metadata = { title: "ยินดีต้อนรับ", robots: { index: false } };

type Me = {
    cus_fname: string | null;
    cus_lname: string | null;
    cus_avatar_url: string | null;
    cus_must_change_password: number;
};

// หน้าต้อนรับที่เด้งขึ้น "ครั้งเดียว" ทันทีหลังสร้างบัญชีสำเร็จ — ไม่บังคับ มีปุ่มข้ามเสมอ
//   - สมัครด้วย Google (?step=profile) → ยืนยัน/แก้ชื่อ-นามสกุล (ดึงมาจาก Google ไว้ให้แล้ว) + ใส่รูปโปรไฟล์
//   - สมัครด้วยฟอร์มปกติ → ใส่รูปโปรไฟล์อย่างเดียว (เพิ่งพิมพ์ชื่อไปในฟอร์มสมัครเมื่อกี้ ถามซ้ำก็น่ารำคาญ)
//
// ไม่ต้องจำในฐานข้อมูลว่าเคยข้ามหรือยัง เพราะมีแค่หน้าสมัครสองหน้าเท่านั้นที่พามาที่นี่ ล็อกอินครั้งถัดไป
// จะไม่เจอหน้านี้อีก ถ้าอยากเปลี่ยนชื่อ/รูปทีหลังทำได้ที่หน้า /account ตามปกติ
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string; step?: string }> }) {
    const { next, step } = await searchParams;
    const safeNext = safeNextPath(next);

    const res = await authorizedFetch("/store/me");
    if (!res.ok) redirect(`/login?next=${encodeURIComponent(safeNext)}`);
    const me: Me = await res.json();

    // บัญชีที่แอดมินสร้างให้ต้องผ่าน OnboardingModal (ตั้งรหัส + ข้อมูล + PDPA + รูป) อยู่แล้ว ไม่ต้องซ้อนอีกหน้า
    if (me.cus_must_change_password) redirect(safeNext);

    const askName = step === "profile";

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <Card className="w-full max-w-sm p-6 sm:p-8">
                    <h1 className="text-xl font-semibold text-slate-900 mb-1 text-center">
                        {me.cus_fname ? `ยินดีต้อนรับ คุณ${me.cus_fname}` : "ยินดีต้อนรับสู่ Fasttiw"}
                    </h1>
                    <p className="mb-6 text-center text-sm text-slate-400">
                        {askName ? "ตรวจชื่อและเพิ่มรูปโปรไฟล์ของคุณ" : "เพิ่มรูปโปรไฟล์ให้บัญชีของคุณ"} — ข้ามไปก่อนก็ได้
                    </p>
                    <WelcomeForm
                        next={safeNext}
                        askName={askName}
                        initialFname={me.cus_fname ?? ""}
                        initialLname={me.cus_lname ?? ""}
                        avatarUrl={productCoverUrl(me.cus_avatar_url) ?? undefined}
                    />
                </Card>
            </main>
            <Footer />
        </div>
    );
}
