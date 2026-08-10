"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { newsImageUrl, extractYoutubeId, type NewsCustomCell } from "@/lib/api";
import { useIsMobile } from "@/lib/useIsMobile";
import NewsCardItem from "./NewsCardItem";
import CardRow from "./CardRow";
import NewsCarousel from "./NewsCarousel";

const ROW_HEIGHT_PX = 30; // ต้องตรงกับ ROW_HEIGHT ในหน้าออกแบบฝั่งแอดมิน (TemplateDesigner.tsx) เพื่อให้
                           // สัดส่วนช่องที่แอดมินจัดวางไว้ตรงกับที่ลูกค้าเห็นมากที่สุด

// เนื้อหาของ 1 ช่องในกริด — เหมือน widget ระดับบนสุดทุกประการ (ใช้ shape เดียวกันเป๊ะ) ต่างแค่ไม่มีทางซ้อน
// เป็น "custom" อีกชั้น (กันซ้อนไม่รู้จบ ฝั่ง backend บังคับไว้แล้วตั้งแต่ตอนบันทึก) — isMobile ต้องส่งเข้ามาแยก
// เพราะ "image"/"post" ต้องใช้วิธีกำหนดความสูงคนละแบบกันตามบริบทที่ห่อข้างนอก: เดสก์ท็อป (กริด) ผู้ห่อกำหนด
// ความสูงจริงมาให้แล้วผ่าน gridRow จึงใช้ h-full เต็มช่องได้เลย แต่มือถือ (เรียงซ้อนเป็น flex column ธรรมดา
// ไม่มีความสูงตายตัวจากผู้ห่อ) h-full จะไม่มีผล (parent สูง auto) กลายเป็นสูง 0 มองไม่เห็นรูปเลย ต้องคุมด้วย
// aspect-ratio แทนเหมือน widget ระดับบนสุดใน page.tsx ทำไว้
function CellContent({ cell, isMobile }: { cell: NewsCustomCell; isMobile: boolean }) {
    switch (cell.blk_type) {
        case "heading":
            return <h2 className="text-lg font-semibold text-slate-900">{cell.blk_text}</h2>;
        case "text":
            return <p className="text-slate-600 leading-relaxed whitespace-pre-line">{cell.blk_text}</p>;
        case "image": {
            const url = newsImageUrl(cell.blk_image_url);
            if (!url) return null;
            return (
                <div
                    className="relative w-full rounded-xl overflow-hidden bg-slate-100"
                    style={isMobile ? { aspectRatio: "16 / 9" } : { height: "100%" }}
                >
                    <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 550px" />
                </div>
            );
        }
        case "button":
            return (
                <Link
                    href={cell.blk_link_url ?? "#"}
                    target={cell.blk_link_url?.startsWith("http") ? "_blank" : undefined}
                    rel={cell.blk_link_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center justify-center rounded-full bg-brand-600 text-white font-medium px-6 py-2.5 hover:bg-brand-700 transition-colors"
                >
                    {cell.blk_text}
                </Link>
            );
        case "post": {
            const url = newsImageUrl(cell.blk_image_url);
            return (
                <div className={cn("flex flex-col gap-2", !isMobile && "h-full")}>
                    {url && (
                        <div
                            className="relative w-full rounded-xl overflow-hidden bg-slate-100"
                            style={isMobile ? { aspectRatio: "16 / 9" } : { flex: 1 }}
                        >
                            <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 550px" />
                        </div>
                    )}
                    {cell.blk_title && <h2 className="text-base font-semibold text-slate-900">{cell.blk_title}</h2>}
                    {cell.blk_text && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{cell.blk_text}</p>}
                </div>
            );
        }
        case "card":
            return (
                <NewsCardItem
                    imageUrl={newsImageUrl(cell.blk_image_url)}
                    title={cell.blk_title}
                    text={cell.blk_text}
                    linkUrl={cell.blk_link_url}
                    linkLabel={cell.blk_link_label}
                    fillHeight={!isMobile}
                />
            );
        case "card_set":
            return <CardRow items={cell.items} itemsPerView={cell.blk_items_per_view} fillHeight={!isMobile} />;
        case "carousel":
            return <NewsCarousel items={cell.items} fillHeight={!isMobile} />;
        case "youtube": {
            const videoId = extractYoutubeId(cell.blk_link_url);
            if (!videoId) return null;
            return (
                <div
                    className="relative w-full rounded-xl overflow-hidden bg-slate-100"
                    style={isMobile ? { aspectRatio: "16 / 9" } : { height: "100%" }}
                >
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="วิดีโอ YouTube"
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>
            );
        }
        default:
            return null;
    }
}

// widget "สร้างเอง" — เดสก์ท็อปแสดงตามตำแหน่ง/ขนาดกริดที่แอดมินจัดวางไว้เป๊ะ (CSS grid 12 คอลัมน์) ส่วน
// มือถือจอแคบเกินกว่าจะรักษาผังกริดให้ดูดีได้ จึงเรียงซ้อนตามลำดับที่อ่านธรรมชาติแทน (บนลงล่าง ซ้ายไปขวา)
export default function NewsCustomWidget({ cells }: { cells: NewsCustomCell[] }) {
    const isMobile = useIsMobile();

    if (isMobile) {
        const sorted = [...cells].sort((a, b) => (a.y - b.y) || (a.x - b.x));
        return (
            <div className="flex flex-col gap-4">
                {sorted.map((c) => <CellContent key={c.key} cell={c} isMobile />)}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-12 gap-3" style={{ gridAutoRows: `${ROW_HEIGHT_PX}px` }}>
            {cells.map((c) => (
                // overflow-hidden กันไว้อีกชั้น (นอกจาก fillHeight ที่ทำให้ carousel/ชุด Card/Card ยืดพอดีช่อง
                // อยู่แล้ว) เผื่อกรณีเนื้อหาจริง (เช่น ข้อความยาวเกินไปในช่องที่ตั้งไว้เตี้ย) ยังดันความสูงเกิน
                // ช่องที่แอดมินจัดวางไว้อยู่ดี — ตัดขอบเนื้อหาส่วนเกินแทนที่จะปล่อยให้ล้นทับ component ถัดไป
                // ข้างล่าง (ต่างจากหน้าแก้ไขฝั่งแอดมินที่ใช้ overflow-auto ให้เลื่อนดูได้ เพราะที่นี่เป็นหน้า
                // อ่านอย่างเดียวของลูกค้า มีสกรอลบาร์เล็กๆ ในช่องกริดจะดูแปลกกว่าการตัดเนื้อหาส่วนเกินทิ้งไปเฉยๆ)
                <div key={c.key} className="overflow-hidden" style={{ gridColumn: `${c.x + 1} / span ${c.w}`, gridRow: `${c.y + 1} / span ${c.h}` }}>
                    <CellContent cell={c} isMobile={false} />
                </div>
            ))}
        </div>
    );
}
