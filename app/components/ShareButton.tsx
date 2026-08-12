"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

// ใช้ Web Share API ก่อนถ้าเบราว์เซอร์รองรับ (ส่วนใหญ่คือมือถือ) ไม่งั้น fallback เป็นคัดลอกลิงก์ — ไม่ต้อง
// login เพราะแค่แชร์ URL หน้าสาธารณะ ไม่ได้แตะข้อมูลส่วนตัวใดๆ
export default function ShareButton({
    url,
    title,
    className = "",
}: {
    url: string;
    title: string;
    className?: string;
}) {
    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const fullUrl = new URL(url, window.location.origin).toString();

        if (navigator.share) {
            try {
                await navigator.share({ title, url: fullUrl });
            } catch {
                // ผู้ใช้ปิด share sheet เอง ไม่ต้องแจ้งอะไรเพิ่ม
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(fullUrl);
            toast.success("คัดลอกลิงก์แล้ว");
        } catch {
            toast.error("คัดลอกลิงก์ไม่สำเร็จ");
        }
    };

    return (
        <button
            type="button"
            onClick={handleShare}
            aria-label="แชร์"
            title="แชร์"
            className={`flex items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur hover:bg-white hover:text-brand-600 transition-colors ${className}`}
        >
            <Share2 size={14} />
        </button>
    );
}
