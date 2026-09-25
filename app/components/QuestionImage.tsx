"use client";

import { useState } from "react";
import { preload } from "react-dom";
import Image, { getImageProps } from "next/image";
import { Maximize2 } from "lucide-react";
import { productCoverUrl } from "@/lib/api";
import ImageLightbox from "@/app/components/ImageLightbox";

// รูปประกอบโจทย์ (ตาราง กราฟ รูปทรง) — ไม่บังคับสัดส่วนตายตัวเพราะภาพแต่ละแบบสัดส่วนต่างกันมาก
// ใช้กรอบสูงคงที่ + object-contain กันภาพยืด/ครอปเพี้ยน คืน null เงียบๆ ถ้าไม่มีรูป
//
// กดที่รูปเพื่อดูขนาดเต็มได้ — รูปโจทย์มักเป็นตาราง/กราฟที่ย่อลงมาแล้วอ่านตัวเลขไม่ออก โดยเฉพาะบนมือถือ
// ตัวนี้ไม่ได้อยู่ในปุ่มอะไร จึงใช้ <button> ครอบได้ตรงๆ (ต่างจาก ChoiceImage ที่อยู่ในปุ่มเลือกคำตอบ)
const SIZES = "(max-width: 640px) 100vw, 640px";

// โหลดรูปของข้อถัดไปไว้ล่วงหน้าระหว่างที่ผู้ใช้ยังอ่านข้อปัจจุบันอยู่ (2026-09-25) — ExamRunner เรียกตอนเปลี่ยนข้อ
// ใช้ getImageProps ด้วย sizes ชุดเดียวกับ <Image> ข้างล่างเป๊ะ จึงได้ URL ของ /_next/image ตัวเดียวกับที่จะแสดง
// = โหลดจาก cache ทันทีตอนกดข้อถัดไป · ⚠ แก้ sizes ที่ไหนต้องแก้ผ่านค่าคงที่นี้ ไม่งั้นโหลดล่วงหน้าผิดไฟล์เงียบๆ
export function preloadQuestionImage(src: string | null) {
    const url = productCoverUrl(src);
    if (!url) return;
    const { props } = getImageProps({ src: url, alt: "", fill: true, sizes: SIZES });
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "low" });
}

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
                <Image src={url} alt="" fill className="object-contain" sizes={SIZES} />
                <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/50 text-white opacity-80 transition-opacity group-hover:opacity-100">
                    <Maximize2 size={14} />
                </span>
            </button>

            <ImageLightbox url={url} open={zoomed} onClose={() => setZoomed(false)} />
        </>
    );
}
