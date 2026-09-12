// โดเมนจริงของเว็บนี้เอง (ตรงข้ามกับ API_URL ใน lib/api.ts ที่ชี้ไป backend) — ใช้คำนวณ metadataBase,
// sitemap.xml, robots.txt เท่านั้น ต้องตั้ง NEXT_PUBLIC_SITE_URL เป็นโดเมนจริงก่อน deploy ใช้งานจริงเสมอ
// ไม่งั้น URL ในผลค้นหา/OG image จะยังชี้กลับมาที่ localhost
// ค่าเริ่มต้นเป็นพอร์ต 3001 ของร้านเอง (เดิมเป็น 3000 ซึ่งเป็นพอร์ตของหน้าแอดมิน — ไม่มีผลอะไรตอนมีแค่
// metadata/sitemap ใช้ แต่ callback ของ Google login ใช้ค่านี้ด้วย ถ้าผิดพอร์ต Google จะส่งผู้ใช้ไปหน้าแอดมิน)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
