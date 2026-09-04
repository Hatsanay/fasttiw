"use client";

import { useActionState, useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { forgotPasswordAction, type MessageFormState } from "@/app/actions/auth";

export default function ForgotPasswordForm() {
    const [state, action, pending] = useActionState<MessageFormState, FormData>(forgotPasswordAction, undefined);
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string>();

    useEffect(() => {
        if (state?.error) toast.error(state.error);
    }, [state]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        if (!email.trim()) {
            e.preventDefault();
            setError("กรุณากรอกอีเมล");
        }
    }

    // สำเร็จแล้วสลับเป็นหน้าจอ "ไปเช็คเมล" แทนที่จะโชว์ฟอร์มเดิมค้างไว้ — ข้อความมาจาก backend ตรงๆ
    // ซึ่งจงใจไม่ยืนยันว่าอีเมลนี้มีบัญชีจริงไหม (กันคนไล่เดารายชื่อลูกค้า) ห้ามเปลี่ยนเป็น "ส่งไปแล้ว" ลอยๆ
    // ที่ฟังดูเหมือนยืนยันว่ามีบัญชี
    if (state?.success) {
        return (
            <div className="flex flex-col items-center text-center gap-3 py-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <MailCheck size={22} />
                </span>
                <p className="text-sm text-slate-600 leading-relaxed">{state.success}</p>
                <p className="text-xs text-slate-400">
                    ไม่เจอในกล่องจดหมาย? ลองดูในโฟลเดอร์จดหมายขยะ — ลิงก์มีอายุ 60 นาที
                </p>
            </div>
        );
    }

    return (
        <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">อีเมล</label>
                <Input
                    name="cus_email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(undefined);
                    }}
                    error={!!error}
                    autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <Button type="submit" size="lg" disabled={pending} className="mt-1">
                {pending ? "กำลังส่งลิงก์..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
            </Button>
        </form>
    );
}
