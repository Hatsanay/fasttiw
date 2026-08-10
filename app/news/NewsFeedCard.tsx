import Link from "next/link";
import Image from "next/image";
import { BookOpenCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import { newsImageUrl, extractYoutubeId, type NewsBlock } from "@/lib/api";
import NewsCarousel from "./NewsCarousel";
import NewsCardItem from "./NewsCardItem";
import CardRow from "./CardRow";
import NewsCustomWidget from "./NewsCustomWidget";

// หัวการ์ดแบบเดียวกับโพสต์ในฟีดโซเชียล (ตราสัญลักษณ์+ชื่อ+วันที่) ใช้ตราเดียวกับ Navbar (BookOpenCheck ใน
// วงกลม bg-brand-600) ให้ทุก widget อ่านเป็น "1 โพสต์" ที่แยกจากกันชัดเจน ไม่ว่าเนื้อหาข้างในจะเป็นแบบไหน
function PostHeader({ date }: { date: string }) {
    return (
        <div className="flex items-center gap-3 px-5 pt-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                <BookOpenCheck size={18} />
            </span>
            <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Fasttiw</p>
                <p className="text-xs text-slate-400">
                    {new Date(date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                </p>
            </div>
        </div>
    );
}

function Block({ block }: { block: NewsBlock }) {
    switch (block.blk_type) {
        case "heading":
            return <h2 className="text-lg font-semibold text-slate-900 max-w-prose">{block.blk_text}</h2>;
        case "text":
            return <p className="text-slate-600 leading-relaxed whitespace-pre-line max-w-prose">{block.blk_text}</p>;
        case "image": {
            const url = newsImageUrl(block.blk_image_url);
            if (!url) return null;
            return (
                <div className="relative w-full rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: "16 / 9" }}>
                    <Image src={url} alt="" fill className="object-contain" sizes="(max-width: 768px) 100vw, 1100px" />
                </div>
            );
        }
        case "button":
            return (
                <Link
                    href={block.blk_link_url ?? "#"}
                    target={block.blk_link_url?.startsWith("http") ? "_blank" : undefined}
                    rel={block.blk_link_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center justify-center rounded-full bg-brand-600 text-white font-medium px-6 py-2.5 hover:bg-brand-700 transition-colors self-start"
                >
                    {block.blk_text}
                </Link>
            );
        case "post": {
            const url = newsImageUrl(block.blk_image_url);
            return (
                <div className="flex flex-col gap-3">
                    {url && (
                        <div className="relative w-full rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: "16 / 9" }}>
                            <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 1100px" />
                        </div>
                    )}
                    {block.blk_title && <h2 className="text-lg font-semibold text-slate-900 max-w-prose">{block.blk_title}</h2>}
                    {block.blk_text && <p className="text-slate-600 leading-relaxed whitespace-pre-line max-w-prose">{block.blk_text}</p>}
                </div>
            );
        }
        case "card":
            return (
                <NewsCardItem
                    imageUrl={newsImageUrl(block.blk_image_url)}
                    title={block.blk_title}
                    text={block.blk_text}
                    linkUrl={block.blk_link_url}
                    linkLabel={block.blk_link_label}
                    sizes="(max-width: 768px) 100vw, 1100px"
                />
            );
        case "card_set":
            return <CardRow items={block.items} itemsPerView={block.blk_items_per_view} />;
        case "carousel":
            return <NewsCarousel items={block.items} />;
        case "custom":
            return <NewsCustomWidget cells={block.blk_custom_structure ?? []} />;
        case "youtube": {
            const videoId = extractYoutubeId(block.blk_link_url);
            if (!videoId) return null;
            return (
                <div className="relative w-full rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: "16 / 9" }}>
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

// การ์ด 1 โพสต์ในฟีดข่าวสาร — ใช้ร่วมกันทั้งหน้า /news (ฟีดเต็ม) และ section ข่าวสารที่หน้าแรก (teaser
// เฉพาะ widget ที่แอดมินติ๊ก "เผยแพร่ใน landing page" ไว้) หน้าตาต้องเหมือนกันเป๊ะทั้งสองที่ จึงรวมไว้ที่เดียว
export default function NewsFeedCard({ block }: { block: NewsBlock }) {
    return (
        <Card className="overflow-hidden">
            <PostHeader date={block.blk_updated_at} />
            <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6 flex flex-col gap-3">
                <Block block={block} />
            </div>
        </Card>
    );
}
