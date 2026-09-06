"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

// ตัวแสดงรูปเต็มจอ — ใช้ร่วมกันทั้งรูปโจทย์และรูปตัวเลือก
//
// ทำไมต้องมี: รูปในข้อสอบส่วนใหญ่เป็นตาราง/กราฟ/รูปทรงที่มีรายละเอียดเล็ก ย่อลงมาอยู่ในกรอบสูง 224px
// แล้วอ่านไม่ออกจริงๆ โดยเฉพาะบนมือถือ ต้องกดขยายดูได้
//
// ใช้ position: fixed + z-50 จึงวางซ้อนได้ถูกต้องไม่ว่าจะถูกเรียกจากตรงไหนของหน้า (ไม่ต้องใช้ portal)
export default function ImageLightbox({ url, open, onClose }: { url: string; open: boolean; onClose: () => void }) {
    // ปิดด้วย Esc + ล็อกไม่ให้หน้าด้านหลังเลื่อนตามตอนเปิดอยู่ (บนมือถือถ้าไม่ล็อก การปัดเพื่อดูรูปจะไป
    // เลื่อนหน้าข้อสอบข้างหลังแทน)
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="ดูรูปขนาดเต็ม"
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                // ต้องมี z-10 — กล่องรูปด้านล่างกว้างเต็มพื้นที่และอยู่หลังปุ่มนี้ใน DOM ถ้าไม่ยกชั้นขึ้นมา
                // มันจะวาดทับปุ่ม X จนกดไม่โดน (เจอจริงตอนใช้งาน)
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
                <X size={20} />
            </button>

            {/* กล่องรูปกินพื้นที่เต็มจอ (fill ต้องการ parent ที่มีขนาดชัดเจน) จึงแทบไม่เหลือ "พื้นหลัง" ให้แตะ
                — ปล่อยให้คลิกทะลุไปถึง overlay ด้านนอกแทนการ stopPropagation จะได้ปิดได้จากทุกจุดจริงๆ
                ตามที่ข้อความด้านล่างบอกไว้ (การซูมด้วยสองนิ้วเป็น gesture ไม่ใช่ click จึงไม่ทำให้ปิด) */}
            <div className="relative h-full w-full">
                <Image
                    src={url}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="100vw"
                    // ไม่ผ่าน optimizer ของ Next — โหลดไฟล์ต้นฉบับตรงๆ ให้ได้ความละเอียดสูงสุดที่มี
                    // (backend ย่อรูปตอนอัปโหลดไว้ที่ไม่เกิน 1000x1000 อยู่แล้ว ดู saveResizedImage
                    //  จึงไม่มีปัญหาเรื่องไฟล์ใหญ่เกิน และเป็น .webp ทุกไฟล์ซึ่งเบราว์เซอร์รองรับหมดแล้ว)
                    unoptimized
                />
            </div>

            <p className="absolute bottom-5 left-0 right-0 text-center text-xs text-white/60">
                แตะที่ใดก็ได้หรือกด Esc เพื่อปิด
            </p>
        </div>
    );
}
