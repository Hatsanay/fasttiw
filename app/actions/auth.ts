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
