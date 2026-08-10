"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, BookOpen, Layers, Settings, LogOut, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_LINKS } from "./navLinks";
import { logoutAction } from "@/app/actions/auth";

type Props = {
    session: boolean;
    fullName: string | null;
    avatarUrl: string | null;
};

export default function MobileNav({ session, fullName, avatarUrl }: Props) {
    const [mounted, setMounted] = useState(false); // อยู่ใน DOM (ไว้เล่น transition ตอนปิด)
    const [visible, setVisible] = useState(false); // trigger class ให้ slide เข้า/ออก

    function openMenu() {
        setMounted(true);
    }

    function closeMenu() {
        setVisible(false);
        setTimeout(() => setMounted(false), 300); // รอ transition จบก่อนค่อยเอาออกจาก DOM จริง
    }

    // เปิด transition ในเฟรมถัดไปหลัง mount เพื่อให้ browser เล่น transform จาก translate-x-full ได้จริง
    useEffect(() => {
        if (mounted) {
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        }
    }, [mounted]);

    // กันเลื่อนหน้าเว็บด้านหลังตอน sidebar เปิดอยู่
    useEffect(() => {
        document.body.style.overflow = mounted ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mounted]);

    return (
        <>
            <button
                type="button"
                onClick={openMenu}
                className="flex h-9 w-9 items-center justify-center text-slate-600 hover:text-brand-600 transition-colors"
                aria-label="เปิดเมนู"
            >
                <Menu size={22} />
            </button>

            {mounted &&
                createPortal(
                    // portal ออกไปที่ body ตรงๆ — ถ้า render ซ้อนใต้ header ที่มี backdrop-blur จะโดน
                    // backdrop-filter ของ header ทำให้ position:fixed กลายเป็น fixed แค่ในกรอบ header (สูงแค่ 64px)
                    // ไม่ใช่เต็มจอ (containing block ของ filter/backdrop-filter ครอบ fixed descendant ไว้)
                    <div className="fixed inset-0 z-50 flex justify-start">
                        <div
                            className={cn(
                                "absolute inset-0 bg-slate-900/50 transition-opacity duration-300",
                                visible ? "opacity-100" : "opacity-0"
                            )}
                            onClick={closeMenu}
                        />
                        <aside
                            className={cn(
                                "relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-xl transition-transform duration-300 ease-out",
                                visible ? "translate-x-0" : "-translate-x-full"
                            )}
                        >
                            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
                                {session ? (
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {avatarUrl ? (
                                            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50">
                                                <Image src={avatarUrl} alt={fullName ?? "โปรไฟล์"} fill className="object-cover" sizes="32px" />
                                            </span>
                                        ) : (
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                                <User size={16} />
                                            </span>
                                        )}
                                        <span className="truncate text-sm font-medium text-slate-800">{fullName ?? "บัญชีของฉัน"}</span>
                                    </div>
                                ) : (
                                    <span className="font-semibold text-slate-800">เมนู</span>
                                )}
                                <button
                                    type="button"
                                    onClick={closeMenu}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 hover:text-slate-700"
                                    aria-label="ปิดเมนู"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <nav className="flex-1 overflow-y-auto py-2">
                                <Link
                                    href="/products"
                                    onClick={closeMenu}
                                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600"
                                >
                                    <BookOpen size={18} />
                                    แนวข้อสอบทั้งหมด
                                </Link>
                                <Link
                                    href="/packages"
                                    onClick={closeMenu}
                                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600"
                                >
                                    <Layers size={18} />
                                    แพ็กเกจสุดคุ้ม
                                </Link>
                                {session &&
                                    NAV_LINKS.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={closeMenu}
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600"
                                        >
                                            <link.icon size={18} />
                                            {link.label}
                                        </Link>
                                    ))}
                                {session && (
                                    <Link
                                        href="/account"
                                        onClick={closeMenu}
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600"
                                    >
                                        <Settings size={18} />
                                        บัญชีของฉัน
                                    </Link>
                                )}
                            </nav>

                            <div className="shrink-0 border-t border-slate-100 p-3">
                                {session ? (
                                    <form action={logoutAction}>
                                        <button
                                            type="submit"
                                            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
                                        >
                                            <LogOut size={18} />
                                            ออกจากระบบ
                                        </button>
                                    </form>
                                ) : (
                                    <Link
                                        href="/login"
                                        onClick={closeMenu}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                                    >
                                        เข้าสู่ระบบ
                                    </Link>
                                )}
                            </div>
                        </aside>
                    </div>,
                    document.body
                )}
        </>
    );
}
