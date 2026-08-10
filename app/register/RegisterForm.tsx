"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { registerAction, type AuthFormState } from "@/app/actions/auth";

type FormErrors = { username?: string; email?: string; password?: string; pdpa?: string };

function validate(username: string, email: string, password: string, pdpaConsent: boolean): FormErrors {
    const errors: FormErrors = {};

    if (!username.trim()) errors.username = "กรุณากรอกชื่อผู้ใช้";

    if (!email.trim())                                 errors.email = "กรุณากรอกอีเมล";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";

    if (!password)              errors.password = "กรุณากรอกรหัสผ่าน";
    else if (password.length < 8) errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";

    if (!pdpaConsent) errors.pdpa = "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก";

    return errors;
}

export default function RegisterForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, undefined);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [pdpaConsent, setPdpaConsent] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (state?.error) toast.error(state.error);
    }, [state]);

    function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setUsername(e.target.value);
        if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
    }

    function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value);
        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
    }

    function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPassword(e.target.value);
        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
    }

    function handlePdpaChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPdpaConsent(e.target.checked);
        if (errors.pdpa) setErrors((prev) => ({ ...prev, pdpa: undefined }));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        const fieldErrors = validate(username, email, password, pdpaConsent);
        if (Object.keys(fieldErrors).length > 0) {
            e.preventDefault();
            setErrors(fieldErrors);
        }
    }

    return (
        <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />

            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">ชื่อ</label>
                    <Input name="cus_fname" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">นามสกุล</label>
                    <Input name="cus_lname" />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
                <Input name="cus_username" value={username} onChange={handleUsernameChange} error={!!errors.username} autoFocus />
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">อีเมล</label>
                <Input name="cus_email" type="email" value={email} onChange={handleEmailChange} error={!!errors.email} />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
                <Input name="cus_password" type="password" value={password} onChange={handlePasswordChange} error={!!errors.password} />
                {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : <p className="text-xs text-slate-400">อย่างน้อย 8 ตัวอักษร</p>}
            </div>

            <div>
                <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input type="checkbox" name="pdpa_consent" checked={pdpaConsent} onChange={handlePdpaChange} className="mt-0.5 accent-brand-600" />
                    <span>
                        ยอมรับ{" "}
                        <Link href="/privacy" target="_blank" className="font-medium text-brand-600 hover:text-brand-700">
                            นโยบายความเป็นส่วนตัว
                        </Link>
                    </span>
                </label>
                {errors.pdpa && <p className="text-xs text-red-500 mt-1">{errors.pdpa}</p>}
            </div>

            <Button type="submit" size="lg" disabled={pending} className="mt-2">
                {pending ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </Button>

            <p className="text-center text-sm text-slate-500">
                มีบัญชีอยู่แล้ว?{" "}
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-brand-600 hover:text-brand-700">
                    เข้าสู่ระบบ
                </Link>
            </p>
        </form>
    );
}
