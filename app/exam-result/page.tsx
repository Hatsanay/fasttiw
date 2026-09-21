import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { API_URL } from "@/lib/api";
import ExamResultForm, { type OutcomeInfo } from "./ExamResultForm";

export const metadata = {
    title: "บอกผลสอบ",
    // token อยู่ใน URL — ห้ามให้ search engine เก็บ index เด็ดขาด (กติกาเดียวกับหน้าตั้งรหัสผ่านใหม่)
    robots: { index: false, follow: false },
};

// หน้าสำหรับลูกค้ากดจากลิงก์ในอีเมลหลังวันสอบ — **ไม่ต้องล็อกอิน** เพราะอัตราการตอบสำคัญกว่าความสะดวกของเรา
// และสิ่งที่ token นี้ทำได้มีอย่างเดียวคือตอบแบบสอบถามของตัวเอง (ดู backend/src/controllers/examOutcome.controller.js)
export default async function ExamResultPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams;

    let info: OutcomeInfo | null = null;
    if (token) {
        const res = await fetch(`${API_URL}/store/exam-outcome?token=${encodeURIComponent(token)}`, { cache: "no-store" })
            .catch(() => null);
        if (res?.ok) info = await res.json();
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <Card className="w-full max-w-lg p-6 sm:p-8">
                    {!token || !info ? (
                        <div className="text-center">
                            <h1 className="text-xl font-semibold text-slate-900 mb-2">ลิงก์นี้ใช้ไม่ได้แล้ว</h1>
                            <p className="text-sm text-slate-500">
                                กรุณาเปิดจากอีเมลฉบับล่าสุดที่เราส่งให้ หรือถ้าตอบไปแล้วก็ไม่ต้องทำอะไรเพิ่มครับ
                            </p>
                        </div>
                    ) : info.closed ? (
                        <div className="text-center">
                            <h1 className="text-xl font-semibold text-slate-900 mb-2">ปิดรับคำตอบแล้ว</h1>
                            <p className="text-sm text-slate-500">ขอบคุณที่ให้ความสนใจครับ — รอบนี้เราปิดรับคำตอบไปแล้ว</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">{info.round_name}</p>
                            <h1 className="text-xl font-semibold text-slate-900 mb-1">ผลสอบเป็นยังไงบ้าง</h1>
                            <p className="text-sm text-slate-500 mb-6">
                                สวัสดีคุณ{info.name} — คำตอบของคุณช่วยให้เรารู้ว่าเนื้อหาที่ทำไว้ตรงกับสนามสอบแค่ไหน
                                และเอาไปปรับให้ตรงขึ้นสำหรับรุ่นต่อไป
                            </p>
                            <ExamResultForm token={token} info={info} />
                        </>
                    )}
                </Card>
            </main>
            <Footer />
        </div>
    );
}
