import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/session";
import { forwardedClientHeaders } from "@/lib/clientIp";

// เข้าสู่ระบบผ่าน Route Handler แทน Server Action — เหตุผลเดียวกับ ../forgot-password/route.ts:
// WAF ของโฮสต์ (ModSecurity rule React2Shell) ตอบ 403 ให้ทุก request ที่มีสตริง `$@` ในเนื้อ ซึ่ง Next
// แนบมากับฟอร์ม Server Action ทุกหน้าเป็นช่องซ่อนสำหรับกรณี JS ยังโหลดไม่เสร็จ ทำให้ลูกค้าที่กดปุ่มเร็ว
// กว่าที่หน้าเว็บจะพร้อมเจอหน้า error แทนที่จะได้เข้าระบบ
//
// **cookie ยังถูกตั้งฝั่ง server เหมือนเดิมทุกประการ** — Route Handler ตั้ง httpOnly cookie ได้เท่ากับ
// Server Action ตัว JWT จึงไม่เคยผ่านมือ JavaScript ฝั่ง client เลย (กฎเดิมใน tiwwai-store/CLAUDE.md)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const cus_username = String(body?.cus_username ?? "").trim();
    const cus_password = String(body?.cus_password ?? "");

    if (!cus_username || !cus_password) {
        return NextResponse.json({ message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" }, { status: 400 });
    }

    try {
        const res = await fetch(`${API_URL}/store/auth/login`, {
            method: "POST",
            // แนบ IP จริงของผู้ใช้ให้ rate limit ฝั่ง backend นับแยกรายคน (กันเดารหัสผ่านรัวๆ)
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify({ cus_username, cus_password }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.token) {
            return NextResponse.json({ message: data.message ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status || 500 });
        }

        await setSessionCookie(data.token);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
