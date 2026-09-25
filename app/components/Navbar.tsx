import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import CartLink from "@/app/components/CartLink";
import UserMenu from "@/app/components/UserMenu";
import MobileNav from "@/app/components/MobileNav";
import { NAV_LINKS } from "@/app/components/navLinks";
import { getSession, getMyProfile } from "@/lib/session";
import { productCoverUrl } from "@/lib/api";

// Navbar ถูกใช้ทุกหน้า — ถ้าอ่าน cookie ตรงๆ ทุกหน้าจะกลายเป็นหน้าที่ต้องเรนเดอร์ใหม่ทุกครั้ง (2026-09-24)
// จึงแยกเป็น 2 ชั้น: โครง navbar (โลโก้ ลิงก์หลัก ตะกร้า) อยู่ในหน้าสำเร็จรูปแสดงได้ทันที ส่วนที่ขึ้นกับตัวลูกค้า
// (เมนูผู้ใช้ ลิงก์คลังข้อสอบ/ประวัติ) ไหลตามมาในคำตอบเดียวกันผ่าน <Suspense>
// ระหว่างรอแสดงเป็นช่องว่างขนาดเท่ารูปโปรไฟล์ — ไม่เดาว่าเป็นผู้เยี่ยมชม ไม่งั้นคนที่ login อยู่จะเห็นปุ่ม
// "เข้าสู่ระบบ" แวบขึ้นมาก่อนทุกครั้งที่เปลี่ยนหน้า
export default function Navbar() {
    return (
        <Suspense fallback={<NavbarView auth="pending" fullName={null} avatarUrl={null} />}>
            <NavbarForSession />
        </Suspense>
    );
}

async function NavbarForSession() {
    const session = await getSession();
    const profile = session ? await getMyProfile() : null;
    const fullName = profile ? [profile.cus_fname, profile.cus_lname].filter(Boolean).join(" ") || null : null;
    const avatarUrl = productCoverUrl(profile?.cus_avatar_url ?? null);
    return <NavbarView auth={session ? "user" : "guest"} fullName={fullName} avatarUrl={avatarUrl} />;
}

function NavbarView({
    auth,
    fullName,
    avatarUrl,
}: {
    auth: "pending" | "guest" | "user";
    fullName: string | null;
    avatarUrl: string | null;
}) {
    const session = auth === "user";

    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
            <div className="max-w-360 mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* mobile: ปุ่มแฮมเบอร์เกอร์อยู่ฝั่งซ้าย ตรงข้างเดียวกับที่ sidebar เลื่อนออกมา */}
                    <div className="md:hidden">
                        <MobileNav session={session} fullName={fullName} avatarUrl={avatarUrl} />
                    </div>
                    <Link href={session ? "/library" : "/"} className="flex items-center">
                        {/* สัดส่วนโลโก้ชุดนี้คือ 478:132 (3.62:1) — width/height ต้องตรงสัดส่วนนี้เสมอ (brand kit ห้ามยืดสัดส่วน)
                            clamp คำนวณจากสัดส่วนใหม่เพื่อให้ความสูงที่ตาเห็นใน navbar เท่าเดิม (29px → 41px → 45px ตามความกว้างจอ) */}
                        <Image
                            src="/logo/fasttiw-logo.svg"
                            alt="Fasttiw"
                            width={145}
                            height={40}
                            className="h-auto w-[clamp(106px,9vw+58px,163px)] shrink-0"
                        />
                    </Link>
                </div>

                {/* desktop: ลิงก์หลักโชว์ตรงๆ ใน navbar เลย ไม่ซ่อนใน dropdown */}
                <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
                    <Link href="/products" className="hover:text-brand-600 transition-colors">
                        แนวข้อสอบทั้งหมด
                    </Link>
                    <Link href="/packages" className="hover:text-brand-600 transition-colors">
                        แพ็กเกจสุดคุ้ม
                    </Link>
                    {/* เฉพาะคนที่ยังไม่ login — แถวบนของคน login แน่นแล้ว (มีลิงก์ประวัติ/คลังข้อสอบ) และมีสรุปจุดอ่อนของตัวเองอยู่แล้ว */}
                    {auth === "guest" && (
                        <Link href="/diagnostic" className="hover:text-brand-600 transition-colors">
                            วัดระดับฟรี
                        </Link>
                    )}
                    {session &&
                        NAV_LINKS.map((link) => (
                            <Link key={link.href} href={link.href} className="hover:text-brand-600 transition-colors">
                                {link.label}
                            </Link>
                        ))}
                    <CartLink />
                    {auth === "user" ? (
                        <UserMenu fullName={fullName} avatarUrl={avatarUrl} />
                    ) : auth === "guest" ? (
                        <Link href="/login" className="hover:text-brand-600 transition-colors">
                            เข้าสู่ระบบ
                        </Link>
                    ) : (
                        <span aria-hidden className="h-8 w-8 rounded-full bg-slate-100" />
                    )}
                </nav>

                {/* mobile: ตะกร้าอยู่ฝั่งขวา ส่วนลิงก์อื่นพับไว้ใน sidebar (ปุ่มเปิดอยู่ฝั่งซ้ายข้างโลโก้) */}
                <div className="md:hidden">
                    <CartLink />
                </div>
            </div>
        </header>
    );
}
