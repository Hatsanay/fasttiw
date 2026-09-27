"use client";

import { useLayoutEffect, useRef, type ReactNode, type SVGProps } from "react";
import Image from "next/image";
import { CheckCircle2, Menu, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/cn";

// ชิ้นส่วนหน้าจอที่ฉากของมือถือจำลองใช้ร่วมกัน (flow-demo, paper-demo) — ดู PhoneScreen.tsx
// ⚠ หน้าตาต้องตรงกับหน้าจริงฝั่งมือถือ · ห้ามใช้ class ที่มี breakpoint (หน้าจอเสมือนกว้าง 375px เสมอ)

/** ข้อความที่พิมพ์ไปแล้ว ณ เวลา t (เริ่มพิมพ์ที่ start ตัวละ perChar ms) */
export function typed(text: string, t: number, start: number, perChar = 90) {
    if (t < start) return "";
    return text.slice(0, Math.floor((t - start) / perChar) + 1);
}

/**
 * หน้าจอ 1 หน้า: navbar ติดบน (sticky เหมือนจริง) + เนื้อหาที่เลื่อนได้
 * scrollTo = data-demo-anchor ของจุดที่อยากให้เลื่อนไปอยู่บนสุด — วัดตำแหน่งจริงจาก DOM ไม่ hardcode px
 * (ข้อความไทยตัดบรรทัดไม่เท่ากันในแต่ละชุด ถ้า hardcode ชุดชื่อยาวจะเลื่อนผิดที่)
 */
export function Page({
    nav,
    scrollTo,
    children,
    pageKey,
    overlay,
    className,
}: {
    // หน้าทำข้อสอบจริงไม่มี navbar (โหมดโฟกัส) — ไม่ส่งมา = ไม่มี
    nav?: ReactNode;
    className?: string;
    scrollTo?: string;
    children: ReactNode;
    pageKey: string;
    // ลอยทับหน้าจอ ไม่เลื่อนตามเนื้อหา (toast)
    overlay?: ReactNode;
}) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;
        const anchor = scrollTo ? content.querySelector<HTMLElement>(`[data-demo-anchor="${scrollTo}"]`) : null;
        const max = Math.max(0, content.scrollHeight - viewport.clientHeight);
        const y = anchor ? Math.min(max, Math.max(0, anchor.offsetTop - 16)) : 0;
        content.style.transform = `translateY(${-y}px)`;
    }, [scrollTo]);

    return (
        <div key={pageKey} className={cn("flow-page-in absolute inset-0 flex flex-col bg-white", className)}>
            {nav}
            <div ref={viewportRef} className="relative flex-1 overflow-hidden">
                <div ref={contentRef} className="relative transition-transform duration-700 ease-in-out">
                    {children}
                </div>
            </div>
            {overlay}
        </div>
    );
}

/** Navbar ฝั่งมือถือ (ตาม NavbarView ใน app/components/Navbar.tsx) */
export function DemoNavbar({ cartCount = 0 }: { cartCount?: number }) {
    return (
        <header className="relative z-10 shrink-0 bg-white/90 border-b border-slate-100">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center text-slate-600">
                        <Menu size={22} />
                    </span>
                    <Image src="/logo/fasttiw-logo.svg" alt="" width={145} height={40} className="h-auto w-[106px] shrink-0" />
                </div>
                <span data-demo="nav-cart" className="relative text-slate-600">
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                        <span className="flow-pop absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-medium text-white">
                            {cartCount}
                        </span>
                    )}
                </span>
            </div>
        </header>
    );
}

/** toast แบบ sonner (richColors, success) ที่หน้าเว็บใช้ */
export function DemoToast({ show, children }: { show: boolean; children: ReactNode }) {
    return (
        <div
            className={cn(
                "absolute inset-x-4 top-3 z-20 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-medium text-green-700 shadow-lg transition-all duration-300",
                show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
            )}
        >
            <CheckCircle2 size={16} className="shrink-0" />
            {children}
        </div>
    );
}

// QR จำลอง (ไม่ใช่รหัสชำระเงินจริง สแกนแล้วไม่ได้อะไร) — ลายสุ่มแบบคงที่ + มุมจับตำแหน่ง 3 มุมให้ดูเป็น QR
// คำนวณครั้งเดียวตอนโหลดไฟล์ (ฉากเรนเดอร์ใหม่ ~12 ครั้ง/วิ ไม่ต้องสุ่มใหม่ทุกครั้ง)
const QR_SIZE = 25;
const QR_CELLS: [number, number][] = (() => {
    const cells: [number, number][] = [];
    let seed = 7;
    const inFinder = (x: number, y: number) =>
        (x < 8 && y < 8) || (x >= QR_SIZE - 8 && y < 8) || (x < 8 && y >= QR_SIZE - 8);
    for (let y = 0; y < QR_SIZE; y++) {
        for (let x = 0; x < QR_SIZE; x++) {
            seed = (seed * 9301 + 49297) % 233280;
            if (!inFinder(x, y) && seed / 233280 > 0.52) cells.push([x, y]);
        }
    }
    return cells;
})();

/** ลาย QR จำลองเป็น <svg> — วางซ้อนใน SVG อื่นได้ (ส่ง x/y/width/height) หรือใช้เดี่ยวๆ ผ่าน FakeQr */
export function QrGlyph(props: SVGProps<SVGSVGElement>) {
    const n = QR_SIZE;
    const finder = (x: number, y: number) => (
        <g key={`f${x}-${y}`}>
            <rect x={x} y={y} width="7" height="7" />
            <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
            <rect x={x + 2} y={y + 2} width="3" height="3" />
        </g>
    );
    return (
        <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" fill="#0f172a" {...props}>
            <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
            {QR_CELLS.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
            ))}
            {finder(0, 0)}
            {finder(n - 7, 0)}
            {finder(0, n - 7)}
        </svg>
    );
}

export function FakeQr() {
    return <QrGlyph className="h-full w-full" />;
}
