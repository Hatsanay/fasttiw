"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { postJson, hardNavigate } from "@/lib/http";

type FormErrors = { username?: string; password?: string };

function validate(username: string, password: string): FormErrors {
    const errors: FormErrors = {};
    if (!username.trim()) errors.username = "กรุณากรอกชื่อผู้ใช้หรืออีเมล";
    if (!password) errors.password = "กรุณากรอกรหัสผ่าน";
    return errors;
}

// ยิงผ่าน Route Handler `/api/auth/login` ไม่ใช้ Server Action — WAF ของโฮสต์ตอบ 403 ให้ request ที่มี
// สตริง `$@` ซึ่ง Next แนบมากับฟอร์ม Server Action เสมอ (ดู app/api/auth/login/route.ts)
// cookie ยังถูกตั้งฝั่ง server เหมือนเดิม JWT ไม่เคยผ่านมือ JS ฝั่ง client
export default function LoginForm({ next }: { next: string }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const fieldErrors = validate(username, password);
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        setPending(true);
        const res = await postJson("/api/auth/login", { cus_username: username.trim(), cus_password: password });
        if (!res.ok) {
            toast.error(res.message ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
            setPending(false);
            return;
        }
        // ไม่ปลด pending ตรงนี้ — ปล่อยให้ปุ่มค้างสถานะกำลังโหลดจนกว่าหน้าใหม่จะขึ้น กันกดซ้ำ
        hardNavigate(next);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้หรืออีเมล</label>
                <Input
                    name="cus_username"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value);
                        if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    error={!!errors.username}
                    autoFocus
                />
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
                <Input
                    name="cus_password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={!!errors.password}
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <Button type="submit" size="lg" disabled={pending} className="mt-2">
                {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>

            <p className="text-center text-sm">
                <Link href="/forgot-password" className="text-slate-500 hover:text-brand-600 transition-colors">
                    ลืมรหัสผ่าน?
                </Link>
            </p>

            <p className="text-center text-sm text-slate-500">
                ยังไม่มีบัญชี?{" "}
                <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-brand-600 hover:text-brand-700">
                    สมัครสมาชิก
                </Link>
            </p>
        </form>
    );
}
