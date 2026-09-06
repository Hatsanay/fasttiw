"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { productCoverUrl } from "@/lib/api";
import ImageLightbox from "@/app/components/ImageLightbox";

// รูปประกอบโจทย์ (ตาราง กราฟ รูปทรง) — ไม่บังคับสัดส่วนตายตัวเพราะภาพแต่ละแบบสัดส่วนต่างกันมาก
// ใช้กรอบสูงคงที่ + object-contain กันภาพยืด/ครอปเพี้ยน คืน null เงียบๆ ถ้าไม่มีรูป
//
// กดที่รูปเพื่อดูขนาดเต็มได้ — รูปโจทย์มักเป็นตาราง/กราฟที่ย่อลงมาแล้วอ่านตัวเลขไม่ออก โดยเฉพาะบนมือถือ
// ตัวนี้ไม่ได้อยู่ในปุ่มอะไร จึงใช้ <button> ครอบได้ตรงๆ (ต่างจาก ChoiceImage ที่อยู่ในปุ่มเลือกคำตอบ)
export default function QuestionImage({ src }: { src: string | null }) {
    const [zoomed, setZoomed] = useState(false);
    const url = productCoverUrl(src);
    if (!url) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setZoomed(true)}
                aria-label="ดูรูปขนาดเต็ม"
                className="group relative mb-4 block h-56 w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-64"
            >
                <Image src={url} alt="" fill className="object-contain" sizes="(max-width: 640px) 100vw, 640px" />
                <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/50 text-white opacity-80 transition-opacity group-hover:opacity-100">
                    <Maximize2 size={14} />
                </span>
            </button>

            <ImageLightbox url={url} open={zoomed} onClose={() => setZoomed(false)} />
        </>
    );
}
