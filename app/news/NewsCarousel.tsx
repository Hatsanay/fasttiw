"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { newsImageUrl, type NewsBlockItem } from "@/lib/api";

const ROTATE_MS = 5000;

// เลื่อนอัตโนมัติ + มีลูกศร/จุดให้กดเองด้วย — กดเองแล้วรีเซ็ตนาฬิกาเลื่อนอัตโนมัติใหม่ กันแย่งกันเปลี่ยน
// สไลด์ทันทีที่ผู้ใช้เพิ่งเลือกเอง
// fillHeight — ปกติ Carousel คุมความสูงเองด้วย aspect-ratio 16:9 (ใช้ตอนเป็น widget เดี่ยวในฟีดหลัก ที่ไม่มี
// กรอบความสูงตายตัวจากใครมาบังคับ) แต่ถ้าอยู่ในช่องของ widget "สร้างเอง" บนเดสก์ท็อป ช่องนั้นมีความสูงตายตัว
// จากกริดที่แอดมินจัดวางไว้แล้ว (ผ่าน gridRow) การบังคับ aspect-ratio ของตัวเองทับอีกชั้นจะทำให้สูงเกินช่องที่
// จัดไว้ ล้นทับ (การ์ด/component) ตัวถัดไปข้างล่าง เห็นเป็นรูปทับกัน ปุ่ม/ข้อความหาย — fillHeight=true จึงสั่งให้
// เต็มความสูงของช่องที่ห่อไว้แทน (h-full) ไม่บังคับ aspect-ratio ของตัวเอง
export default function NewsCarousel({ items, fillHeight }: { items: NewsBlockItem[]; fillHeight?: boolean }) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (items.length <= 1) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
        return () => clearInterval(timer);
    }, [items.length, index]);

    if (items.length === 0) return null;

    function goTo(i: number) {
        setIndex((i + items.length) % items.length);
    }

    const current = items[index];
    const imageUrl = newsImageUrl(current.item_image_url);

    return (
        <div className={cn("relative rounded-xl overflow-hidden bg-slate-100 border border-slate-100", fillHeight && "h-full")}>
            <div className="relative w-full" style={fillHeight ? { height: "100%" } : { aspectRatio: "16 / 9" }}>
                {imageUrl && <Image src={imageUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 1100px" />}
                {(current.item_title || current.item_text) && (
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-4 sm:p-5 flex flex-col gap-1">
                        {current.item_title && <h3 className="text-white font-semibold text-base sm:text-lg">{current.item_title}</h3>}
                        {current.item_text && <p className="text-white/85 text-sm line-clamp-2">{current.item_text}</p>}
                        {current.item_link_url && (
                            <Link
                                href={current.item_link_url}
                                target={current.item_link_url.startsWith("http") ? "_blank" : undefined}
                                rel={current.item_link_url.startsWith("http") ? "noopener noreferrer" : undefined}
                                className="mt-1 inline-flex items-center self-start text-xs font-medium text-white bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 transition-colors"
                            >
                                {current.item_link_label || "ดูเพิ่มเติม"}
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {items.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(index - 1)}
                        aria-label="สไลด์ก่อนหน้า"
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/70 hover:bg-white text-slate-700 shadow-sm transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(index + 1)}
                        aria-label="สไลด์ถัดไป"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/70 hover:bg-white text-slate-700 shadow-sm transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                        {items.map((it, i) => (
                            <button
                                key={it.item_id ?? it.key ?? i}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-label={`ไปสไลด์ที่ ${i + 1}`}
                                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75")}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
