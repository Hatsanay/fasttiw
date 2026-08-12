import Link from "next/link";
import Image from "next/image";
import { QrCode } from "lucide-react";

const LEARN_LINKS = [
    { href: "/products", label: "แนวข้อสอบทั้งหมด" },
    { href: "/packages", label: "แพ็กเกจสุดคุ้ม" },
];

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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="sm:col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-800">
                            <Image src="/logo/favicon.svg" alt="Fasttiw" width={32} height={32} className="shrink-0" />
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
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 text-center sm:text-left">
                    <p>© {new Date().getFullYear()} Fasttiw — แนวข้อสอบพร้อมเฉลยละเอียด</p>
                    <p>แนวข้อสอบทั้งหมดจัดทำขึ้นใหม่ ไม่ใช่ข้อสอบจริง</p>
                </div>
            </div>
        </footer>
    );
}
