import Navbar from "@/app/components/Navbar";
import { Bone, ProductGridSkeleton } from "@/components/ui/Skeleton";

// หน้าโครงระหว่างรอ — ใช้ใน loading.tsx ของหน้าที่ต้องรู้ว่าใคร login อยู่ (คลังข้อสอบ ประวัติ ทำข้อสอบ ฯลฯ)
// (2026-09-24)
//
// **ทำไมต้องมี**: เดิมทั้งเว็บไม่มี loading.tsx เลย กดลิงก์แล้วหน้าจอค้างอยู่หน้าเดิมจนเซิร์ฟเวอร์เรนเดอร์หน้าใหม่
// เสร็จทั้งหน้า (บนเน็ตมือถือเกือบวินาที) ลูกค้าไม่รู้ว่ากดติดหรือยัง ตอนนี้กดปุ๊บเปลี่ยนเป็นโครงหน้าใหม่ทันที
// และ Next โหลดโครงนี้ไว้ล่วงหน้าตั้งแต่ลิงก์โผล่บนจอ (prefetch) จึงไม่ต้องรอเน็ตเลยตอนกด
//
// รูปทรงมี 4 แบบตามหน้าตาหน้าจริง — เลือกให้ใกล้ที่สุด ไม่งั้นพอเนื้อหามาถึงหน้าจะกระโดด
type Variant = "list" | "detail" | "form" | "exam";

export default function PageLoading({ variant = "detail" }: { variant?: Variant }) {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1" role="status" aria-label="กำลังโหลด">
                {variant === "list" && <ListBody />}
                {variant === "detail" && <DetailBody />}
                {variant === "form" && <FormBody />}
                {variant === "exam" && <ExamBody />}
            </main>
        </div>
    );
}

function ListBody() {
    return (
        <div className="max-w-360 mx-auto w-full px-4 sm:px-6 py-10">
            <Bone className="h-7 w-56 mb-2" />
            <Bone className="h-4 w-72 mb-8" />
            <ProductGridSkeleton count={6} />
        </div>
    );
}

function DetailBody() {
    return (
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
            <Bone className="h-7 w-64 mb-2" />
            <Bone className="h-4 w-80 max-w-full mb-8" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {Array.from({ length: 4 }, (_, i) => (
                    <Bone key={i} className="h-20 rounded-2xl" />
                ))}
            </div>
            <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                    <Bone key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

function FormBody() {
    return (
        <div className="flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm rounded-2xl border border-slate-100 p-6 sm:p-8">
                <Bone className="h-6 w-32 mx-auto mb-6" />
                <div className="flex flex-col gap-4">
                    <Bone className="h-10" />
                    <Bone className="h-10" />
                    <Bone className="h-11 rounded-full mt-2" />
                </div>
            </div>
        </div>
    );
}

// หน้าทำข้อสอบ/เฉลย — แถบบน + การ์ดโจทย์ + ตัวเลือก 4 ข้อ
function ExamBody() {
    return (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <Bone className="h-5 w-40" />
                <Bone className="h-8 w-24 rounded-full" />
            </div>
            <div className="rounded-2xl border border-slate-100 p-5 sm:p-6">
                <Bone className="h-4 w-16 mb-4" />
                <Bone className="h-4 w-full mb-2" />
                <Bone className="h-4 w-5/6 mb-6" />
                <div className="flex flex-col gap-3">
                    {Array.from({ length: 4 }, (_, i) => (
                        <Bone key={i} className="h-12 rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}
