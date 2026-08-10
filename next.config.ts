import type { NextConfig } from "next";

const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003").origin;
const apiUrl = new URL(apiOrigin);

const nextConfig: NextConfig = {
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
