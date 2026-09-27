"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { cn } from "@/lib/cn";

// ชิ้นส่วนกลางของ motion graphic แบบ "มือถือจำลอง" บนหน้าแรก — ใช้ร่วมกันระหว่าง section "ดูทุกขั้นตอน" (flow-demo)
// กับ "สอบแบบกระดาษ" (paper-demo): กรอบมือถือ + หน้าจอเสมือน 375px + นิ้วแตะ + นาฬิกาของฉาก
//
// หน้าจอเสมือนกว้าง 375px (มือถือ) เสมอ แล้วย่อขยายทั้งก้อนให้พอดีกรอบ — layout ข้างในจึงเหมือนมือถือจริงทุกขนาดจอ
// ⚠ ข้างในห้ามใช้ class ที่มี breakpoint (sm:/md:/lg:) เพราะ breakpoint อ่านความกว้างจอจริง ไม่ใช่ 375px เสมือน

export const SCREEN_W = 375;
export const SCREEN_H = 740;
const TICK_MS = 80; // อัปเดตฉาก ~12 ครั้ง/วิ — ความลื่นมาจาก CSS transition ไม่ใช่จำนวนเฟรม
const CURSOR_LEAD_MS = 600; // เคอร์เซอร์เริ่มเลื่อนไปหาเป้าก่อนกดกี่ ms

/** จุดที่นิ้วกด: at = ms ที่กด (นับจากต้นฉาก), target = ค่า data-demo ของปุ่ม — นิ้วเลื่อนไปหาเอง */
export type Waypoint = { at: number; target: string; x?: number; y?: number };

function activeWaypoint(waypoints: Waypoint[], t: number) {
    let current: Waypoint | null = null;
    for (const w of waypoints) if (t >= w.at - CURSOR_LEAD_MS) current = w;
    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];
    const visible = !!first && t >= first.at - CURSOR_LEAD_MS - 300 && t <= last.at + 600;
    const tapping = !!current && t >= current.at && t < current.at + 350;
    return { current, visible, tapping };
}

/**
 * สถานะการเล่นของ section: near = เลื่อนใกล้ถึงแล้ว (สร้างฉาก — ส่วนต้นหน้าไม่ต้องจ่ายค่าเรนเดอร์) · inView = อยู่บนจอจริง (เล่น)
 * · reduced = ผู้ใช้ปิดการเคลื่อนไหว (ไม่เล่นเอง แสดงภาพจบของแต่ละขั้น) · userPaused = กดหยุดเอง
 */
export function useDemoPlayer(sectionRef: RefObject<HTMLElement | null>) {
    const [near, setNear] = useState(false);
    const [inView, setInView] = useState(false);
    const [userPaused, setUserPaused] = useState(false);
    const [reduced, setReduced] = useState(false);

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
    }, [sectionRef]);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => setReduced(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    const playing = near && inView && !userPaused && !reduced;
    return { near, setNear, inView, reduced, userPaused, setUserPaused, playing };
}

/**
 * นาฬิกาของฉาก — เรียก onDelta(ms ที่ผ่านไปจริง) ทุก tick เฉพาะตอน playing และแท็บเปิดอยู่
 * ใช้เวลาจริง (ไม่นับจำนวนครั้ง) เผื่อ timer ถูกหน่วง แต่ตัดช่วงที่ขาดไปนานๆ ทิ้ง (สลับแท็บกลับมาแล้วฉากต้องไม่กระโดดข้าม)
 */
export function useDemoTicker(playing: boolean, onDelta: (ms: number) => void) {
    const cb = useRef(onDelta);
    useEffect(() => {
        cb.current = onDelta;
    });
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
            cb.current(delta);
        }, TICK_MS);
        return () => clearInterval(timer);
    }, [playing]);
}

/**
 * กรอบมือถือ + หน้าจอเสมือน 375×740 ที่ย่อให้พอดีความกว้างของกรอบ (กำหนดความกว้างที่ตัวแม่ — ต้องเป็นค่าตายตัว
 * เช่น w-82 ไม่ใช่ w-full ในคอลัมน์ grid แบบ auto ไม่งั้นความกว้างยุบเป็น 0) + นิ้วแตะตาม waypoints
 * dark = หน้าจอพื้นดำ (หน้ากล้อง) แถบสถานะเป็นตัวขาว
 */
export function PhoneScreen({
    waypoints,
    t,
    hideCursor,
    dark,
    className,
    children,
}: {
    waypoints: Waypoint[];
    t: number;
    hideCursor?: boolean;
    dark?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const frameRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.85);

    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / SCREEN_W));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // เคอร์เซอร์: หาตำแหน่งของปุ่มเป้าหมายจาก DOM จริง (data-demo) — ไม่ hardcode พิกัด layout เปลี่ยนก็ยังชี้ถูก
    // สเกลคิดจากขนาดที่แสดงจริงบนจอ (กรอบอาจถูกย่อซ้อนอีกชั้นจากตัวแม่ เช่น เวทีของ paper-demo)
    // ขยับผ่าน style ตรงๆ ไม่ใช่ state จะได้ไม่เรนเดอร์ซ้ำอีกรอบทุก tick
    useLayoutEffect(() => {
        const cursor = cursorRef.current;
        const screen = screenRef.current;
        if (!cursor || !screen) return;
        const { current, visible, tapping } = hideCursor ? { current: null, visible: false, tapping: false } : activeWaypoint(waypoints, t);
        const target = current ? screen.querySelector<HTMLElement>(`[data-demo="${current.target}"]`) : null;
        const s = screen.getBoundingClientRect();
        const shown = s.width / SCREEN_W;
        if (target && shown > 0) {
            const r = target.getBoundingClientRect();
            const x = (r.left + r.width * (current?.x ?? 0.5) - s.left) / shown;
            const y = (r.top + r.height * (current?.y ?? 0.5) - s.top) / shown;
            cursor.style.transform = `translate(${x}px, ${y}px)`;
        }
        cursor.style.opacity = visible && target ? "1" : "0";
        cursor.dataset.tapping = tapping ? "1" : "0";
    });

    return (
        <div className={cn("relative rounded-[2.75rem] border-10 border-slate-900 bg-slate-900 shadow-2xl shadow-slate-300/70", className)}>
            <div className="absolute left-1/2 top-0 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
            <div
                ref={frameRef}
                className={cn("relative overflow-hidden rounded-[2.1rem] transition-colors duration-300", dark ? "bg-black" : "bg-white")}
                style={{ height: SCREEN_H * scale }}
                aria-hidden
                inert
            >
                <div
                    ref={screenRef}
                    className="absolute left-0 top-0 origin-top-left"
                    style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}
                >
                    <div
                        className={cn(
                            "flex items-center justify-between px-7 pt-3 pb-1 text-[11px] font-medium transition-colors duration-300",
                            dark ? "text-white" : "text-slate-700"
                        )}
                    >
                        <span>9:41</span>
                        <span className="flex items-center gap-1">
                            <Signal size={12} />
                            <Wifi size={12} />
                            <BatteryFull size={15} />
                        </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 top-7">{children}</div>
                    <div ref={cursorRef} className="flow-cursor pointer-events-none absolute left-0 top-0 z-30 opacity-0">
                        <span className="flow-cursor-dot" />
                    </div>
                </div>
            </div>
        </div>
    );
}
