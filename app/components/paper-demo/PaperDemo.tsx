"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/api";
import { PhoneScreen, useDemoPlayer, useDemoTicker } from "@/app/components/phone-demo/PhoneScreen";
import StepList from "@/app/components/phone-demo/StepList";
import SheetReplica from "./SheetReplica";
import { DEMO_CODE, PAPER_SCENES, pickPaperDemo } from "./scenes";

// section "สอบแบบกระดาษ" ของหน้าแรก (2026-09-28) — motion graphic เล่าระบบสอบกระดาษ: สร้างชุดสอบ → พิมพ์ → ฝน →
// ยกมือถือสแกน → ... · แสดงเฉพาะตอนเปิดฟีเจอร์ paper_exam (ตัวเดียวกับที่เปิดระบบให้ลูกค้าใช้ — app/page.tsx)
//
// เวทีมี 2 ชิ้น: มือถือจำลอง (PhoneScreen ตัวเดียวกับ flow-demo) + กระดาษคำตอบ (SheetReplica — ผังเดียวกับ PDF จริง)
// สองชิ้นซ้อนอยู่ในกล่องขนาดเท่ามือถือ แล้วเลื่อน/สลับหน้า-หลังด้วย CSS transition ตามฉาก (scenes.tsx)
// ทำไมไม่ใช่วิดีโอ + กฎหน้าจอเสมือน 375px: ดูหัวไฟล์ phone-demo/PhoneScreen.tsx
// ห้ามต่อ backend จริงในนี้ — ทุกอย่างเป็นภาพจำลองที่คุมด้วยเวลา t

type Position = { scene: number; t: number };

export default function PaperDemo({ products }: { products: Product[] }) {
    const demo = pickPaperDemo(products);
    const sectionRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const { near, setNear, reduced, userPaused, setUserPaused, playing } = useDemoPlayer(sectionRef);
    const [pos, setPos] = useState<Position>({ scene: 0, t: 0 });

    // ตัวช่วยตรวจงาน (เฉพาะเครื่อง dev): window.__paperDemo.seek(ฉาก, ms) หยุดที่เฟรมนั้น — build จริงตัดทิ้งทั้งก้อน
    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        const w = window as unknown as { __paperDemo?: unknown };
        w.__paperDemo = {
            scenes: PAPER_SCENES.map((s) => ({ key: s.key, duration: s.duration })),
            seek: (scene: number, t: number) => {
                setNear(true);
                setUserPaused(true);
                setPos({ scene, t });
            },
        };
        return () => {
            delete w.__paperDemo;
        };
    }, [setNear, setUserPaused]);

    useDemoTicker(playing, (delta) =>
        setPos(({ scene, t }) => {
            const next = t + delta;
            if (next < PAPER_SCENES[scene].duration) return { scene, t: next };
            return { scene: (scene + 1) % PAPER_SCENES.length, t: 0 };
        })
    );

    const scene = PAPER_SCENES[pos.scene];
    const t = reduced ? scene.duration : pos.t;
    const stage = scene.stage(t);
    const progress = Math.min(1, t / scene.duration);

    function jump(index: number) {
        setPos({ scene: index, t: 0 });
        setUserPaused(false);
        const el = stageRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return (
        <section ref={sectionRef} className="max-w-360 mx-auto overflow-x-clip px-4 sm:px-6 pb-20">
            <div className="text-center mb-10">
                <p className="text-sm font-medium text-brand-600 mb-2">ใหม่ · สอบแบบกระดาษ</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-balance">ชอบทำบนกระดาษ? ทำได้ แล้วให้มือถือตรวจให้</h2>
                <p className="mt-3 text-slate-500 max-w-xl mx-auto text-balance">
                    พิมพ์กระดาษคำตอบไปฝนเหมือนสนามจริง ยกมือถือส่องครั้งเดียว รู้คะแนนพร้อมเฉลยละเอียดทุกข้อ
                </p>
            </div>

            <div className="grid lg:grid-cols-[auto_minmax(0,1fr)] gap-8 lg:gap-14 items-center max-w-5xl mx-auto">
                {/* เวที — กล่องขนาดเท่ามือถือ กระดาษซ้อนอยู่ข้างหลัง/ข้างหน้าตามฉาก · pt เผื่อที่ให้กระดาษโผล่เหนือมือถือ */}
                <div ref={stageRef} className="mx-auto w-82 max-w-full pt-16">
                    <div className="relative">
                        <div
                            className={cn(
                                "absolute left-[6%] top-[4%] w-[88%] transition-all duration-700 ease-in-out",
                                stage.paperOnTop ? "z-20" : "z-0"
                            )}
                            style={stage.paper}
                        >
                            <div className="overflow-hidden rounded-[3px] bg-white shadow-xl shadow-slate-400/40 ring-1 ring-slate-200">
                                <div
                                    className="transition-transform duration-900 ease-in-out"
                                    style={{
                                        transform: stage.zoom ? `scale(${stage.zoom.scale})` : "none",
                                        transformOrigin: stage.zoom?.origin ?? "50% 50%",
                                    }}
                                >
                                    {near && (
                                        <SheetReplica code={DEMO_CODE} productName={demo.productName} marks={stage.marks} pencilAt={stage.pencil} className="block w-full" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 transition-all duration-700 ease-in-out" style={stage.phone}>
                            <PhoneScreen waypoints={scene.waypoints} t={t} hideCursor={reduced} dark={scene.dark}>
                                {near && (
                                    <div key={scene.key} className="absolute inset-0">
                                        {scene.screen({ t, demo })}
                                    </div>
                                )}
                            </PhoneScreen>
                        </div>
                    </div>
                </div>

                <StepList
                    steps={PAPER_SCENES}
                    active={pos.scene}
                    progress={progress}
                    reduced={reduced}
                    paused={userPaused}
                    onJump={jump}
                    onTogglePause={() => setUserPaused((p) => !p)}
                />
            </div>
        </section>
    );
}
