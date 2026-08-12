import { Megaphone } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getPublicNewsFeed } from "@/lib/api";
import NewsFeedCard from "./NewsFeedCard";

export const metadata = {
    title: "ข่าวสาร",
    description: "ข่าวสารและประกาศล่าสุดจากทีมงาน เช่น แนวข้อสอบชุดใหม่ โปรโมชั่น และการปรับปรุงระบบ",
};

// ไม่มี "โพสต์" แยกให้คลิกเข้าไปดูทีละอันอีกต่อไป — เห็นทั้งฟีด (ทุก widget ที่แอดมิน publish ไว้) ในหน้า
// เดียวนี้เลย เหมือนหน้า landing page ที่แอดมินจัดวางไว้
export default async function NewsFeedPage() {
    const blocks = await getPublicNewsFeed();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-360 mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-1">ข่าวสาร</h1>
                <p className="text-sm text-slate-500 mb-8">ประกาศและอัปเดตล่าสุดจากทีมงาน</p>

                {blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Megaphone size={40} className="mb-3" />
                        <p>ยังไม่มีข่าวสารในตอนนี้</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {blocks.map((block) => <NewsFeedCard key={block.blk_id} block={block} />)}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
