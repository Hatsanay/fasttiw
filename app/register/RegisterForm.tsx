"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { postJson, hardNavigate } from "@/lib/http";

type FormErrors = { username?: string; email?: string; password?: string; confirm?: string; pdpa?: string };

const RESEND_COOLDOWN_SECONDS = 60;

function validate(username: string, email: string, password: string, confirmPassword: string, pdpaConsent: boolean): FormErrors {
    const errors: FormErrors = {};

    if (!username.trim()) errors.username = "กรุณากรอกชื่อผู้ใช้";

    if (!email.trim())                                 errors.email = "กรุณากรอกอีเมล";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";

    if (!password)              errors.password = "กรุณากรอกรหัสผ่าน";
    else if (password.length < 8) errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";

    // เช็คแค่ฝั่ง client พอ (เหมือนหน้า reset-password) — ไม่ต้องส่งไป backend เพราะเป็นแค่การกันพิมพ์ผิด
    // ไม่ใช่เงื่อนไขความปลอดภัย ถ้าไม่กรอกช่องแรกก็ไม่ต้องรายงานซ้ำสองช่อง
    if (password && confirmPassword !== password) errors.confirm = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";

    if (!pdpaConsent) errors.pdpa = "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก";

    return errors;
}

// สมัครสมาชิก 2 ขั้น: กรอกข้อมูล → ยืนยันอีเมลด้วยรหัส 6 หลัก
//
// ทำไมต้องยืนยันอีเมล: ระบบส่งใบเสร็จและลิงก์ตั้งรหัสผ่านใหม่ทางอีเมลอย่างเดียว ถ้าพิมพ์อีเมลผิดตอนสมัคร
// ลูกค้าจะไม่ได้ทั้งสองอย่างตลอดไปโดยไม่มีใครรู้ตัวจนกว่าจะมีปัญหา — บัญชีจะถูกสร้างก็ต่อเมื่อกรอกรหัสถูก
// (ยังไม่มีแถวไหนใน DB ระหว่างรอกรอกรหัส)
//
// ยิงผ่าน Route Handler ไม่ใช้ Server Action — WAF ของโฮสต์บล็อกสตริง `$@` ที่มากับฟอร์ม Server Action
export default function RegisterForm({ next }: { next: string }) {
    const [step, setStep] = useState<"form" | "otp">("form");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");
    const [pdpaConsent, setPdpaConsent] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [pending, setPending] = useState(false);

    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState<string>();
    const [cooldown, setCooldown] = useState(0);

    // นับถอยหลังปุ่ม "ส่งรหัสอีกครั้ง" — กันผู้ใช้กดรัวจนโดน rate limit ฝั่ง backend (5 ครั้ง/ชม./อีเมล)
    // แล้วต้องรอนานกว่าเดิม
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    async function requestOtp(): Promise<boolean> {
        const res = await postJson("/api/auth/register/request-otp", { cus_email: email.trim() });
        if (!res.ok) {
            toast.error(res.message ?? "ขอรหัสยืนยันไม่สำเร็จ กรุณาลองใหม่");
            // อีเมลซ้ำ = ปัญหาอยู่ที่ช่องอีเมลในฟอร์ม พากลับไปแก้ที่ขั้นแรกเลย ไม่ให้ค้างอยู่หน้ากรอกรหัส
            if (res.status === 409) {
                setStep("form");
                setErrors((prev) => ({ ...prev, email: res.message }));
            }
            return false;
        }
        setCooldown(RESEND_COOLDOWN_SECONDS);
        toast.success(res.message ?? "ส่งรหัสยืนยันไปที่อีเมลแล้ว");
        return true;
    }

    async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const fieldErrors = validate(username, email, password, confirmPassword, pdpaConsent);
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        setPending(true);
        const sent = await requestOtp();
        setPending(false);
        if (sent) setStep("otp");
    }

    async function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!/^\d{6}$/.test(otp)) {
            setOtpError("กรอกรหัส 6 หลักที่ได้รับทางอีเมล");
            return;
        }

        setPending(true);
        const res = await postJson("/api/auth/register", {
            cus_username: username.trim(),
            cus_email: email.trim(),
            cus_password: password,
            cus_fname: fname.trim(),
            cus_lname: lname.trim(),
            pdpa_consent: pdpaConsent,
            otp,
        });
        if (!res.ok) {
            // ชื่อผู้ใช้ซ้ำ (409) ต้องกลับไปแก้ที่ขั้นแรก — รหัสยืนยันยังใช้ได้อยู่ ไม่ต้องขอใหม่
            if (res.status === 409) {
                setStep("form");
                setErrors((prev) => ({ ...prev, username: res.message }));
                toast.error(res.message ?? "สมัครสมาชิกไม่สำเร็จ");
            } else {
                setOtpError(res.message ?? "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่");
            }
            setPending(false);
            return;
        }
        hardNavigate(next);
    }

    if (step === "otp") {
        return (
            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col items-center text-center gap-2 mb-1">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <MailCheck size={20} />
                    </span>
                    <h2 className="text-base font-semibold text-slate-900">ยืนยันอีเมลของคุณ</h2>
                    <p className="text-sm text-slate-500">
                        ส่งรหัส 6 หลักไปที่ <span className="font-medium text-slate-700">{email}</span> แล้ว
                    </p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Input
                        name="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => {
                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                            if (otpError) setOtpError(undefined);
                        }}
                        error={!!otpError}
                        autoFocus
                        className="text-center text-2xl tracking-[0.5em] font-semibold"
                    />
                    {otpError ? (
                        <p className="text-xs text-red-500 text-center">{otpError}</p>
                    ) : (
                        <p className="text-xs text-slate-400 text-center">รหัสมีอายุ 10 นาที — ถ้าไม่เจอในกล่องจดหมาย ลองดูในจดหมายขยะ</p>
                    )}
                </div>

                <Button type="submit" size="lg" disabled={pending} className="mt-1">
                    {pending ? "กำลังสมัครสมาชิก..." : "ยืนยันและสมัครสมาชิก"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                    <button
                        type="button"
                        onClick={() => { setStep("form"); setOtp(""); setOtpError(undefined); }}
                        className="text-slate-500 hover:text-brand-600 transition-colors"
                    >
                        ← แก้ไขข้อมูล
                    </button>
                    <button
                        type="button"
                        disabled={cooldown > 0 || pending}
                        onClick={() => requestOtp()}
                        className="font-medium text-brand-600 hover:text-brand-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {cooldown > 0 ? `ส่งรหัสอีกครั้ง (${cooldown})` : "ส่งรหัสอีกครั้ง"}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">ชื่อ</label>
                    <Input name="cus_fname" value={fname} onChange={(e) => setFname(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">นามสกุล</label>
                    <Input name="cus_lname" value={lname} onChange={(e) => setLname(e.target.value)} />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
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
                <label className="text-sm font-medium text-slate-700">อีเมล</label>
                <Input
                    name="cus_email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    error={!!errors.email}
                />
                {errors.email ? (
                    <p className="text-xs text-red-500">{errors.email}</p>
                ) : (
                    <p className="text-xs text-slate-400">ใช้รับใบเสร็จและลิงก์ตั้งรหัสผ่านใหม่ — ต้องยืนยันด้วยรหัสที่ส่งไป</p>
                )}
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
                {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : <p className="text-xs text-slate-400">อย่างน้อย 8 ตัวอักษร</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่าน</label>
                <Input
                    name="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                    }}
                    error={!!errors.confirm}
                />
                {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
            </div>

            <div>
                <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input
                        type="checkbox"
                        name="pdpa_consent"
                        checked={pdpaConsent}
                        onChange={(e) => {
                            setPdpaConsent(e.target.checked);
                            if (errors.pdpa) setErrors((prev) => ({ ...prev, pdpa: undefined }));
                        }}
                        className="mt-0.5 accent-brand-600"
                    />
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
                {pending ? "กำลังส่งรหัสยืนยัน..." : "ถัดไป"}
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
