import Image from "next/image";
import { productCoverUrl } from "@/lib/api";

// รูปประกอบโจทย์ (ตาราง กราฟ รูปทรง) — ไม่บังคับสัดส่วนตายตัวเพราะภาพแต่ละแบบสัดส่วนต่างกันมาก
// ใช้กรอบสูงคงที่ + object-contain กันภาพยืด/ครอปเพี้ยน คืน null เงียบๆ ถ้าไม่มีรูป
export default function QuestionImage({ src }: { src: string | null }) {
    const url = productCoverUrl(src);
    if (!url) return null;

    return (
        <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-64">
            <Image src={url} alt="" fill className="object-contain" sizes="(max-width: 640px) 100vw, 640px" />
        </div>
    );
}
