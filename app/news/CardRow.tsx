"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { newsImageUrl, type NewsBlockItem } from "@/lib/api";
import { useIsMobile } from "@/lib/useIsMobile";
import NewsCardItem from "./NewsCardItem";

// "ชุด Card" แสดงเป็นแถวเลื่อนแนวนอน (ไม่ตกบรรทัด) เห็นทีละ itemsPerView ชิ้นตามที่แอดมินตั้งไว้ ถ้ามี
// card มากกว่านั้นจะมีลูกศรซ้าย-ขวาเลื่อนดูหน้าถัดไป (เหมือน Carousel แต่เห็นทีละหลายชิ้นแทนทีละสไลด์)
// fillHeight — เหมือนของ NewsCarousel: ใช้ตอนอยู่ในช่องของ widget "สร้างเอง" บนเดสก์ท็อป (ช่องมีความสูง
// ตายตัวจากกริดอยู่แล้ว) ให้การ์ดแต่ละใบยืดเต็มความสูงช่องแทนที่จะปล่อยให้รูป 16:9 ของแต่ละใบกำหนดความสูงเอง
// (ซึ่งอาจสูงเกินช่องที่จัดไว้ ล้นทับ component ถัดไปข้างล่างเหมือนที่เจอกับ Carousel)
export default function CardRow({ items, itemsPerView, fillHeight }: { items: NewsBlockItem[]; itemsPerView: number; fillHeight?: boolean }) {
    const isMobile = useIsMobile();
    // จอแคบเกินกว่าจะยัด itemsPerView ตามที่แอดมินตั้งไว้ (เช่น 4-8 ชิ้น) ให้พอดูออก จึงจำกัดเพดานไว้ที่ 2
    // เสมอตอนเป็น mobile ไม่ว่าแอดมินจะตั้งไว้เท่าไหร่ก็ตาม
    const perView = Math.max(1, Math.min(isMobile ? 2 : 8, itemsPerView || 4));
    const totalPages = Math.max(1, Math.ceil(items.length / perView));
    const [page, setPage] = useState(0);

    if (items.length === 0) return null;

    const visible = items.slice(page * perView, page * perView + perView);
    const canGoPrev = page > 0;
    const canGoNext = page < totalPages - 1;
    const imageSizes = `(max-width: 767px) ${Math.round(100 / Math.min(perView, items.length))}vw, ${Math.round(1100 / Math.min(perView, items.length))}px`;

    return (
        <div className={cn("relative", fillHeight && "h-full")}>
            <div
                className={cn("grid gap-3", fillHeight && "h-full")}
                style={{ gridTemplateColumns: `repeat(${Math.min(perView, items.length)}, minmax(0, 1fr))` }}
            >
                {visible.map((item, i) => (
                    <NewsCardItem
                        key={item.item_id ?? item.key ?? i}
                        imageUrl={newsImageUrl(item.item_image_url)}
                        title={item.item_title}
                        text={item.item_text}
                        linkUrl={item.item_link_url}
                        linkLabel={item.item_link_label}
                        sizes={imageSizes}
                        fillHeight={fillHeight}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={!canGoPrev}
                        aria-label="ก่อนหน้า"
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={!canGoNext}
                        aria-label="ถัดไป"
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 p-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* fillHeight: จุดบอกหน้าต้องลอยทับ (absolute) แทนอยู่ใน flow ปกติ (mt-3) เพราะ flow ปกติ
                        จะบวกความสูงเพิ่มเกินช่องที่กริดจัดไว้ให้ (h-full ด้านบนเต็มพอดีแล้ว เพิ่มอะไรเข้าไปอีก
                        คือสูงเกิน ล้นทับ component ถัดไปข้างล่างเหมือนบั๊กที่เจอ) */}
                    <div className={cn("flex justify-center gap-1.5", fillHeight ? "absolute bottom-1.5 inset-x-0" : "mt-3")}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setPage(i)}
                                aria-label={`หน้า ${i + 1}`}
                                className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    i === page ? "w-4 bg-brand-500" : "w-1.5 bg-slate-200 hover:bg-slate-300",
                                    fillHeight && "shadow-sm ring-1 ring-white/60"
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
