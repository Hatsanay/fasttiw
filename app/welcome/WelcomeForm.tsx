"use client";

import { useState } from "react";
import { toast } from "sonner";
import AvatarCrop from "@/components/ui/AvatarCrop";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { hardNavigate } from "@/lib/http";

type NameErrors = { fname?: string; lname?: string };

export default function WelcomeForm({
    next,
    askName,
    initialFname,
    initialLname,
    avatarUrl,
}: {
    next: string;
    askName: boolean;
    initialFname: string;
    initialLname: string;
    avatarUrl?: string;
}) {
    const [fname, setFname] = useState(initialFname);
    const [lname, setLname] = useState(initialLname);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<NameErrors>({});
    const [pending, setPending] = useState(false);

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const nameChanged = askName && (fname.trim() !== initialFname || lname.trim() !== initialLname);
        if (nameChanged) {
            const fieldErrors: NameErrors = {};
            if (!fname.trim()) fieldErrors.fname = "กรุณากรอกชื่อ";
            if (!lname.trim()) fieldErrors.lname = "กรุณากรอกนามสกุล";
            if (Object.keys(fieldErrors).length > 0) {
                setErrors(fieldErrors);
                return;
            }
        }

        setPending(true);

        if (nameChanged) {
            const res = await fetch("/api/me/name", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cus_fname: fname.trim(), cus_lname: lname.trim() }),
            }).catch(() => null);
            if (!res?.ok) {
                const data = await res?.json().catch(() => ({}));
                toast.error(data?.message ?? "บันทึกชื่อไม่สำเร็จ กรุณาลองใหม่");
                setPending(false);
                return;
            }
        }

        if (avatarFile) {
            const fd = new FormData();
            fd.append("image", avatarFile);
            const res = await fetch("/api/me/avatar", { method: "PUT", body: fd }).catch(() => null);
            if (!res?.ok) {
                const data = await res?.json().catch(() => ({}));
                // ชื่อบันทึกไปแล้วถ้ามี — แจ้งเฉพาะรูป ให้ลองเลือกรูปใหม่หรือกดข้ามได้ ไม่ต้องกรอกชื่อซ้ำ
                toast.error(data?.message ?? "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่");
                setPending(false);
                return;
            }
        }

        // โหลดหน้าใหม่ทั้งหน้าให้ Navbar แสดงชื่อ/รูปใหม่ทันที (ไม่ใช้ข้อมูลที่ค้างใน router cache)
        hardNavigate(next);
    }

    return (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex justify-center">
                <AvatarCrop value={avatarUrl} onChange={setAvatarFile} disabled={pending} />
            </div>

            {askName && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">ชื่อ</label>
                        <Input
                            value={fname}
                            maxLength={50}
                            onChange={(e) => {
                                setFname(e.target.value);
                                if (errors.fname) setErrors((prev) => ({ ...prev, fname: undefined }));
                            }}
                            error={!!errors.fname}
                        />
                        {errors.fname && <p className="text-xs text-red-500">{errors.fname}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">นามสกุล</label>
                        <Input
                            value={lname}
                            maxLength={50}
                            onChange={(e) => {
                                setLname(e.target.value);
                                if (errors.lname) setErrors((prev) => ({ ...prev, lname: undefined }));
                            }}
                            error={!!errors.lname}
                        />
                        {errors.lname && <p className="text-xs text-red-500">{errors.lname}</p>}
                    </div>
                </div>
            )}

            <Button type="submit" size="lg" disabled={pending} className="mt-2">
                {pending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            {/* ข้ามได้เสมอ — ไม่ต้องยืนยัน ไม่ต้องจำ ไปหน้าที่ตั้งใจจะไปต่อเลย (เช่น กลับไปหน้าชำระเงิน) */}
            <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                    setPending(true);
                    hardNavigate(next);
                }}
            >
                ข้ามไปก่อน
            </Button>
        </form>
    );
}
