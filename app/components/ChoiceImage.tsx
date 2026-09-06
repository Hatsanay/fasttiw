"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { productCoverUrl } from "@/lib/api";
import ImageLightbox from "@/app/components/ImageLightbox";

// รูปประกอบตัวเลือก — เล็กกว่า QuestionImage เพราะวางอยู่ในแถวตัวเลือกที่มีหลายอันเรียงกัน
// คืน null เงียบๆ ถ้าตัวเลือกนั้นไม่มีรูป
//
// **ตัวนี้ถูกวางอยู่ข้างใน <button> ที่ใช้เลือกคำตอบ** (ดู ExamRunner) จึงห้ามใช้ <button> ซ้อนอีกชั้น
// (HTML ไม่ถูกต้อง เบราว์เซอร์จะจัดโครงสร้างใหม่เอง) — ใช้ <span role="button"> แทน แล้ว stopPropagation
// ไม่ให้การกดดูรูปไปเลือกคำตอบพร้อมกัน
//
// เจตนาออกแบบ: กดที่ "ตัวรูป" = เลือกคำตอบตามปกติ (คนส่วนใหญ่คาดหวังแบบนั้นเพราะรูปคือตัวเลือก)
// กดที่ "ปุ่มขยายมุมขวาล่าง" = ดูรูปเต็มจอ — แยกกันชัดเจน ไม่ต้องเดาว่าแตะแล้วจะเกิดอะไร
export default function ChoiceImage({ src }: { src: string | null }) {
    const [zoomed, setZoomed] = useState(false);
    const url = productCoverUrl(src);
    if (!url) return null;

    function openZoom(e: React.MouseEvent | React.KeyboardEvent) {
        e.preventDefault();
        e.stopPropagation();
        setZoomed(true);
    }

    return (
        <>
            <span className="relative mb-2 block h-20 w-full max-w-40 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                <Image src={url} alt="" fill className="object-contain" sizes="160px" />
                <span
                    role="button"
                    tabIndex={0}
                    aria-label="ดูรูปขนาดเต็ม"
                    onClick={openZoom}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openZoom(e); }}
                    className="absolute bottom-1 right-1 flex h-6 w-6 cursor-zoom-in items-center justify-center rounded-full bg-slate-900/50 text-white transition-colors hover:bg-slate-900/80"
                >
                    <Maximize2 size={11} />
                </span>
            </span>

            <ImageLightbox url={url} open={zoomed} onClose={() => setZoomed(false)} />
        </>
    );
}
