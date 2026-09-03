import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Fasttiw — แนวข้อสอบพร้อมเฉลยละเอียด";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// รูป OG เริ่มต้น (fallback) สำหรับหน้าที่ไม่มีรูปของตัวเอง (หน้าแรก, /products, /packages ฯลฯ) —
// หน้า product แต่ละชุดจะ override ด้วยรูปหน้าปกจริงของตัวเองผ่าน generateMetadata แทน
// ต้องฝัง font Kanit เอง (satori เรนเดอร์ภาษาไทยไม่ได้ถ้าไม่ส่ง font ที่มี glyph ไทยเข้าไปตรงๆ
// next/font/google ใช้กับ ImageResponse ไม่ได้ — โหลดไฟล์ .ttf จาก app/assets/ แทน)
export default async function Image() {
    const [kanit, logo] = await Promise.all([
        readFile(join(process.cwd(), "app/assets/Kanit-SemiBold.ttf")),
        // ใช้ logo-dark (ตัวอักษร+วงสีขาว) เพราะพื้นหลังเป็นสีน้ำเงิน — โลโก้หลัก/ไอคอนเป็นน้ำเงินพื้นใส
        // วางทับกันแล้วจะจมหายไปกับพื้น ส่วน lockup นี้มี wordmark อยู่ในตัวแล้ว จึงไม่ต้องพิมพ์ "Fasttiw" ซ้ำด้วย Kanit อีก
        readFile(join(process.cwd(), "public/logo/fasttiw-logo-dark.png")),
    ]);
    const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #1D3FA8 0%, #2B5CE6 55%, #5C86F0 100%)",
                    fontFamily: "Kanit",
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori) ต้องใช้ <img> ธรรมดา ใช้ next/image ไม่ได้ */}
                <img src={logoSrc} width={620} height={175} alt="" />
                <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.9)", marginTop: 40 }}>
                    แนวข้อสอบออนไลน์พร้อมเฉลยละเอียด
                </div>
            </div>
        ),
        { ...size, fonts: [{ name: "Kanit", data: kanit, style: "normal", weight: 600 }] }
    );
}
