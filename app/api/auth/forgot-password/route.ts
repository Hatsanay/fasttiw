import { NextResponse } from "next/server";
import { forwardedClientHeaders } from "@/lib/clientIp";

// ทั้ง 2 flow ของ "ลืมรหัสผ่าน" ใช้ Route Handler + fetch JSON จาก client แทน Server Action —
// ไม่ใช่เพราะ Server Action ทำไม่ได้ แต่เพราะ **WAF (ModSecurity) ของโฮสต์บล็อก request ที่มีสตริง `$@`**
// ซึ่ง Next ใส่ไว้ในฟอร์มทุกหน้าเป็นช่องซ่อน (`{"id":"...","bound":"$@1"}`) สำหรับกรณี JS ยังโหลดไม่เสร็จ
// — `$@` เป็นตัวแปรพิเศษของ shell กฎ OWASP CRS เลยมองว่าเป็น command injection แล้วตอบ 403 ทิ้ง
//
// ทดสอบยืนยันบน production จริงแล้ว (2026-09-04): POST ที่มี `$@1` ในเนื้อ request โดน 403 ทุกหน้า
// (/login, /register, /reset-password) ส่วน POST JSON ธรรมดาผ่านปกติ — ลูกค้าที่กดตั้งรหัสผ่านใหม่จึงเจอ
// หน้า error ทั้งที่โค้ดทุกฝั่งถูกต้อง และรหัสผ่านไม่ถูกเปลี่ยนจริงเพราะ request ไปไม่ถึงเซิร์ฟเวอร์เลย
//
// flow นี้เป็นทางรอดสุดท้ายของลูกค้าที่เข้าระบบไม่ได้ จึงเลือกวิธีที่ไม่ต้องพึ่งการตั้งค่าฝั่งโฮสต์
// (ส่วนหน้าอื่นยังใช้ Server Action ตามเดิม — ควรแก้กฎ WAF ที่ต้นทางอยู่ดี ดู CLAUDE.md ข้อ 6.2)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const cus_email = String(body?.cus_email ?? "").trim();

    if (!cus_email) {
        return NextResponse.json({ message: "กรุณากรอกอีเมล" }, { status: 400 });
    }

    try {
        const res = await fetch(`${API_URL}/store/auth/forgot-password`, {
            method: "POST",
            // ส่ง IP จริงของลูกค้าไปด้วย ให้ rate limit ฝั่ง backend นับแยกรายคนได้ (ดู lib/clientIp.ts)
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ cus_email }),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        // backend ล่ม/ต่อไม่ได้ — บอกกลางๆ ไม่หลุดรายละเอียดระบบภายในออกไปฝั่งลูกค้า
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
