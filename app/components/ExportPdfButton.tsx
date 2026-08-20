"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";

// popover เล็กๆ ให้เลือกก่อนดาวน์โหลด — สลับลำดับข้อ/ตัวเลือก (default เปิด กันจำตำแหน่งคำตอบเหมือนหน้า
// ทำข้อสอบจริง) และแสดงเฉลยเต็ม+วิธีคิด (default ปิด เพราะเป็นเนื้อหาหลักที่ขายอยู่ ให้ลูกค้าเลือกเองว่า
// จะเอาออกไปด้วยไหม) ค่าที่เลือกถูกส่งเป็น query string ตรงไป Route Handler ที่ generate PDF จริง
export default function ExportPdfButton({ productId }: { productId: string }) {
    const [open, setOpen] = useState(false);
    const [shuffleOrder, setShuffleOrder] = useState(true);
    const [withAnswers, setWithAnswers] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showSlowHint, setShowSlowHint] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    const href = `/api/products/${productId}/export-pdf?shuffle=${shuffleOrder ? "1" : "0"}&answers=${withAnswers ? "1" : "0"}`;

    // สร้าง PDF ฝั่ง server เป็น request-response เดียวจบ (ดึงคำถาม+แปลงรูป+render PDF ทั้งหมดเกิดก่อนไบต์
    // แรกจะถูกส่งออกมา) จึงไม่มี progress event จริงให้ดักฟังระหว่างทาง — จำลองความคืบหน้าแบบ ease-out ไต่ขึ้น
    // ไปแตะใกล้ 96% ระหว่างรอ แล้วค่อยกระโดดไป 100% ตอนไฟล์เสร็จจริง (ก่อนหน้านี้ใช้ <a href download> ธรรมดา
    // ซึ่งดาวน์โหลดแบบ native ไม่มีทาง hook เข้าไปโชว์อะไรระหว่างรอเลย)
    //
    // ตัวเลขที่ปัดเป็นจำนวนเต็มจะ "แช่" ที่ค่าเดิมได้พักใหญ่ถ้าไฟล์ใหญ่จริง (คำถาม/รูปภาพเยอะ) ดูเหมือนค้าง
    // ทั้งที่ยังทำงานอยู่จริง — แก้ 2 ทาง: (1) แถบ progress เองยัง pulse ตลอดเวลาไม่ว่าตัวเลขจะขยับหรือไม่
    // ให้เห็นว่ายังทำงานอยู่ (2) โชว์คำอธิบายเพิ่มหลังรอเกิน 6 วิ กันสับสนว่าทำไมนาน
    async function handleDownload() {
        setIsGenerating(true);
        setProgress(0);
        setShowSlowHint(false);
        setOpen(false);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const interval = setInterval(() => {
            setProgress((p) => p + (96 - p) * 0.04);
        }, 200);
        const slowHintTimeout = setTimeout(() => setShowSlowHint(true), 6000);

        try {
            const res = await fetch(href, { signal: controller.signal });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? "สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่");
            }
            const blob = await res.blob();
            clearInterval(interval);
            clearTimeout(slowHintTimeout);
            setProgress(100);
            setShowSlowHint(false);

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `fasttiw-${productId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);

            setTimeout(() => {
                setIsGenerating(false);
                setProgress(0);
            }, 500);
        } catch (err) {
            clearInterval(interval);
            clearTimeout(slowHintTimeout);
            setIsGenerating(false);
            setProgress(0);
            setShowSlowHint(false);
            // ผู้ใช้กดยกเลิกเอง (handleCancel) — ไม่ใช่ความผิดพลาดจริง ไม่ต้องขึ้น toast แจ้ง error
            if (err instanceof DOMException && err.name === "AbortError") return;
            toast.error(err instanceof Error ? err.message : "สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            abortControllerRef.current = null;
        }
    }

    // ยกเลิกฝั่ง client เท่านั้น (หยุดรอ response แล้วคืนปุ่มให้กดใหม่ได้ทันที) — การประมวลผลฝั่ง server
    // (ดึงคำถาม/แปลงรูป/render PDF) อาจยังทำต่อจนจบอยู่เบื้องหลังสั้นๆ ก่อนถูกทิ้งไป แต่ผู้ใช้ไม่ต้องรอแล้ว
    function handleCancel() {
        abortControllerRef.current?.abort();
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => (isGenerating ? handleCancel() : setOpen((v) => !v))}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] transition-colors ${
                    isGenerating
                        ? "border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                        : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"
                }`}
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={12} className="animate-spin" />
                        กำลังสร้างไฟล์... {Math.round(progress)}%
                        <X size={12} className="ml-0.5" />
                    </>
                ) : (
                    <>
                        <Download size={12} />
                        ดาวน์โหลด PDF
                    </>
                )}
            </button>

            {isGenerating && (
                <>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full animate-pulse rounded-full bg-brand-500 transition-[width] duration-200 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {showSlowHint && (
                        <p className="mt-1 text-center text-[10px] leading-snug text-slate-400">
                            ใช้เวลานานกว่าปกติถ้าชุดข้อสอบมีรูปภาพหรือจำนวนข้อเยอะ กำลังทำงานอยู่ กรุณารอสักครู่
                        </p>
                    )}
                </>
            )}

            {open && !isGenerating && (
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
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="mt-0.5 rounded-md bg-brand-600 py-1.5 text-center text-[11px] font-medium text-white hover:bg-brand-700 transition-colors"
                    >
                        ดาวน์โหลด
                    </button>
                </div>
            )}
        </div>
    );
}
