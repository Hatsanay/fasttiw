"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

// คลังข้อสอบ/ประวัติ/bookmark ย้ายไปแสดงเป็นลิงก์หลักใน Navbar แล้ว (ดู navLinks.ts) เหลือแค่
// บัญชี+ออกจากระบบ ใน dropdown นี้ ไม่ต้องซ้ำกับที่โชว์อยู่แล้ว
const LINKS = [{ href: "/account", label: "บัญชีของฉัน", icon: Settings }];

export default function UserMenu({ fullName, avatarUrl }: { fullName: string | null; avatarUrl: string | null }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-brand-600 transition-colors"
                aria-label="เมนูบัญชี"
            >
                {avatarUrl ? (
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50">
                        <Image src={avatarUrl} alt={fullName ?? "โปรไฟล์"} fill className="object-cover" sizes="32px" />
                    </span>
                ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <User size={16} />
                    </span>
                )}
                {fullName && <span className="hidden sm:inline text-sm font-medium max-w-40 truncate">{fullName}</span>}
                <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-100 bg-white shadow-lg shadow-slate-200/70 py-1.5 z-50">
                    {LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                        >
                            <link.icon size={16} />
                            {link.label}
                        </Link>
                    ))}
                    <div className="my-1.5 border-t border-slate-100" />
                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={16} />
                            ออกจากระบบ
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
