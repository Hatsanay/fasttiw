import "server-only";
import { headers } from "next/headers";

// ส่ง IP จริงของลูกค้าต่อไปให้ backend เพื่อให้ rate limit นับแยกรายคนได้ถูกต้อง
//
// ทำไมต้องมีไฟล์นี้: ทุก request จากฝั่งลูกค้าวิ่งผ่านเซิร์ฟเวอร์ Next ก่อนเสมอ (Server Action / Route
// Handler เป็นคนถือ httpOnly JWT ไปคุยกับ backend) backend จึงเห็น IP ของเซิร์ฟเวอร์ Next เหมือนกันหมด
// ทุกคน ถ้าไม่ส่ง IP จริงไปด้วย ลูกค้าทั้งเว็บจะแชร์โควตา rate limit ก้อนเดียวกันแล้วล็อกกันเอง
//
// `x-internal-secret` คือตัวยืนยันว่า header นี้มาจากเซิร์ฟเวอร์เราจริง — ถ้าไม่มีตัวนี้ ใครก็ปลอม
// `x-client-ip` ยิงตรงเข้า backend เพื่อหนี rate limit ได้ (backend จะเชื่อ header ก็ต่อเมื่อ secret ตรง
// เท่านั้น ดู middlewares/rateLimit.middleware.js) — ไม่ได้ตั้ง secret ไว้ = ไม่ส่งอะไรเลย แล้ว backend
// จะถอยไปนับตาม IP ที่มันเห็นเอง (ยังทำงานได้ แค่หยาบกว่า)
export async function forwardedClientHeaders(): Promise<Record<string, string>> {
    const secret = process.env.INTERNAL_PROXY_SECRET;
    if (!secret) return {};

    const headerList = await headers();
    // x-forwarded-for อาจมีหลาย IP ต่อกัน (client, proxy1, proxy2) ตัวแรกคือ client จริง
    const ip = (headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? "").split(",")[0].trim();
    if (!ip) return {};

    return { "x-client-ip": ip, "x-internal-secret": secret };
}
