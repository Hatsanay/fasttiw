"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pause, Play, Signal, Wifi, BatteryFull } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/api";
import { SCENES, pickDemoProducts, type Waypoint } from "./scenes";

// section "ดูทุกขั้นตอน" ของหน้าแรก (2026-09-27) — motion graphic เล่าการใช้งานจริงบนหน้าจอมือถือจำลอง
// ตั้งแต่เลือกชุดข้อสอบ → เข้าสู่ระบบ → ชำระเงิน → ... · เปิด/ปิดได้ที่เมนู "เปิดใช้งานระบบ" (landing_flow_demo)
//
// **หน้าจอในกรอบคือ UI จริงของเว็บฝั่งมือถือ** — component แสดงผลล้วน (ProductCard, Button, Card, Input, Badge)
// ใช้ตัวจริง ส่วนที่เหลือเขียนตามหน้าจริงด้วย class ชุดเดียวกัน (ดู scenes.tsx) · ข้อมูลชุดข้อสอบเป็นของจริงจากร้าน
// ห้ามต่อกับ backend จริงในนี้เด็ดขาด (ชำระเงินจริงผ่าน Stripe) — ทุกอย่างเป็นภาพจำลองที่คุมด้วยเวลา `t`
//
// **ทำไมไม่ใช่วิดีโอ**: ไฟล์หลาย MB ทำให้หน้าแรกช้า (ข้อ 5.5) ตัวหนังสือแตกบนมือถือ และหน้าจริงเปลี่ยนเมื่อไหร่ต้องอัดใหม่
//
// หน้าจอเสมือนกว้าง 375px (มือถือ) เสมอ แล้วย่อขยายทั้งก้อนให้พอดีกรอบ — layout ข้างในจึงเหมือนมือถือจริงทุกขนาดจอ
// ⚠ ข้างในห้ามใช้ class ที่มี breakpoint (sm:/md:/lg:) เพราะ breakpoint อ่านความกว้างจอจริง ไม่ใช่ 375px เสมือน
const SCREEN_W = 375;
const SCREEN_H = 740;
const TICK_MS = 80; // อัปเดตฉาก ~12 ครั้ง/วิ — ความลื่นมาจาก CSS transition ไม่ใช่จำนวนเฟรม
const CURSOR_LEAD_MS = 600; // เคอร์เซอร์เริ่มเลื่อนไปหาเป้าก่อนกดกี่ ms

type Position = { scene: number; t: number };

function activeWaypoint(waypoints: Waypoint[], t: number) {
    let current: Waypoint | null = null;
    for (const w of waypoints) if (t >= w.at - CURSOR_LEAD_MS) current = w;
    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];
    const visible = !!first && t >= first.at - CURSOR_LEAD_MS - 300 && t <= last.at + 600;
    const tapping = !!current && t >= current.at && t < current.at + 350;
    return { current, visible, tapping };
}

export default function FlowDemo({ products }: { products: Product[] }) {
    const demo = pickDemoProducts(products);
    const sectionRef = useRef<HTMLElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);

    const [pos, setPos] = useState<Position>({ scene: 0, t: 0 });
    const [near, setNear] = useState(false); // สร้างฉากเมื่อเลื่อนใกล้ถึงเท่านั้น — ส่วนต้นหน้าไม่ต้องจ่ายค่าเรนเดอร์
    const [inView, setInView] = useState(false);
    const [userPaused, setUserPaused] = useState(false);
    const [reduced, setReduced] = useState(false);
    const [scale, setScale] = useState(0.85);

    // มองเห็น section ไหม: near = ใกล้แล้ว (สร้างฉาก) · inView = อยู่บนจอจริง (เล่น)
    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
        const viewObs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
        nearObs.observe(el);
        viewObs.observe(el);
        return () => {
            nearObs.disconnect();
            viewObs.disconnect();
        };
    }, []);

    // ปิดการเคลื่อนไหวไว้ = ไม่เล่นเอง แสดงภาพจบของแต่ละขั้น ให้กดดูทีละขั้นเอง
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => setReduced(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    // ตัวช่วยตรวจงาน (เฉพาะเครื่อง dev): window.__flowDemo.seek(ฉาก, ms) หยุดที่เฟรมนั้นเป๊ะ ใช้ถ่ายภาพทีละเฟรม
    // (สคริปต์ _perf-tmp/shot-flow-demo.mjs) — build จริงตัดทิ้งทั้งก้อน
    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        const w = window as unknown as { __flowDemo?: unknown };
        w.__flowDemo = {
            scenes: SCENES.map((s) => ({ key: s.key, duration: s.duration })),
            seek: (scene: number, t: number) => {
                setNear(true);
                setUserPaused(true);
                setPos({ scene, t });
            },
        };
        return () => {
            delete w.__flowDemo;
        };
    }, []);

    // ย่อขยายหน้าจอเสมือน 375px ให้พอดีกรอบ
    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / SCREEN_W));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // นาฬิกาของฉาก — เดินเฉพาะตอนอยู่บนจอ แท็บเปิดอยู่ และไม่ได้กดหยุด · ใช้เวลาจริงที่ผ่านไป (ไม่นับจำนวนครั้ง)
    // เผื่อ timer ถูกหน่วง แต่ตัดช่วงที่ขาดไปนานๆ ทิ้ง (สลับแท็บกลับมาแล้วฉากต้องไม่กระโดดข้ามไป)
    const playing = near && inView && !userPaused && !reduced;
    useEffect(() => {
        if (!playing) return;
        let last = performance.now();
        const timer = setInterval(() => {
            if (document.hidden) {
                last = performance.now();
                return;
            }
            const now = performance.now();
            const delta = Math.min(now - last, 250);
            last = now;
            setPos(({ scene, t }) => {
                const next = t + delta;
                return next >= SCENES[scene].duration ? { scene: (scene + 1) % SCENES.length, t: 0 } : { scene, t: next };
            });
        }, TICK_MS);
        return () => clearInterval(timer);
    }, [playing]);

    const scene = SCENES[pos.scene];
    const t = reduced ? scene.duration : pos.t;

    // เคอร์เซอร์: หาตำแหน่งของปุ่มเป้าหมายจาก DOM จริง (data-demo) — ไม่ hardcode พิกัด layout เปลี่ยนก็ยังชี้ถูก
    // ขยับผ่าน style ตรงๆ ไม่ใช่ state จะได้ไม่เรนเดอร์ซ้ำอีกรอบทุก tick
    useLayoutEffect(() => {
        const cursor = cursorRef.current;
        const screen = screenRef.current;
        if (!cursor || !screen) return;
        const { current, visible, tapping } = reduced ? { current: null, visible: false, tapping: false } : activeWaypoint(scene.waypoints, t);
        const target = current ? screen.querySelector<HTMLElement>(`[data-demo="${current.target}"]`) : null;
        if (target) {
            const s = screen.getBoundingClientRect();
            const r = target.getBoundingClientRect();
            const x = (r.left + r.width * (current?.x ?? 0.5) - s.left) / scale;
            const y = (r.top + r.height * (current?.y ?? 0.5) - s.top) / scale;
            cursor.style.transform = `translate(${x}px, ${y}px)`;
        }
        cursor.style.opacity = visible && target ? "1" : "0";
        cursor.dataset.tapping = tapping ? "1" : "0";
    });

    function jump(index: number) {
        setPos({ scene: index, t: 0 });
        setUserPaused(false);
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
                <ol className="order-2 lg:order-1 flex flex-col gap-2">
                    {SCENES.map((s, i) => {
                        const active = i === pos.scene;
                        return (
                            <li key={s.key}>
                                <button
                                    type="button"
                                    onClick={() => jump(i)}
                                    aria-current={active ? "step" : undefined}
                                    className={cn(
                                        "w-full text-left rounded-2xl border px-4 py-3 transition-colors",
                                        active ? "border-brand-200 bg-brand-50/60" : "border-transparent hover:bg-slate-50"
                                    )}
                                >
                                    <span className="flex items-center gap-3">
                                        <span
                                            className={cn(
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                                active ? "bg-brand-600 text-white" : i < pos.scene ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                                            )}
                                        >
                                            {i + 1}
                                        </span>
                                        <span className={cn("font-medium", active ? "text-slate-900" : "text-slate-600")}>{s.title}</span>
                                    </span>
                                    {/* คำอธิบาย + แถบเวลา เฉพาะขั้นที่กำลังเล่น */}
                                    {active && (
                                        <>
                                            <span className="mt-1.5 block pl-10 text-sm text-slate-500 leading-relaxed">{s.caption}</span>
                                            {!reduced && (
                                                <span className="mt-2.5 ml-10 block h-1 rounded-full bg-brand-100 overflow-hidden">
                                                    <span
                                                        className="block h-full rounded-full bg-brand-500 origin-left transition-transform duration-100 ease-linear"
                                                        style={{ transform: `scaleX(${progress})` }}
                                                    />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                    {!reduced && (
                        <li className="pl-4 pt-1">
                            <button
                                type="button"
                                onClick={() => setUserPaused((p) => !p)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"
                            >
                                {userPaused ? <Play size={15} /> : <Pause size={15} />}
                                {userPaused ? "เล่นต่อ" : "หยุดชั่วคราว"}
                            </button>
                        </li>
                    )}
                </ol>

                {/* กรอบมือถือ — ต้องกำหนดความกว้างตรงๆ (ไม่ใช่ w-full): คอลัมน์นี้ของ grid เป็น auto และเนื้อหาข้างในเป็น
                    absolute ทั้งหมด ถ้าใช้ % ความกว้างจะยุบเหลือ 0 แล้วหน้าจอถูกย่อจนหาย (เจอตอนตรวจ) */}
                <div className="order-1 lg:order-2 mx-auto w-82 max-w-full">
                    <div className="relative rounded-[2.75rem] border-10 border-slate-900 bg-slate-900 shadow-2xl shadow-slate-300/70">
                        <div className="absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
                        <div
                            ref={frameRef}
                            className="relative overflow-hidden rounded-[2.1rem] bg-white"
                            style={{ height: SCREEN_H * scale }}
                            aria-hidden
                            inert
                        >
                            <div
                                ref={screenRef}
                                className="absolute left-0 top-0 origin-top-left"
                                style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}
                            >
                                <div className="flex items-center justify-between px-7 pt-3 pb-1 text-[11px] font-medium text-slate-700">
                                    <span>9:41</span>
                                    <span className="flex items-center gap-1">
                                        <Signal size={12} />
                                        <Wifi size={12} />
                                        <BatteryFull size={15} />
                                    </span>
                                </div>
                                {near && (
                                    <div key={scene.key} className="absolute inset-x-0 bottom-0 top-7">
                                        {scene.render({ t, demo })}
                                    </div>
                                )}
                                {/* เคอร์เซอร์นิ้วแตะ — ตำแหน่งคำนวณใน useLayoutEffect */}
                                <div
                                    ref={cursorRef}
                                    className="flow-cursor pointer-events-none absolute left-0 top-0 z-30 opacity-0"
                                >
                                    <span className="flow-cursor-dot" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
