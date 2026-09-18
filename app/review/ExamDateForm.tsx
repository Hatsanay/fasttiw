"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

// ตั้งวันสอบเอง — ระบบเอาไปคำนวณว่าเหลือกี่วัน และวันนี้ควรทบทวนกี่ข้อถึงจะเคลียร์ทัน
// ไม่บังคับ: ไม่ตั้งก็ใช้แผนแบบไม่มีเส้นตายได้ตามปกติ
export default function ExamDateForm({ examDate }: { examDate: string | null }) {
    const router = useRouter();
    const [value, setValue] = useState(examDate ?? "");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save(next: string | null) {
        setPending(true);
        setError(null);
        try {
            const res = await fetch("/api/me/exam-date", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exam_date: next }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.message ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่");
                return;
            }
            setValue(next ?? "");
            router.refresh();
        } catch {
            setError("เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
        } finally {
            setPending(false);
        }
    }

    return (
        <div>
            <label htmlFor="exam-date" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CalendarDays size={15} className="text-slate-400" />
                วันสอบของคุณ
            </label>
            <div className="flex flex-wrap items-center gap-2">
                <input
                    id="exam-date"
                    type="date"
                    value={value}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setValue(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <Button onClick={() => save(value || null)} disabled={pending || (!value && !examDate)}>
                    {pending && <Loader2 size={15} className="animate-spin" />}
                    บันทึก
                </Button>
                {examDate && (
                    <button type="button" onClick={() => save(null)} disabled={pending}
                        className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
                        ล้างวันสอบ
                    </button>
                )}
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
            <p className="mt-2 text-xs text-slate-400">
                ใส่แล้วระบบจะบอกว่าเหลือกี่วัน และต้องทบทวนวันละกี่ข้อถึงจะเคลียร์ข้อที่ยังผิดได้ทันก่อนสอบ
            </p>
        </div>
    );
}
