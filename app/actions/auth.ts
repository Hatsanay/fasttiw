"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, authorizedFetch } from "@/lib/session";

export async function logoutAction() {
    // เดิมแค่ clear cookie ฝั่งตัวเอง ไม่เคยบอก backend เลย ทำให้ session ของอุปกรณ์นี้ยัง "active" ค้างอยู่
    // ใน DB ต่อไปจนกว่าจะโดน FIFO evict เอง ขัดกับจุดประสงค์ของ limit 2 อุปกรณ์ที่ควรว่างทันทีที่ logout จริง
    // — ยิงก่อน clear cookie เพราะต้องใช้ token เดิมยืนยันตัวตนกับ backend (authorizedFetch อ่านจาก cookie)
    await authorizedFetch("/store/auth/logout", { method: "POST" }).catch(() => {});
    await clearSessionCookie();
    redirect("/");
}

// ── เข้าสู่ระบบ / สมัครสมาชิก / ลืมรหัสผ่าน ────────────────────────────────────────
// ทั้ง 4 flow **ไม่ได้อยู่ที่นี่แล้ว** — ย้ายไปเป็น Route Handler ที่
// `app/api/auth/{login,register,forgot-password,reset-password}/route.ts`
//
// เหตุผล: WAF ของโฮสต์ (ModSecurity rule React2Shell) ตอบ 403 ให้ทุก request ที่มีสตริง `$@` ในเนื้อ
// ซึ่ง Next แนบมากับฟอร์ม Server Action ที่ผูกกับ useActionState เสมอ (ช่องซ่อน `{"bound":"$@1"}`
// สำหรับกรณี JS ยังโหลดไม่เสร็จ) ทำให้ลูกค้าที่กดปุ่มก่อนหน้าเว็บพร้อมเจอหน้า error และงานไม่เกิดขึ้นจริง
// — ยืนยันบน production แล้ว 2026-09-04 ดูรายละเอียดที่ CLAUDE.md ข้อ 6.2
//
// การตั้ง httpOnly cookie ยังทำฝั่ง server เหมือนเดิมทุกประการ (Route Handler ตั้ง cookie ได้เท่ากับ
// Server Action) JWT จึงไม่เคยผ่านมือ JavaScript ฝั่ง client ตามกฎเดิมใน tiwwai-store/CLAUDE.md
//
// `logoutAction` ยังเป็น Server Action ต่อได้ เพราะไม่ได้ผูกกับ useActionState จึงไม่มี `$@` ในฟอร์ม
