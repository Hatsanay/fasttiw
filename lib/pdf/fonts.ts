import { Font } from "@react-pdf/renderer";
import { join } from "node:path";

// ลงทะเบียนฟอนต์ของ PDF ทุกไฟล์ (ข้อสอบ, กระดาษคำตอบ) — import ไฟล์นี้ครั้งเดียวก็พอ (ลงทะเบียนตอนโหลด module)
//
// react-pdf ไม่ผ่าน Next.js font loader เลย (คนละ render pipeline) ต้องลงทะเบียนไฟล์ฟอนต์ตรงๆ เอง
// เหมือนที่ opengraph-image.tsx ทำไว้แล้ว — ต้องมี glyph ไทยฝังในไฟล์ ใช้ next/font/google ไม่ได้
Font.register({
    family: "Kanit",
    fonts: [
        { src: join(process.cwd(), "app/assets/Kanit-Regular.ttf"), fontWeight: "normal" },
        { src: join(process.cwd(), "app/assets/Kanit-SemiBold.ttf"), fontWeight: "semibold" },
    ],
});
// ฟอนต์สำรองสำหรับเครื่องหมายที่ Kanit ไม่มี (2026-09-27) — ⊕ ⊗ □ ★ ◯ ⋄ ✓ ฯลฯ ที่แอดมินแทรกจากแถบสูตร
// (เครื่องหมายนิยามพิเศษ) · react-pdf เลือกฟอนต์รายตัวอักษรตามลำดับใน `fontFamily` ข้อความไทยจึงยังใช้ Kanit ทั้งหมด
// · ใช้ฟอนต์ของ KaTeX เพราะบนเว็บวาดเครื่องหมายพวกนี้ด้วยฟอนต์ชุดนี้อยู่แล้ว (สัญญาอนุญาต MIT) — เครื่องหมายที่
// เว็บแสดงได้ PDF ก็มีครบ · ไม่มีตัวหนา ตัวอักษรหนาใช้ตัวปกติแทน
Font.register({ family: "KaTeXMain", src: join(process.cwd(), "app/assets/KaTeX_Main-Regular.ttf") });
Font.register({ family: "KaTeXAMS", src: join(process.cwd(), "app/assets/KaTeX_AMS-Regular.ttf") });

export const PDF_FONT_FAMILY = ["Kanit", "KaTeXMain", "KaTeXAMS"];
