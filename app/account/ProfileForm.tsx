"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { updateProfileAction, type ProfileState } from "@/app/actions/account";

type Profile = { cus_fname: string | null; cus_lname: string | null; cus_email: string | null; cus_phone: string | null };
type FormErrors = { fname?: string; lname?: string; email?: string; phone?: string };

function validate(fname: string, lname: string, email: string, phone: string): FormErrors {
    const errors: FormErrors = {};

    if (!fname.trim()) errors.fname = "กรุณากรอกชื่อ";
    if (!lname.trim()) errors.lname = "กรุณากรอกนามสกุล";

    if (!email.trim())                                 errors.email = "กรุณากรอกอีเมล";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";

    if (phone && !/^[0-9]{9,10}$/.test(phone.replace(/-/g, ""))) errors.phone = "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก";

    return errors;
}

export default function ProfileForm({ profile }: { profile: Profile }) {
    const router = useRouter();
    const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, undefined);
    const [fname, setFname] = useState(profile.cus_fname ?? "");
    const [lname, setLname] = useState(profile.cus_lname ?? "");
    const [email, setEmail] = useState(profile.cus_email ?? "");
    const [phone, setPhone] = useState(profile.cus_phone ?? "");
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (state?.error) toast.error(state.error);
        if (state?.success) {
            toast.success("บันทึกข้อมูลสำเร็จ");
            // Navbar/UserMenu เป็น Server Component ถืออยู่คนละ RSC payload — ต้อง refresh ให้ดึงชื่อ/ข้อมูล
            // ใหม่มาแสดง ไม่งั้นแก้ชื่อในฟอร์มนี้แล้ว Navbar ยังค้างชื่อเดิมจนกว่าจะ navigate ไปหน้าอื่น
            router.refresh();
        }
    }, [state, router]);

    function handleFnameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFname(e.target.value);
        if (errors.fname) setErrors((prev) => ({ ...prev, fname: undefined }));
    }

    function handleLnameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLname(e.target.value);
        if (errors.lname) setErrors((prev) => ({ ...prev, lname: undefined }));
    }

    function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value);
        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
    }

    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPhone(e.target.value);
        if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        const fieldErrors = validate(fname, lname, email, phone);
        if (Object.keys(fieldErrors).length > 0) {
            e.preventDefault();
            setErrors(fieldErrors);
        }
    }

    return (
        <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">ชื่อ</label>
                    <Input name="cus_fname" value={fname} onChange={handleFnameChange} error={!!errors.fname} />
                    {errors.fname && <p className="text-xs text-red-500">{errors.fname}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">นามสกุล</label>
                    <Input name="cus_lname" value={lname} onChange={handleLnameChange} error={!!errors.lname} />
                    {errors.lname && <p className="text-xs text-red-500">{errors.lname}</p>}
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">อีเมล</label>
                <Input name="cus_email" type="email" value={email} onChange={handleEmailChange} error={!!errors.email} />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">เบอร์โทรศัพท์</label>
                <Input name="cus_phone" type="tel" inputMode="numeric" value={phone} onChange={handlePhoneChange} error={!!errors.phone} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>
            <Button type="submit" disabled={pending} className="self-start mt-1">
                {pending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
        </form>
    );
}
