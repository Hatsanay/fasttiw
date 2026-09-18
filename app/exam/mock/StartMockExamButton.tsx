"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";

// ปุ่มเริ่มสอบ — กดแล้ว backend ประกอบชุดข้อสอบให้ใหม่ทุกครั้ง แล้วพาไปหน้าทำข้อสอบชุดเดิมที่ใช้อยู่
// ใบที่ค้างอยู่ (ยังไม่ส่ง) จะถูกพากลับไปทำต่อ ไม่ใช่เริ่มใหม่ — ข้อความบนปุ่มจึงต่างกัน
export default function StartMockExamButton({
    examId,
    resumeAttemptId,
    disabled,
}: {
    examId: string;
    resumeAttemptId: string | null;
    disabled?: boolean;
}) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function start() {
        setPending(true);
        setError(null);
        try {
            const res = await fetch(`/api/mock-exams/${examId}/start`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.att_id) {
                setError(data.message ?? "เริ่มสอบไม่สำเร็จ กรุณาลองใหม่");
                setPending(false);
                return;
            }
            router.push(`/exam/attempts/${data.att_id}`);
        } catch {
            setError("เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
            setPending(false);
        }
    }

    return (
        <div>
            <Button onClick={start} disabled={pending || disabled} className="w-full sm:w-auto">
                {pending ? <Loader2 size={16} className="animate-spin" /> : resumeAttemptId ? <RotateCcw size={16} /> : <Play size={16} />}
                {pending ? "กำลังจัดชุดข้อสอบ..." : resumeAttemptId ? "ทำข้อสอบที่ค้างไว้ต่อ" : "เริ่มสอบ"}
            </Button>
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
    );
}
