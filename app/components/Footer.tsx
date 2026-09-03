import Link from "next/link";
import Image from "next/image";
import { QrCode, Mail } from "lucide-react";

const LEARN_LINKS = [
    { href: "/products", label: "แนวข้อสอบทั้งหมด" },
    { href: "/packages", label: "แพ็กเกจสุดคุ้ม" },
];

const CONTACT_EMAIL = "fasttiw.softwork@gmail.com";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61593051279179";

const ACCOUNT_LINKS = [
    { href: "/login", label: "เข้าสู่ระบบ" },
    { href: "/register", label: "สมัครสมาชิก" },
    { href: "/library", label: "คลังข้อสอบของฉัน" },
    { href: "/history", label: "ประวัติการทำข้อสอบ" },
];

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-slate-100 bg-slate-50/50">
            <div className="max-w-360 mx-auto px-4 sm:px-6 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                    <div className="sm:col-span-2 md:col-span-3 lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-800">
                            <Image src="/logo/fasttiw-symbol.svg" alt="Fasttiw" width={32} height={32} className="shrink-0" />
                            Fasttiw
                        </Link>
                        <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-xs">
                            แนวข้อสอบออนไลน์พร้อมเฉลยละเอียด ทำโจทย์ได้จริงบนเว็บ ไม่ใช่แค่ไฟล์ PDF
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-3">เรียนรู้</h3>
                        <ul className="flex flex-col gap-2">
                            {LEARN_LINKS.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-slate-500 hover:text-brand-600 transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-3">บัญชี</h3>
                        <ul className="flex flex-col gap-2">
                            {ACCOUNT_LINKS.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-slate-500 hover:text-brand-600 transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-3">นโยบาย</h3>
                        <ul className="flex flex-col gap-2">
                            <li>
                                <Link href="/privacy" className="text-sm text-slate-500 hover:text-brand-600 transition-colors">
                                    นโยบายความเป็นส่วนตัว
                                </Link>
                            </li>
                        </ul>
                        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <QrCode size={14} />
                            รองรับชำระเงินผ่าน PromptPay
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-3">ติดต่อ</h3>
                        <ul className="flex flex-col gap-2">
                            <li>
                                <a
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="inline-flex items-start gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors"
                                >
                                    <Mail size={15} className="shrink-0 mt-0.5" />
                                    <span className="break-all">{CONTACT_EMAIL}</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href={FACEBOOK_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-start gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors"
                                >
                                    {/* lucide รุ่นนี้ถอดไอคอนแบรนด์ออกไปแล้ว (ไม่มี Facebook) — ใช้ path โลโก้ตรงๆ แทน */}
                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" className="shrink-0 mt-0.5">
                                        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
                                    </svg>
                                    <span>Fasttiw ขายข้อสอบเตรียม</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 text-center sm:text-left">
                    <p>© {new Date().getFullYear()} Fasttiw by Softwork Development — แนวข้อสอบพร้อมเฉลยละเอียด</p>
                    <p>แนวข้อสอบทั้งหมดจัดทำขึ้นใหม่</p>
                </div>
            </div>
        </footer>
    );
}
