import type { NextConfig } from "next";

const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003").origin;
const apiUrl = new URL(apiOrigin);

const nextConfig: NextConfig = {
  // หน้าสาธารณะ (หน้าแรก แคตตาล็อก แพ็กเกจ ฯลฯ) ถูกประกอบเป็นหน้าสำเร็จรูปล่วงหน้า ส่วนที่ขึ้นกับตัวลูกค้า
  // (เมนูผู้ใช้ ป้าย "ซื้อแล้ว") ไหลตามมาในคำตอบเดียวกันผ่าน <Suspense> — ดูเหตุผลเต็มที่ ../CLAUDE.md ข้อ 5.5
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/uploads/**",
      },
    ],
    // Next.js 16 บล็อกการ optimize รูปจาก local IP โดย default (กัน SSRF) — เปิดไว้เฉพาะตอน
    // backend เป็น localhost ตอน dev เท่านั้น ตอน deploy จริง backend จะมี origin สาธารณะ
    // ไม่ใช่ local IP แล้ว จึงไม่กระทบ production
    dangerouslyAllowLocalIP: apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1",
  },
};

export default nextConfig;
