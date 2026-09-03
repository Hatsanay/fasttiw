import type { MetadataRoute } from "next";

// PWA manifest — ทำให้ตอนผู้ใช้ "เพิ่มลงหน้าจอโฮม" บนมือถือได้ไอคอน/ชื่อ/สีของแบรนด์ถูกต้อง
// (ก่อนหน้านี้ไม่มีไฟล์นี้เลย Android จะ fallback ไปใช้ screenshot ของหน้าเว็บเป็นไอคอนแทน)
// ไอคอนชุดนี้มาจาก brand kit (`brand/favicon/` — ต้นฉบับ brand kit เก็บไว้นอก public/ จะไม่ถูก serve ออกเว็บ) — maskable เผื่อขอบไว้ให้ Android
// ครอปเป็นวงกลมได้โดยสัญลักษณ์ไม่ถูกตัด ส่วน theme_color/background_color ใช้ค่าที่ brand kit ล็อกไว้
// Next inject <link rel="manifest"> ให้เองจากไฟล์นี้ ไม่ต้องเพิ่ม tag ใน layout เอง
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Fasttiw — แนวข้อสอบพร้อมเฉลยละเอียด",
        short_name: "Fasttiw",
        description: "ทำแนวข้อสอบออนไลน์พร้อมเฉลยละเอียดทีละขั้นตอน",
        start_url: "/",
        display: "standalone",
        lang: "th",
        theme_color: "#2B5CE6",
        background_color: "#FFFFFF",
        icons: [
            { src: "/logo/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/logo/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/logo/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
