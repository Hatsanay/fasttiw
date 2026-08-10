import { notFound, redirect } from "next/navigation";
import { authorizedFetch } from "@/lib/session";
import ExamRunner from "./ExamRunner";

export const metadata = { title: "กำลังทำข้อสอบ" };

export default async function ExamAttemptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await authorizedFetch(`/store/attempts/${id}`);
    if (!res.ok) notFound();
    const attempt = await res.json();

    if (attempt.att_status === "submitted") {
        redirect(`/exam/attempts/${id}/review`);
    }
    // ชุดที่ถูกยกเลิกไปแล้วไม่มีอะไรให้ทำต่อ (ตอบ/ส่งคำตอบจะโดน backend ปฏิเสธหมดเพราะไม่ใช่ in_progress) —
    // พาไปหน้าเลือกโหมดของ product เดิมแทน เผื่อเข้าผ่าน URL เก่า/ปุ่ม back หลังกดยกเลิกไปแล้ว
    if (attempt.att_status === "abandoned") {
        redirect(`/exam/${attempt.att_product_id}`);
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <ExamRunner attempt={attempt} />
        </div>
    );
}
