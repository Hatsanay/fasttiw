"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, UserRound } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AvatarCrop from "@/components/ui/AvatarCrop";
import { completeOnboardingAction, uploadAvatarAction, type OnboardingState } from "@/app/actions/account";

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

export default function OnboardingModal({ initialProfile }: { initialProfile: Profile }) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
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

    const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboardingAction, undefined);

    useEffect(() => {
        if (state?.error) toast.error(state.error);
        if (state?.success) {
            (async () => {
                // อัปโหลดรูปแยกจาก onboarding หลัก เพราะ endpoint หลักรับ JSON ส่วนรูปต้องเป็น multipart —
                // ทำต่อหลัง onboarding สำเร็จเลย ไม่บังคับผู้ใช้ต้องมาอัปโหลดซ้ำที่หน้าบัญชีทีหลัง
                if (avatarFile) {
                    const fd = new FormData();
                    fd.append("image", avatarFile);
                    const avatarResult = await uploadAvatarAction(undefined, fd);
                    if (avatarResult?.error) toast.error(avatarResult.error);
                }
                toast.success("บันทึกข้อมูลสำเร็จ");
                router.refresh(); // ให้ RootLayout ประเมิน session ใหม่ — mcp เป็น false แล้ว modal จะหายไปเอง
            })();
        }
    }, [state, router, avatarFile]);

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
        const fieldErrors = validateProfile(fname, lname, email, phone, pdpaConsent);
        if (Object.keys(fieldErrors).length > 0) {
            e.preventDefault();
            setProfileErrors(fieldErrors);
        }
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
                    <form action={action} onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
                        <input type="hidden" name="new_password" value={newPassword} />
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
