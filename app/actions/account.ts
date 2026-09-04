"use server";

import { authorizedFetch } from "@/lib/session";

// onboarding ย้ายไปเป็น Route Handler ที่ `app/api/auth/onboarding/route.ts` แล้ว (2026-09-04)
// เพราะ WAF ของโฮสต์ตอบ 403 ให้ทุก request ที่มีสตริง `$@` ซึ่ง Next แนบมากับฟอร์มที่ผูก useActionState
// เสมอ — ด่าน onboarding เป็นด่านแรกของลูกค้าที่แอดมินสร้างบัญชีให้ ถ้าติดคือเข้าใช้เว็บไม่ได้เลย
// (ดูรายละเอียดที่ CLAUDE.md หัวข้อ Session/Auth pattern)

export type ProfileState = { error?: string; success?: boolean } | undefined;

export async function updateProfileAction(_prevState: ProfileState, formData: FormData): Promise<ProfileState> {
    const cus_fname = String(formData.get("cus_fname") ?? "").trim();
    const cus_lname = String(formData.get("cus_lname") ?? "").trim();
    const cus_email = String(formData.get("cus_email") ?? "").trim();
    const cus_phone = String(formData.get("cus_phone") ?? "").trim();

    const res = await authorizedFetch("/store/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cus_fname, cus_lname, cus_email, cus_phone: cus_phone || null }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { error: data.message ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
    }
    return { success: true };
}

export type PasswordState = { error?: string; success?: boolean } | undefined;

export async function changePasswordAction(_prevState: PasswordState, formData: FormData): Promise<PasswordState> {
    const new_password = String(formData.get("new_password") ?? "");
    const confirm_password = String(formData.get("confirm_password") ?? "");

    if (new_password.length < 8) {
        return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };
    }
    if (new_password !== confirm_password) {
        return { error: "รหัสผ่านไม่ตรงกัน" };
    }

    const res = await authorizedFetch("/store/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { error: data.message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่" };
    }
    return { success: true };
}

export type AvatarState = { error?: string; avatarUrl?: string } | undefined;

// formData มีไฟล์ "image" อยู่แล้วจากฟอร์ม ส่งต่อทั้งก้อนไป backend ตรงๆ ได้เลย (multipart/form-data
// ไม่ต้องแกะ/ประกอบใหม่) เพราะฟิลด์ชื่อ "image" ตรงกับที่ multer ฝั่ง backend ต้องการอยู่แล้ว
export async function uploadAvatarAction(_prevState: AvatarState, formData: FormData): Promise<AvatarState> {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
        return { error: "กรุณาเลือกไฟล์รูปภาพ" };
    }

    const res = await authorizedFetch("/store/me/image", {
        method: "PUT",
        body: formData,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { error: data.message ?? "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่" };
    }
    return { avatarUrl: data.cus_avatar_url };
}

export type RevokeSessionState = { error?: string } | undefined;

export async function revokeSessionAction(sessionId: string): Promise<RevokeSessionState> {
    const res = await authorizedFetch(`/store/me/sessions/${sessionId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message ?? "ออกจากระบบอุปกรณ์นี้ไม่สำเร็จ กรุณาลองใหม่" };
    return undefined;
}

export type DeletionRequestState = { error?: string; success?: boolean } | undefined;

// สิทธิ์ขอลบข้อมูลบัญชีตาม PDPA — ไม่ลบทันที แค่สร้างคำขอให้แอดมินตรวจสอบ/ดำเนินการต่อ
export async function requestDataDeletionAction(): Promise<DeletionRequestState> {
    const res = await authorizedFetch("/store/me/deletion-request", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message ?? "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่" };
    return { success: true };
}
