"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

// ยิงผ่าน Route Handler (`/api/auth/forgot-password`) ด้วย fetch เอง ไม่ใช้ Server Action เหมือนฟอร์มอื่น
// เพราะ WAF ของโฮสต์บล็อกสตริง `$@` ที่ Next ใส่มากับฟอร์ม Server Action — ดูคำอธิบายเต็มที่ route.ts
export default function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string>();
    const [pending, setPending] = useState(false);
    const [sentMessage, setSentMessage] = useState<string>();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!email.trim()) {
            setError("กรุณากรอกอีเมล");
            return;
        }

        setPending(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cus_email: email.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message ?? "ขอลิงก์ไม่สำเร็จ กรุณาลองใหม่");
                return;
            }
            setSentMessage(data.message ?? "ส่งลิงก์ไปที่อีเมลแล้ว");
        } catch {
            toast.error("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setPending(false);
        }
    }

    // สำเร็จแล้วสลับเป็นหน้าจอ "ไปเช็คเมล" แทนที่จะโชว์ฟอร์มเดิมค้างไว้ — ข้อความมาจาก backend ตรงๆ
    // ซึ่งจงใจไม่ยืนยันว่าอีเมลนี้มีบัญชีจริงไหม (กันคนไล่เดารายชื่อลูกค้า) ห้ามเปลี่ยนเป็น "ส่งไปแล้ว" ลอยๆ
    // ที่ฟังดูเหมือนยืนยันว่ามีบัญชี
    if (sentMessage) {
        return (
            <div className="flex flex-col items-center text-center gap-3 py-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <MailCheck size={22} />
                </span>
                <p className="text-sm text-slate-600 leading-relaxed">{sentMessage}</p>
                <p className="text-xs text-slate-400">
                    ไม่เจอในกล่องจดหมาย? ลองดูในโฟลเดอร์จดหมายขยะ — ลิงก์มีอายุ 60 นาที
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
