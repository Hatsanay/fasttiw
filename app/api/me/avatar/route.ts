import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// อัปโหลดรูปโปรไฟล์ — รับ multipart แล้วส่งต่อให้ backend ทั้งก้อน (ไม่แตะไฟล์เอง)
//
// มีไว้ให้ OnboardingModal เรียกตอนจบขั้นตอน เพราะตัว modal ย้ายออกจาก Server Action ไปแล้ว
// (WAF บล็อกสตริง `$@` ที่มากับฟอร์ม Server Action — ดู app/api/auth/login/route.ts)
// ส่วนหน้า /account ยังใช้ `uploadAvatarAction` แบบเดิมอยู่ ตามที่ตัดสินใจไว้ว่าไม่ย้าย
//
// ไม่ต้องตรวจชนิด/ขนาดไฟล์ซ้ำที่นี่ — backend ตรวจอยู่แล้วทั้ง fileFilter (เฉพาะ image/*) และเพดาน 10MB
// แล้วยัง re-encode ด้วย sharp ทุกไฟล์ ทำให้ metadata แปลกปลอมที่แนบมาถูกทิ้งไปในตัว
export async function PUT(req: Request) {
    const formData = await req.formData().catch(() => null);
    const file = formData?.get("image");

    if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ message: "กรุณาเลือกไฟล์รูปภาพ" }, { status: 400 });
    }

    try {
        const forward = new FormData();
        forward.append("image", file);

        const res = await authorizedFetch("/store/me/image", { method: "PUT", body: forward });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json({ message: data.message ?? "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่" }, { status: res.status || 500 });
        }
        return NextResponse.json({ cus_avatar_url: data.cus_avatar_url });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}
