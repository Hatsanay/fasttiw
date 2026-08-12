"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

// popover เล็กๆ ให้เลือกก่อนดาวน์โหลด — สลับลำดับข้อ/ตัวเลือก (default เปิด กันจำตำแหน่งคำตอบเหมือนหน้า
// ทำข้อสอบจริง) และแสดงเฉลยเต็ม+วิธีคิด (default ปิด เพราะเป็นเนื้อหาหลักที่ขายอยู่ ให้ลูกค้าเลือกเองว่า
// จะเอาออกไปด้วยไหม) ค่าที่เลือกถูกส่งเป็น query string ตรงไป Route Handler ที่ generate PDF จริง
export default function ExportPdfButton({ productId }: { productId: string }) {
    const [open, setOpen] = useState(false);
    const [shuffleOrder, setShuffleOrder] = useState(true);
    const [withAnswers, setWithAnswers] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    const href = `/api/products/${productId}/export-pdf?shuffle=${shuffleOrder ? "1" : "0"}&answers=${withAnswers ? "1" : "0"}`;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-[11px] text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
                <Download size={12} />
                ดาวน์โหลด PDF
            </button>
            {open && (
                <div className="absolute z-20 bottom-full left-0 right-0 mb-1.5 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <input
                            type="checkbox"
                            checked={shuffleOrder}
                            onChange={(e) => setShuffleOrder(e.target.checked)}
                            className="h-3 w-3 accent-brand-600"
                        />
                        สลับลำดับข้อ/ตัวเลือก
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <input
                            type="checkbox"
                            checked={withAnswers}
                            onChange={(e) => setWithAnswers(e.target.checked)}
                            className="h-3 w-3 accent-brand-600"
                        />
                        แสดงเฉลย+วิธีคิด
                    </label>
                    <a
                        href={href}
                        download
                        onClick={() => setOpen(false)}
                        className="mt-0.5 rounded-md bg-brand-600 py-1.5 text-center text-[11px] font-medium text-white hover:bg-brand-700 transition-colors"
                    >
                        ดาวน์โหลด
                    </a>
                </div>
            )}
        </div>
    );
}
