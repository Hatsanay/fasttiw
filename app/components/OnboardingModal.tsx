"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { KeyRound, UserRound } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AvatarCrop from "@/components/ui/AvatarCrop";
import { postJson } from "@/lib/http";

type Profile = { cus_fname: string | null; cus_lname: string | null; cus_email: string | null; cus_phone: string | null };

type PasswordErrors = { newPassword?: string; confirmPassword?: string };
type ProfileErrors = { fname?: string; lname?: string; email?: string; phone?: string; pdpa?: string };

function validatePassword(newPassword: string, confirmPassword: string): PasswordErrors {
    const errors: PasswordErrors = {};
    if (newPassword.length < 8) errors.newPassword = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    else if (newPassword !== confirmPassword) errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    return errors;
}

function validateProfile(fname: string, lname: string, email: string, phone: string, pdpaConsent: boolean): ProfileErrors {
    const errors: ProfileErrors = {};

    if (!fname.trim()) errors.fname = "กรุณากรอกชื่อ";
    if (!lname.trim()) errors.lname = "กรุณากรอกนามสกุล";

    if (!email.trim())                                 errors.email = "กรุณากรอกอีเมล";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";

    if (phone && !/^[0-9]{9,10}$/.test(phone.replace(/-/g, ""))) errors.phone = "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก";

    if (!pdpaConsent) errors.pdpa = "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนใช้งาน";

    return errors;
}

// ยิงผ่าน Route Handler (`/api/auth/onboarding` + `/api/me/avatar`) ไม่ใช้ Server Action — WAF ของโฮสต์
// ตอบ 403 ให้ request ที่มีสตริง `$@` ซึ่ง Next แนบมากับฟอร์มที่ผูก useActionState เสมอ
// ด่านนี้เป็นด่านแรกของลูกค้าที่แอดมินสร้างบัญชีให้ ถ้าติดคือใช้เว็บไม่ได้เลย (ดู app/api/auth/onboarding/route.ts)
export default function OnboardingModal({ initialProfile }: { initialProfile: Profile }) {
    const [step, setStep] = useState<1 | 2>(1);
    const [pending, setPending] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const [fname, setFname] = useState(initialProfile.cus_fname ?? "");
    const [lname, setLname] = useState(initialProfile.cus_lname ?? "");
    const [email, setEmail] = useState(initialProfile.cus_email ?? "");
    const [phone, setPhone] = useState(initialProfile.cus_phone ?? "");
    const [pdpaConsent, setPdpaConsent] = useState(false);
    const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});

    async function submitOnboarding() {
        setPending(true);

        const res = await postJson("/api/auth/onboarding", {
            new_password: newPassword,
            cus_fname: fname.trim(),
            cus_lname: lname.trim(),
            cus_email: email.trim(),
            cus_phone: phone.trim(),
            pdpa_consent: pdpaConsent,
        });
        if (!res.ok) {
            toast.error(res.message ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่");
            setPending(false);
            return;
        }

        // อัปโหลดรูปแยกจาก onboarding หลัก เพราะ endpoint หลักรับ JSON ส่วนรูปต้องเป็น multipart —
        // ทำต่อเลยหลังบันทึกข้อมูลหลักสำเร็จ ไม่บังคับให้ไปอัปโหลดซ้ำที่หน้าบัญชีทีหลัง
        // รูปอัปไม่สำเร็จ ไม่ถือว่า onboarding ล้มเหลว — ข้อมูลหลักบันทึกไปแล้ว ค่อยเปลี่ยนรูปทีหลังก็ได้
        if (avatarFile) {
            const fd = new FormData();
            fd.append("image", avatarFile);
            const avatarRes = await fetch("/api/me/avatar", { method: "PUT", body: fd });
            if (!avatarRes.ok) {
                const data = await avatarRes.json().catch(() => ({}));
                toast.error(data.message ?? "อัปโหลดรูปไม่สำเร็จ เปลี่ยนได้ทีหลังที่หน้าบัญชี");
            }
        }

        toast.success("บันทึกข้อมูลสำเร็จ");
        // โหลดหน้าใหม่ทั้งหน้า (ไม่ใช่ router.refresh) เพราะเพิ่งตั้ง cookie ชุดใหม่ที่ mcp = false
        // ต้องให้ Server Component ทุกตัว render ใหม่ด้วย cookie ชุดใหม่ modal จึงจะหายไปแน่นอน
        window.location.reload();
    }

    function handleNewPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setNewPassword(e.target.value);
        if (passwordErrors.newPassword) setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
    }

    function handleConfirmPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setConfirmPassword(e.target.value);
        if (passwordErrors.confirmPassword) setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }

    function handleNext(e: React.FormEvent) {
        e.preventDefault();
        const fieldErrors = validatePassword(newPassword, confirmPassword);
        if (Object.keys(fieldErrors).length > 0) { setPasswordErrors(fieldErrors); return; }
        setStep(2);
    }

    function handleFnameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFname(e.target.value);
        if (profileErrors.fname) setProfileErrors((prev) => ({ ...prev, fname: undefined }));
    }

    function handleLnameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLname(e.target.value);
        if (profileErrors.lname) setProfileErrors((prev) => ({ ...prev, lname: undefined }));
    }

    function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value);
        if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: undefined }));
    }

    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPhone(e.target.value);
        if (profileErrors.phone) setProfileErrors((prev) => ({ ...prev, phone: undefined }));
    }

    function handlePdpaChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPdpaConsent(e.target.checked);
        if (profileErrors.pdpa) setProfileErrors((prev) => ({ ...prev, pdpa: undefined }));
    }

    function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fieldErrors = validateProfile(fname, lname, email, phone, pdpaConsent);
        if (Object.keys(fieldErrors).length > 0) {
            setProfileErrors(fieldErrors);
            return;
        }
        submitOnboarding();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 sm:p-8">
                {step === 1 ? (
                    <form onSubmit={handleNext} className="flex flex-col gap-4">
                        <div className="flex flex-col items-center text-center gap-2 mb-2">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                <KeyRound size={20} />
                            </span>
                            <h2 className="text-lg font-semibold text-slate-900">ตั้งรหัสผ่านใหม่</h2>
                            <p className="text-sm text-slate-500">บัญชีนี้สร้างโดยแอดมิน กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">รหัสผ่านใหม่</label>
                            <Input
                                type="password" value={newPassword} onChange={handleNewPasswordChange}
                                error={!!passwordErrors.newPassword} autoFocus
                            />
                            {passwordErrors.newPassword && <p className="text-xs text-red-500">{passwordErrors.newPassword}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                            <Input
                                type="password" value={confirmPassword} onChange={handleConfirmPasswordChange}
                                error={!!passwordErrors.confirmPassword}
                            />
                            {passwordErrors.confirmPassword && <p className="text-xs text-red-500">{passwordErrors.confirmPassword}</p>}
                        </div>

                        <Button type="submit" size="lg" className="mt-2">
                            ถัดไป
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col items-center text-center gap-2 mb-2">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                <UserRound size={20} />
                            </span>
                            <h2 className="text-lg font-semibold text-slate-900">กรอกข้อมูลส่วนตัว</h2>
                            <p className="text-sm text-slate-500">ขอข้อมูลเพิ่มเติมก่อนเริ่มใช้งาน</p>
                        </div>

                        <AvatarCrop onChange={setAvatarFile} disabled={pending} />

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">ชื่อ</label>
                                <Input name="cus_fname" value={fname} onChange={handleFnameChange} error={!!profileErrors.fname} autoFocus />
                                {profileErrors.fname && <p className="text-xs text-red-500">{profileErrors.fname}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">นามสกุล</label>
                                <Input name="cus_lname" value={lname} onChange={handleLnameChange} error={!!profileErrors.lname} />
                                {profileErrors.lname && <p className="text-xs text-red-500">{profileErrors.lname}</p>}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">อีเมล</label>
                            <Input name="cus_email" type="email" value={email} onChange={handleEmailChange} error={!!profileErrors.email} />
                            {profileErrors.email && <p className="text-xs text-red-500">{profileErrors.email}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">เบอร์โทรศัพท์ (ไม่บังคับ)</label>
                            <Input name="cus_phone" type="tel" inputMode="numeric" value={phone} onChange={handlePhoneChange} error={!!profileErrors.phone} />
                            {profileErrors.phone && <p className="text-xs text-red-500">{profileErrors.phone}</p>}
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
                            {profileErrors.pdpa && <p className="text-xs text-red-500 mt-1">{profileErrors.pdpa}</p>}
                        </div>

                        <div className="flex gap-3 mt-2">
                            <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={pending}>
                                ย้อนกลับ
                            </Button>
                            <Button type="submit" size="lg" disabled={pending} className="flex-1">
                                {pending ? "กำลังบันทึก..." : "บันทึก"}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}
