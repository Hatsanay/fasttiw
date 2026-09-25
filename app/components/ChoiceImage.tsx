"use client";

import { useState } from "react";
import { preload } from "react-dom";
import Image, { getImageProps } from "next/image";
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
const SIZES = "160px";

// โหลดรูปของข้อถัดไปไว้ล่วงหน้าระหว่างที่ผู้ใช้ยังอ่านข้อปัจจุบันอยู่ (2026-09-25) — ExamRunner เรียกตอนเปลี่ยนข้อ
// ใช้ getImageProps ด้วย sizes ชุดเดียวกับ <Image> ข้างล่าง (รูปตัวเลือก)เป๊ะ จึงได้ URL ของ /_next/image ตัวเดียวกับที่จะแสดง
// = โหลดจาก cache ทันทีตอนกดข้อถัดไป · ⚠ แก้ sizes ที่ไหนต้องแก้ผ่านค่าคงที่นี้ ไม่งั้นโหลดล่วงหน้าผิดไฟล์เงียบๆ
export function preloadChoiceImage(src: string | null) {
    const url = productCoverUrl(src);
    if (!url) return;
    const { props } = getImageProps({ src: url, alt: "", fill: true, sizes: SIZES });
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "low" });
}

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
                <Image src={url} alt="" fill className="object-contain" sizes={SIZES} />
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
