"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

// "ตัวอย่างผลที่จะได้" ในกล่องแบบทดสอบวัดระดับฟรีของหน้าแรก — ข้อมูลสมมติ (มีข้อความกำกับ) ไม่ใช่ผลของใคร
// สีและป้ายชุดเดียวกับหน้าผลจริง (DiagnosticResultView)
//
// motion graphic (2026-09-27): เลื่อนมาถึงแล้วแถบคะแนนวิ่งเติมทีละหัวข้อ → ป้าย "ควรเร่ง" ของหัวข้อที่อ่อนที่สุด
// กะพริบเรียกสายตา → บรรทัด "เริ่มจาก..." ขึ้นตาม — เล่าในภาพเดียวว่าผลที่ได้บอกว่าต้องเริ่มอ่านตรงไหน
// ซึ่งคือเหตุผลที่คนแปลกหน้าควรกดทำ (ทางเข้าฟรีที่เปลี่ยนผู้เยี่ยมชมเป็นลูกค้า)
//
// CSS อยู่ที่หัวข้อ motion graphic ใน globals.css — หน้าตาปกติ = ฉากจบ ยังไม่เลื่อนมาถึง/ปิดการเคลื่อนไหว
// = เห็นผลครบเหมือนเดิม · เล่นครั้งเดียวต่อการเปิดหน้า
const TOPICS = [
    { name: "อนุกรม", pct: 33, label: "ควรเร่ง", bar: "bg-red-500", chip: "bg-red-50 text-red-600" },
    { name: "อุปมาอุปไมย", pct: 67, label: "พอใช้", bar: "bg-amber-400", chip: "bg-amber-50 text-amber-700" },
    { name: "คณิตศาสตร์พื้นฐาน", pct: 100, label: "แน่น", bar: "bg-green-500", chip: "bg-green-50 text-green-700" },
];

const at = (seconds: number) => ({ "--lm-d": `${seconds}s` }) as CSSProperties;

export default function DiagnosticPreview() {
    const ref = useRef<HTMLDivElement>(null);
    const [play, setPlay] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // เข้าจอเกือบทั้งกล่องก่อนค่อยเล่น — ถ้าเล่นตอนโผล่มานิดเดียว แถบวิ่งจบไปก่อนคนเลื่อนมาเห็น
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setPlay(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.6 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const weakest = TOPICS.reduce((a, b) => (b.pct < a.pct ? b : a));

    return (
        <div ref={ref} className={cn("relative rounded-2xl border border-slate-100 bg-slate-50/60 p-5", play && "lm-play")} aria-hidden>
            <p className="text-xs text-slate-400 mb-3">ตัวอย่างผลที่จะได้</p>
            {TOPICS.map((t, i) => {
                // แถบเริ่มห่างกัน 0.25 วิ · ป้ายเด้งตอนแถบของตัวเองวิ่งใกล้จบ
                const barStart = 0.3 + i * 0.25;
                return (
                    <div key={t.name} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-600">{t.name}</span>
                            {/* ป้ายเด้งตอนแถบของตัวเองวิ่งใกล้จบ · ตัวที่อ่อนที่สุดกะพริบซ้ำหลังทุกแถบจบ — แยกเป็น 2 ชั้น
                                เพราะ element หนึ่งเล่นได้ animation เดียว (ถ้าใส่ทั้งคู่ ตัวหลังทับตัวแรก ป้ายโผล่ตั้งแต่ต้น) */}
                            <span className="lm-pop inline-block" style={at(barStart + 0.7)}>
                                <span
                                    className={cn("inline-block rounded-full px-2 py-0.5 font-medium", t.chip, t === weakest && "lm-attention")}
                                    style={at(1.8)}
                                >
                                    {t.label}
                                </span>
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-white overflow-hidden">
                            <div className={cn("lm-bar h-full rounded-full", t.bar)} style={{ width: `${t.pct}%`, ...at(barStart) }} />
                        </div>
                    </div>
                );
            })}
            <p className="lm-fade-up mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-medium text-slate-700" style={at(2.4)}>
                <ArrowRight size={14} className="text-brand-600" />
                แนะนำ: เริ่มอ่าน <span className="text-red-600">{weakest.name}</span> ก่อน
            </p>
        </div>
    );
}
