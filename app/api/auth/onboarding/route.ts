import { NextResponse } from "next/server";
import { authorizedFetch, setSessionCookie } from "@/lib/session";

// จบขั้นตอน onboarding (ตั้งรหัสผ่านใหม่ + กรอกข้อมูล + ยอมรับ PDPA) ของบัญชีที่แอดมินสร้างให้
//
// ย้ายออกจาก Server Action มาเป็น Route Handler เหมือน login/register — WAF ของโฮสต์ตอบ 403 ให้ทุก
// request ที่มีสตริง `$@` ซึ่ง Next แนบมากับฟอร์มที่ผูก useActionState เสมอ ด่านนี้เป็นด่านแรกของลูกค้า
// ที่จ่ายเงินแล้วและแอดมินเพิ่งสร้างบัญชีให้ (ช่องทางขายหลักของ MVP) ถ้าติดตรงนี้ = ลูกค้าเข้าใช้เว็บไม่ได้เลย
//
// ใช้ authorizedFetch เพราะ endpoint นี้ต้องแนบ token เดิมของ session ที่ล็อกอินค้างอยู่ (ต่างจาก
// login/register ที่ยังไม่มี session) — backend จะคืน token ใหม่ที่ mcp = false มาให้ตั้งทับ cookie เดิม
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const new_password = String(body?.new_password ?? "");
    const cus_fname = String(body?.cus_fname ?? "").trim();
    const cus_lname = String(body?.cus_lname ?? "").trim();
    const cus_email = String(body?.cus_email ?? "").trim();
    const cus_phone = String(body?.cus_phone ?? "").trim();
    const pdpa_consent = body?.pdpa_consent === true;

    // เช็คซ้ำที่ backend อีกชั้นเสมอ ตรงนี้แค่ตัดเคสที่รู้ผลอยู่แล้วออกก่อน
    if (new_password.length < 8) {
        return NextResponse.json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    }
    if (!cus_fname || !cus_lname || !cus_email) {
        return NextResponse.json({ message: "กรุณากรอกชื่อ นามสกุล และอีเมล" }, { status: 400 });
    }
    if (!pdpa_consent) {
        return NextResponse.json({ message: "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนใช้งาน" }, { status: 400 });
    }

    try {
        const res = await authorizedFetch("/store/me/onboarding", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_password, cus_fname, cus_lname, cus_email, cus_phone: cus_phone || null, pdpa_consent }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.token) {
            return NextResponse.json({ message: data.message ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status || 500 });
        }

        // token ใหม่ mcp = false — ตั้งทับ cookie เดิมเพื่อให้ modal onboarding หายไปหลังโหลดหน้าใหม่
        await setSessionCookie(data.token);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
