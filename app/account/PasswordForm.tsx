"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { changePasswordAction, type PasswordState } from "@/app/actions/account";

type FormErrors = { newPassword?: string; confirmPassword?: string };

// mirror กฎเดียวกับ changePasswordAction ฝั่ง server เป๊ะ (length>=8, ต้องตรงกัน) — ให้ผู้ใช้เห็น error
// ทันทีโดยไม่ต้อง round-trip ไปเซิร์ฟเวอร์ก่อน ฝั่ง server ยังเช็คซ้ำเป็น defense-in-depth เหมือนเดิม
function validate(newPassword: string, confirmPassword: string): FormErrors {
    const errors: FormErrors = {};
    if (newPassword.length < 8) errors.newPassword = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    else if (newPassword !== confirmPassword) errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    return errors;
}

export default function PasswordForm() {
    const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, undefined);
    const formRef = useRef<HTMLFormElement>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (state?.error) toast.error(state.error);
        if (state?.success) {
            toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
            formRef.current?.reset();
            // eslint-disable-next-line react-hooks/set-state-in-effect -- ล้าง state ในตัวเองตามผลลัพธ์ของ server action ที่เพิ่งเสร็จ ไม่ใช่ค่าที่คำนวณจาก render ปัจจุบัน
            setNewPassword("");
            setConfirmPassword("");
        }
    }, [state]);

    function handleNewPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setNewPassword(e.target.value);
        if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
    }

    function handleConfirmPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setConfirmPassword(e.target.value);
        if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        const fieldErrors = validate(newPassword, confirmPassword);
        if (Object.keys(fieldErrors).length > 0) {
            e.preventDefault();
            setErrors(fieldErrors);
        }
    }

    return (
        <form ref={formRef} action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">รหัสผ่านใหม่</label>
                <Input name="new_password" type="password" value={newPassword} onChange={handleNewPasswordChange} error={!!errors.newPassword} />
                {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                <Input name="confirm_password" type="password" value={confirmPassword} onChange={handleConfirmPasswordChange} error={!!errors.confirmPassword} />
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>
            <Button type="submit" disabled={pending} className="self-start mt-1">
                {pending ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
            </Button>
        </form>
    );
}
