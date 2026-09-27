"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/api";
import { PhoneScreen, useDemoPlayer, useDemoTicker } from "@/app/components/phone-demo/PhoneScreen";
import StepList from "@/app/components/phone-demo/StepList";
import { MODE_PICK_SCENE, SCENES, pickDemoProducts, resolveScene, type ExamMode } from "./scenes";

// section "ดูทุกขั้นตอน" ของหน้าแรก (2026-09-27) — motion graphic เล่าการใช้งานจริงบนหน้าจอมือถือจำลอง
// ตั้งแต่เลือกชุดข้อสอบ → เข้าสู่ระบบ → ชำระเงิน → ... · เปิด/ปิดได้ที่เมนู "เปิดใช้งานระบบ" (landing_flow_demo)
//
// **หน้าจอในกรอบคือ UI จริงของเว็บฝั่งมือถือ** — component แสดงผลล้วน (ProductCard, Button, Card, Input, Badge)
// ใช้ตัวจริง ส่วนที่เหลือเขียนตามหน้าจริงด้วย class ชุดเดียวกัน (ดู scenes.tsx) · ข้อมูลชุดข้อสอบเป็นของจริงจากร้าน
// ห้ามต่อกับ backend จริงในนี้เด็ดขาด (ชำระเงินจริงผ่าน Stripe) — ทุกอย่างเป็นภาพจำลองที่คุมด้วยเวลา `t`
//
// **ทำไมไม่ใช่วิดีโอ**: ไฟล์หลาย MB ทำให้หน้าแรกช้า (ข้อ 5.5) ตัวหนังสือแตกบนมือถือ และหน้าจริงเปลี่ยนเมื่อไหร่ต้องอัดใหม่
//
// mode อยู่ใน state ก้อนเดียวกับฉาก/เวลา — ตอนวนรอบต้องสลับโหมดพร้อมกับกลับไปฉากแรกในจังหวะเดียว
type Position = { scene: number; t: number; mode: ExamMode };

const MODES: { key: ExamMode; label: string; hint: string; icon: typeof BookOpen }[] = [
    { key: "practice", label: "โหมดฝึก", hint: "เห็นเฉลยทันที", icon: BookOpen },
    { key: "timed", label: "โหมดจับเวลา", hint: "เหมือนสอบจริง", icon: Timer },
];

export default function FlowDemo({ products }: { products: Product[] }) {
    const demo = pickDemoProducts(products);
    const sectionRef = useRef<HTMLElement>(null);
    const phoneRef = useRef<HTMLDivElement>(null);
    // หน้าจอเสมือน 375px / นิ้วแตะ / นาฬิกา / มองเห็นหรือยัง — อยู่ใน phone-demo/PhoneScreen.tsx (ใช้ร่วมกับ paper-demo)
    const { near, setNear, reduced, userPaused, setUserPaused, playing } = useDemoPlayer(sectionRef);

    // รอบแรกเล่นโหมดฝึก (ผู้ใช้สั่ง — เห็นเฉลยทันทีคือจุดขายหลัก) รอบถัดไปโหมดจับเวลา สลับไปเรื่อยๆ
    // คนที่ดูเฉยๆ 2 รอบก็เห็นครบทั้งสองโหมด
    const [pos, setPos] = useState<Position>({ scene: 0, t: 0, mode: "practice" });

    // ตัวช่วยตรวจงาน (เฉพาะเครื่อง dev): window.__flowDemo.seek(ฉาก, ms) หยุดที่เฟรมนั้นเป๊ะ ใช้ถ่ายภาพทีละเฟรม
    // (สคริปต์ _perf-tmp/shot-flow-demo.mjs) — build จริงตัดทิ้งทั้งก้อน
    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        const w = window as unknown as { __flowDemo?: unknown };
        w.__flowDemo = {
            scenes: SCENES.map((s) => ({ key: s.key, duration: s.duration, practiceDuration: resolveScene(s, "practice").duration })),
            seek: (scene: number, t: number, mode: ExamMode = "timed") => {
                setNear(true);
                setUserPaused(true);
                setPos({ scene, t, mode });
            },
        };
        return () => {
            delete w.__flowDemo;
        };
    }, [setNear, setUserPaused]);

    useDemoTicker(playing, (delta) =>
        setPos(({ scene, t, mode }) => {
            const next = t + delta;
            if (next < resolveScene(SCENES[scene], mode).duration) return { scene, t: next, mode };
            const wrapped = scene + 1 >= SCENES.length;
            return { scene: wrapped ? 0 : scene + 1, t: 0, mode: wrapped ? (mode === "timed" ? "practice" : "timed") : mode };
        })
    );

    const scene = resolveScene(SCENES[pos.scene], pos.mode);
    const t = reduced ? scene.duration : pos.t;

    // บนมือถือ รายการขั้นตอนอยู่ใต้กรอบมือถือ — กดแล้วถ้ามองไม่เห็นกรอบ เลื่อนกลับไปให้เห็นว่าฉากเปลี่ยน
    function revealPhone() {
        const el = phoneRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function jump(index: number) {
        setPos((p) => ({ scene: index, t: 0, mode: p.mode }));
        setUserPaused(false);
        revealPhone();
    }

    // กดเลือกโหมดเอง = กลับไปขั้นเลือกโหมด นิ้วในมือถือกดการ์ดโหมดนั้น แล้วเล่นทางของโหมดนั้นต่อ
    function pickMode(mode: ExamMode) {
        setPos({ scene: MODE_PICK_SCENE, t: 0, mode });
        setUserPaused(false);
        revealPhone();
    }

    const progress = Math.min(1, t / scene.duration);

    return (
        <section ref={sectionRef} className="max-w-360 mx-auto px-4 sm:px-6 pb-20">
            <div className="text-center mb-10">
                <p className="text-sm font-medium text-brand-600 mb-2">ดูทุกขั้นตอนก่อนตัดสินใจ</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-balance">ซื้อง่าย ทำได้ทันที รู้ผลพร้อมเฉลย</h2>
                <p className="mt-3 text-slate-500 max-w-xl mx-auto text-balance">หน้าจอจริงของ Fasttiw บนมือถือ — ใช้งานได้แบบนี้ทุกขั้นตอน</p>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-8 lg:gap-14 items-center max-w-5xl mx-auto">
                {/* ขั้นตอน — จอใหญ่อยู่ซ้าย มือถืออยู่ใต้กรอบ (order) */}
                <StepList
                    className="order-2 lg:order-1"
                    steps={SCENES.map((base) => resolveScene(base, pos.mode))}
                    active={pos.scene}
                    progress={progress}
                    reduced={reduced}
                    paused={userPaused}
                    onJump={jump}
                    onTogglePause={() => setUserPaused((p) => !p)}
                    // ปุ่มสลับโหมด — อยู่กับขั้นเลือกโหมดตลอด (ไม่ใช่เฉพาะตอนเล่นขั้นนี้) กดเมื่อไหร่ก็ได้
                    extra={(i) =>
                        i === MODE_PICK_SCENE && (
                            <div className="mt-2 ml-2 sm:ml-14 grid grid-cols-2 gap-2" role="group" aria-label="เลือกโหมดที่อยากดู">
                                {MODES.map((m) => {
                                    const selected = pos.mode === m.key;
                                    return (
                                        <button
                                            key={m.key}
                                            type="button"
                                            onClick={() => pickMode(m.key)}
                                            aria-pressed={selected}
                                            className={cn(
                                                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                                                selected
                                                    ? "border-brand-300 bg-white shadow-sm ring-1 ring-brand-200"
                                                    : "border-slate-200 bg-white/60 hover:border-slate-300"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                    selected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                                                )}
                                            >
                                                <m.icon size={16} />
                                            </span>
                                            <span className="min-w-0">
                                                <span className={cn("block text-sm font-medium", selected ? "text-slate-900" : "text-slate-600")}>
                                                    {m.label}
                                                </span>
                                                <span className="block text-xs text-slate-500">{m.hint}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    }
                />

                {/* กรอบมือถือ — ต้องกำหนดความกว้างตรงๆ (ไม่ใช่ w-full): คอลัมน์นี้ของ grid เป็น auto และเนื้อหาข้างในเป็น
                    absolute ทั้งหมด ถ้าใช้ % ความกว้างจะยุบเหลือ 0 แล้วหน้าจอถูกย่อจนหาย (เจอตอนตรวจ) */}
                <div ref={phoneRef} className="order-1 lg:order-2 mx-auto w-82 max-w-full">
                    <PhoneScreen waypoints={scene.waypoints} t={t} hideCursor={reduced}>
                        {near && (
                            <div key={`${scene.key}-${pos.mode}`} className="absolute inset-0">
                                {scene.render({ t, demo, mode: pos.mode })}
                            </div>
                        )}
                    </PhoneScreen>
                </div>
            </div>
        </section>
    );
}
