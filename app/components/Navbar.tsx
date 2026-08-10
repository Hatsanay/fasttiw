import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import CartLink from "@/app/components/CartLink";
import UserMenu from "@/app/components/UserMenu";
import MobileNav from "@/app/components/MobileNav";
import { NAV_LINKS } from "@/app/components/navLinks";
import { getSession, getMyProfile } from "@/lib/session";
import { productCoverUrl } from "@/lib/api";

export default async function Navbar() {
    const session = await getSession();
    const profile = session ? await getMyProfile() : null;
    const fullName = profile ? [profile.cus_fname, profile.cus_lname].filter(Boolean).join(" ") || null : null;
    const avatarUrl = productCoverUrl(profile?.cus_avatar_url ?? null);

    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* mobile: ปุ่มแฮมเบอร์เกอร์อยู่ฝั่งซ้าย ตรงข้างเดียวกับที่ sidebar เลื่อนออกมา */}
                    <div className="md:hidden">
                        <MobileNav session={!!session} fullName={fullName} avatarUrl={avatarUrl} />
                    </div>
                    <Link href={session ? "/library" : "/"} className="flex items-center gap-2 font-semibold text-slate-800">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white">
                            <BookOpenCheck size={18} />
                        </span>
                        Fasttiw
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
                    {session &&
                        NAV_LINKS.map((link) => (
                            <Link key={link.href} href={link.href} className="hover:text-brand-600 transition-colors">
                                {link.label}
                            </Link>
                        ))}
                    <CartLink />
                    {session ? (
                        <UserMenu fullName={fullName} avatarUrl={avatarUrl} />
                    ) : (
                        <Link href="/login" className="hover:text-brand-600 transition-colors">
                            เข้าสู่ระบบ
                        </Link>
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
