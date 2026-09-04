"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { postJson } from "@/lib/http";

type FormErrors = { password?: string; confirm?: string };

// ยิงผ่าน Route Handler (`/api/auth/reset-password`) ไม่ใช้ Server Action — ดูเหตุผลที่ route.ts
// (WAF ของโฮสต์ตอบ 403 ให้ทุก request ที่มีสตริง `$@` ซึ่ง Next แนบมากับฟอร์ม Server Action)
export default function ResetPasswordForm({ token }: { token: string }) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [pending, setPending] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string>();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        // เช็คฝั่ง client ก่อนเพื่อให้รู้ผลทันทีโดยไม่ต้องรอ round-trip — เงื่อนไขเดียวกันนี้
        // ทั้ง Route Handler และ backend ตรวจซ้ำอีกชั้นเสมอ
        const fieldErrors: FormErrors = {};
        if (password.length < 8) fieldErrors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
        if (confirm !== password) fieldErrors.confirm = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        setPending(true);
        const res = await postJson("/api/auth/reset-password", { token, new_password: password });
        setPending(false);
        if (!res.ok) {
            toast.error(res.message ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่");
            return;
        }
        setSuccessMessage(res.message ?? "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว");
    }

    if (successMessage) {
        return (
            <div className="flex flex-col items-center text-center gap-3 py-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <CheckCircle2 size={22} />
                </span>
                <p className="text-sm text-slate-600 leading-relaxed">{successMessage}</p>
                <Link href="/login" className="w-full">
                    <Button size="lg" className="w-full mt-1">เข้าสู่ระบบ</Button>
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">รหัสผ่านใหม่</label>
                <Input
                    name="new_password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={!!errors.password}
                    autoFocus
                />
                {errors.password ? (
                    <p className="text-xs text-red-500">{errors.password}</p>
                ) : (
                    <p className="text-xs text-slate-400">อย่างน้อย 8 ตัวอักษร</p>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                <Input
                    name="confirm_password"
                    type="password"
                    value={confirm}
                    onChange={(e) => {
                        setConfirm(e.target.value);
                        if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                    }}
                    error={!!errors.confirm}
                />
                {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
            </div>

            <Button type="submit" size="lg" disabled={pending} className="mt-1">
                {pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
            </Button>
        </form>
    );
}
