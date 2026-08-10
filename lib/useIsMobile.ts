"use client";

import { useEffect, useState } from "react";

// จุดตัด mobile/desktop เดียวที่ใช้ร่วมกันทั้งเว็บ (ตรงกับ breakpoint `md` ของ Tailwind และของ Navbar ที่พับเป็น
// sidebar ต่ำกว่า md เหมือนกัน) ก่อนหน้านี้ CardRow.tsx กับ NewsCustomWidget.tsx ต่างคนต่างประกาศ
// useIsMobile ของตัวเองด้วยค่าไม่ตรงกัน (639px vs 767px) ทำให้ที่ความกว้างจอ 640-767px widget สร้างเองมองว่า
// ตัวเองเป็น mobile (เรียงซ้อนแนวตั้ง) แต่ "ชุด Card" ที่ซ้อนอยู่ข้างในกลับมองว่ายังเป็น desktop (ใช้
// itemsPerView เต็มตามที่แอดมินตั้งไว้ได้ถึง 8) กลายเป็นการ์ดแคบเบียดกันในคอลัมน์เดียวที่เพิ่งถูกบีบให้แคบลง
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);
    return isMobile;
}
