"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { loginAction, type AuthFormState } from "@/app/actions/auth";

type FormErrors = { username?: string; password?: string };

function validate(username: string, password: string): FormErrors {
    const errors: FormErrors = {};
    if (!username.trim()) errors.username = "กรุณากรอกชื่อผู้ใช้หรืออีเมล";
    if (!password) errors.password = "กรุณากรอกรหัสผ่าน";
    return errors;
}

export default function LoginForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, undefined);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (state?.error) toast.error(state.error);
    }, [state]);

    function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setUsername(e.target.value);
        if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
    }

    function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPassword(e.target.value);
        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
    }

    // ตรวจฝั่ง client ก่อนปล่อยให้ formAction (server action) ทำงาน — preventDefault ถ้ามี field ผิด
    // เพื่อกันยิง request ไปเซิร์ฟเวอร์ทั้งที่รู้อยู่แล้วว่าข้อมูลไม่ครบ
    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        const fieldErrors = validate(username, password);
        if (Object.keys(fieldErrors).length > 0) {
            e.preventDefault();
            setErrors(fieldErrors);
        }
    }

    return (
        <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้หรืออีเมล</label>
                <Input name="cus_username" value={username} onChange={handleUsernameChange} error={!!errors.username} autoFocus />
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
                <Input name="cus_password" type="password" value={password} onChange={handlePasswordChange} error={!!errors.password} />
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <Button type="submit" size="lg" disabled={pending} className="mt-2">
                {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>

            <p className="text-center text-sm text-slate-500">
                ยังไม่มีบัญชี?{" "}
                <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-brand-600 hover:text-brand-700">
                    สมัครสมาชิก
                </Link>
            </p>
        </form>
    );
}
