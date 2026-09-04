"use server";

import { redirect } from "next/navigation";
import { setSessionCookie, clearSessionCookie, authorizedFetch } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

export type AuthFormState = { error: string } | undefined;

function safeNextPath(next: FormDataEntryValue | null): string {
    const value = String(next ?? "");
    // กันเปิดเป็น open redirect — รับเฉพาะ path ภายในเว็บที่ขึ้นต้นด้วย "/" เท่านั้น
    return value.startsWith("/") ? value : "/";
}

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const cus_username = String(formData.get("cus_username") ?? "").trim();
    const cus_password = String(formData.get("cus_password") ?? "");
    const next = safeNextPath(formData.get("next"));

    if (!cus_username || !cus_password) {
        return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
    }

    const res = await fetch(`${API_URL}/store/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cus_username, cus_password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { error: data.message ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" };
    }

    await setSessionCookie(data.token);
    redirect(next);
}

export async function registerAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const cus_username = String(formData.get("cus_username") ?? "").trim();
    const cus_email = String(formData.get("cus_email") ?? "").trim();
    const cus_password = String(formData.get("cus_password") ?? "");
    const cus_fname = String(formData.get("cus_fname") ?? "").trim();
    const cus_lname = String(formData.get("cus_lname") ?? "").trim();
    const pdpa_consent = formData.get("pdpa_consent") === "on";
    const next = safeNextPath(formData.get("next"));

    if (!cus_username || !cus_email || !cus_password) {
        return { error: "กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่าน" };
    }
    if (cus_password.length < 8) {
        return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };
    }
    if (!pdpa_consent) {
        return { error: "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก" };
    }

    const res = await fetch(`${API_URL}/store/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cus_username, cus_email, cus_password, cus_fname, cus_lname, pdpa_consent }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { error: data.message ?? "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่" };
    }

    await setSessionCookie(data.token);
    redirect(next);
}

export async function logoutAction() {
    // เดิมแค่ clear cookie ฝั่งตัวเอง ไม่เคยบอก backend เลย ทำให้ session ของอุปกรณ์นี้ยัง "active" ค้างอยู่
    // ใน DB ต่อไปจนกว่าจะโดน FIFO evict เอง ขัดกับจุดประสงค์ของ limit 2 อุปกรณ์ที่ควรว่างทันทีที่ logout จริง
    // — ยิงก่อน clear cookie เพราะต้องใช้ token เดิมยืนยันตัวตนกับ backend (authorizedFetch อ่านจาก cookie)
    await authorizedFetch("/store/auth/logout", { method: "POST" }).catch(() => {});
    await clearSessionCookie();
    redirect("/");
}

// ── ลืมรหัสผ่าน ───────────────────────────────────────────────────────────────
// ต่างจาก AuthFormState ตรงที่มีสถานะ "สำเร็จ" ด้วย เพราะ 2 ฟอร์มนี้ไม่ได้ redirect ไปไหนทันที
// (ขอลิงก์แล้วต้องบอกให้ไปเช็คเมล / ตั้งรหัสใหม่เสร็จแล้วค่อยให้กดไปหน้าเข้าสู่ระบบเอง)
export type MessageFormState = { error?: string; success?: string } | undefined;

export async function forgotPasswordAction(_prevState: MessageFormState, formData: FormData): Promise<MessageFormState> {
    const cus_email = String(formData.get("cus_email") ?? "").trim();
    if (!cus_email) return { error: "กรุณากรอกอีเมล" };

    const res = await fetch(`${API_URL}/store/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cus_email }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return { error: data.message ?? "ขอลิงก์ไม่สำเร็จ กรุณาลองใหม่" };
    // backend ตอบข้อความเดียวกันเสมอไม่ว่าอีเมลนั้นจะมีบัญชีจริงหรือไม่ (กันคนไล่เดาว่าอีเมลไหนเป็นลูกค้าเรา)
    // ฝั่งนี้จึงส่งต่อข้อความนั้นตรงๆ ห้ามเติมเงื่อนไขเองว่าเจอ/ไม่เจอบัญชี
    return { success: data.message ?? "ส่งลิงก์ไปที่อีเมลแล้ว" };
}

export async function resetPasswordAction(_prevState: MessageFormState, formData: FormData): Promise<MessageFormState> {
    const token = String(formData.get("token") ?? "");
    const new_password = String(formData.get("new_password") ?? "");
    const confirm_password = String(formData.get("confirm_password") ?? "");

    if (!token) return { error: "ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ใหม่อีกครั้ง" };
    if (new_password.length < 8) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };
    if (new_password !== confirm_password) return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };

    const res = await fetch(`${API_URL}/store/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return { error: data.message ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่" };
    return { success: data.message ?? "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว" };
}
