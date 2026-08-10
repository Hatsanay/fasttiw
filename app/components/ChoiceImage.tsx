import Image from "next/image";
import { productCoverUrl } from "@/lib/api";

// รูปประกอบตัวเลือก — เล็กกว่า QuestionImage เพราะวางอยู่ในแถวตัวเลือกที่มีหลายอันเรียงกัน
// คืน null เงียบๆ ถ้าตัวเลือกนั้นไม่มีรูป
export default function ChoiceImage({ src }: { src: string | null }) {
    const url = productCoverUrl(src);
    if (!url) return null;

    return (
        <div className="relative mb-2 h-20 w-full max-w-40 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
            <Image src={url} alt="" fill className="object-contain" sizes="160px" />
        </div>
    );
}
