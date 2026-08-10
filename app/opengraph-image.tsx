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
    const kanit = await readFile(join(process.cwd(), "app/assets/Kanit-SemiBold.ttf"));

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
                    background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)",
                    fontFamily: "Kanit",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 96,
                        height: 96,
                        borderRadius: 9999,
                        background: "rgba(255,255,255,0.15)",
                        marginBottom: 32,
                    }}
                >
                    <div style={{ display: "flex", fontSize: 48 }}>📘</div>
                </div>
                <div style={{ display: "flex", fontSize: 72, fontWeight: 600, color: "white" }}>Fasttiw</div>
                <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.9)", marginTop: 16 }}>
                    แนวข้อสอบออนไลน์พร้อมเฉลยละเอียด
                </div>
            </div>
        ),
        { ...size, fonts: [{ name: "Kanit", data: kanit, style: "normal", weight: 600 }] }
    );
}
