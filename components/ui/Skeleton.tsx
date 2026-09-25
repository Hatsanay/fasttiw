import { cn } from "@/lib/cn";

// โครงหน้าระหว่างรอเนื้อหาจริง (2026-09-24) — ใช้ใน loading.tsx ของแต่ละหน้าและ fallback ของ <Suspense>
//
// หลักการ: ขนาด/ตำแหน่งต้องใกล้ของจริงที่สุด ไม่งั้นพอเนื้อหามาถึงทั้งหน้าจะกระโดด (CLS) ซึ่งรู้สึกแย่กว่า
// รอเฉยๆ · สีใช้ slate-100 จางๆ ไม่ใส่ shimmer วิ่ง — หน้าส่วนใหญ่โชว์โครงไม่ถึงครึ่งวินาที แอนิเมชันที่ยังไม่ทัน
// เล่นจบจะดูกระตุกมากกว่าช่วย และเคารพ prefers-reduced-motion ไปในตัว

export function Bone({ className }: { className?: string }) {
    return <div aria-hidden className={cn("rounded-lg bg-slate-100", className)} />;
}

// การ์ดชุดข้อสอบ — สัดส่วนปก A4 แนวตั้ง (210:297) ตรงกับ ProductCard จริง
export function ProductCardSkeleton() {
    return (
        <div aria-hidden className="flex flex-col rounded-2xl border border-slate-100 bg-white overflow-hidden">
            <div className="aspect-[210/297] bg-slate-100" />
            <div className="p-3 flex flex-col gap-2">
                <Bone className="h-3.5 w-11/12" />
                <Bone className="h-3.5 w-2/3" />
                <Bone className="h-4 w-1/3 mt-1" />
            </div>
        </div>
    );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4" role="status" aria-label="กำลังโหลด">
            {Array.from({ length: count }, (_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}
