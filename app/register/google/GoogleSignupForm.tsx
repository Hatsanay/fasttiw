"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { postJson, hardNavigate } from "@/lib/http";

// ลูกค้าใหม่ที่มาจาก Google — ขอความยินยอม PDPA แบบติ๊กเอง (เหมือนหน้าสมัครปกติ) ก่อนสร้างบัญชี
// ไม่ต้องกรอกอะไรเพิ่ม: อีเมลยืนยันแล้วโดย Google (ไม่ต้อง OTP) ชื่อ-นามสกุลดึงมาจาก Google แล้วให้ตรวจ/แก้
// พร้อมใส่รูปโปรไฟล์ในหน้าถัดไป (/welcome?step=profile — ข้ามได้)
export default function GoogleSignupForm({ next, email, name }: { next: string; email: string; name: string }) {
    const [pdpaConsent, setPdpaConsent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!pdpaConsent) {
            setError("กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสร้างบัญชี");
            return;
        }

        setPending(true);
        const res = await postJson("/api/auth/google/complete", { pdpa_consent: true });
        if (!res.ok) {
            toast.error(res.message ?? "สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่");
            // หมดเวลา 15 นาทีแล้ว — กดต่อก็ไม่ผ่าน พาไปเริ่มใหม่ที่ Google เลย
            if (res.data.expired) hardNavigate(`/login?error=google_expired&next=${encodeURIComponent(next)}`);
            setPending(false);
            return;
        }
        // ไม่ปลด pending — ปุ่มค้างสถานะโหลดจนหน้าใหม่ขึ้น กันกดซ้ำ
        // เด้งหน้าต้อนรับให้ตรวจชื่อจาก Google + ใส่รูปโปรไฟล์ (ข้ามได้) แล้วค่อยไปหน้าที่ตั้งใจไว้ต่อ
        hardNavigate(`/welcome?step=profile&next=${encodeURIComponent(next)}`);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                {name && <p className="font-medium text-slate-800">{name}</p>}
                <p className="text-sm text-slate-500 break-all">{email}</p>
            </div>

            <div>
                <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input
                        type="checkbox"
                        name="pdpa_consent"
                        checked={pdpaConsent}
                        onChange={(e) => {
                            setPdpaConsent(e.target.checked);
                            if (error) setError(null);
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
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <Button type="submit" size="lg" disabled={pending} className="mt-2">
                {pending ? "กำลังสร้างบัญชี..." : "สร้างบัญชีและเข้าสู่ระบบ"}
            </Button>

            {/* <a> ไม่ใช่ Link — ไม่ให้ prefetch route เริ่มล็อกอิน (ดู GoogleSignInButton) */}
            <p className="text-center text-sm text-slate-500">
                ไม่ใช่บัญชีนี้?{" "}
                <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="font-medium text-brand-600 hover:text-brand-700">
                    เลือกบัญชี Google อื่น
                </a>
            </p>
        </form>
    );
}
