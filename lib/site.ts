// โดเมนจริงของเว็บนี้เอง (ตรงข้ามกับ API_URL ใน lib/api.ts ที่ชี้ไป backend) — ใช้คำนวณ metadataBase,
// sitemap.xml, robots.txt เท่านั้น ต้องตั้ง NEXT_PUBLIC_SITE_URL เป็นโดเมนจริงก่อน deploy ใช้งานจริงเสมอ
// ไม่งั้น URL ในผลค้นหา/OG image จะยังชี้กลับมาที่ localhost
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
