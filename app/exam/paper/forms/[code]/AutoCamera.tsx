"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Point } from "@/lib/paper/layout";
import { findFiducials } from "@/lib/paper/omr";
import { grayFromVideo, locateGray, type LocatedPage } from "@/lib/paper/scan";

// สแกนอัตโนมัติด้วยกล้องสด (ระบบสอบกระดาษ — CLAUDE.md ข้อ 6.9)
// ดูเฟรมกล้องทุก ~0.25 วิ หาสี่เหลี่ยมดำ 4 มุม (ภาพย่อ ~960px เร็วพอทำทุกเฟรม) → กระดาษอยู่นิ่งครบ ~1 วิ → จับเฟรมเต็ม
// ความละเอียดแล้วอ่านจริง (QR + วง) · อ่านไม่ผ่านก็สแกนต่อเอง ลูกค้าแค่ถือให้นิ่ง
// ความแม่นที่ความละเอียดวิดีโอ (1080×1920, 1440×1920) วัดด้วย _perf-tmp/paper-omr-harness.mjs แล้ว: ผิดโดยไม่เตือน 0
// กติกา "ไม่เดา" เหมือนเดิมทุกอย่าง — ข้อที่ไม่ชัดยังต้องให้ลูกค้ายืนยันในหน้าหลักหลังปิดกล้อง

export type CaptureOutcome = { ok: true; page: number } | { ok: false; reason: string };

const DETECT_EVERY_MS = 250;
const DETECT_MAX_SIDE = 960;
/** จำนวนครั้งติดกันที่เจอกระดาษในตำแหน่งเดิม ก่อนถ่ายเอง (~1 วินาที) — กันภาพเบลอจากมือที่ยังขยับ */
const STABLE_FRAMES = 4;
/** มุมขยับได้ไม่เกินกี่ส่วนของด้านสั้นของภาพ ถึงนับว่า "นิ่ง" */
const MAX_SHIFT = 0.02;
/** กรอบสี่เหลี่ยมมุมต้องกินพื้นที่ภาพอย่างน้อยเท่านี้ — ไกลกว่านี้วงคำตอบเล็กเกินไปจะอ่านได้ไม่ดี */
const MIN_COVER = 0.2;

type Hint = { tone: "info" | "warn" | "ok"; text: string };

function quadArea(p: Point[]): number {
    let sum = 0;
    for (let i = 0; i < 4; i++) sum += p[i].x * p[(i + 1) % 4].y - p[(i + 1) % 4].x * p[i].y;
    return Math.abs(sum) / 2;
}

/** วาดกรอบรอบกระดาษที่เจอ ทับบนวิดีโอ (วิดีโอแสดงแบบ object-contain → แปลงพิกัดตามการย่อ+ขอบดำ) */
function drawQuad(overlay: HTMLCanvasElement, video: HTMLVideoElement, corners: Point[] | null, steady: boolean) {
    const dpr = window.devicePixelRatio || 1;
    const w = overlay.clientWidth;
    const h = overlay.clientHeight;
    if (overlay.width !== Math.round(w * dpr)) overlay.width = Math.round(w * dpr);
    if (overlay.height !== Math.round(h * dpr)) overlay.height = Math.round(h * dpr);
    const ctx = overlay.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!corners) return;
    const s = Math.min(w / video.videoWidth, h / video.videoHeight);
    const ox = (w - video.videoWidth * s) / 2;
    const oy = (h - video.videoHeight * s) / 2;
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(ox + p.x * s, oy + p.y * s) : ctx.moveTo(ox + p.x * s, oy + p.y * s)));
    ctx.closePath();
    ctx.fillStyle = steady ? "rgba(34,197,94,0.18)" : "rgba(250,204,21,0.12)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = steady ? "#22c55e" : "#facc15";
    ctx.stroke();
}

function cameraErrorText(err: unknown): string {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") return "ไม่ได้รับอนุญาตให้ใช้กล้อง — อนุญาตกล้องในการตั้งค่าเบราว์เซอร์ หรือใช้กล้องปกติแทน";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "ไม่พบกล้องที่ใช้ได้ในเครื่องนี้";
    if (name === "NotReadableError") return "กล้องถูกแอปอื่นใช้อยู่ — ปิดแอปนั้นแล้วลองใหม่";
    return "เปิดกล้องไม่ได้";
}

export default function AutoCamera({
    totalPages,
    scannedPages,
    onCapture,
    onClose,
    onFallback,
}: {
    totalPages: number;
    /** หน้าที่สแกนไว้แล้วก่อนเปิดกล้อง (นับรวมตอนเช็คว่าครบทุกหน้าหรือยัง) */
    scannedPages: number[];
    onCapture: (located: Extract<LocatedPage, { ok: true }>) => Promise<CaptureOutcome>;
    onClose: () => void;
    /** เปิดกล้องสดไม่ได้ → ใช้กล้องของเครื่องแทน (input capture) */
    onFallback: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [hint, setHint] = useState<Hint>({ tone: "info", text: "กำลังเปิดกล้อง..." });
    const [reading, setReading] = useState(false);
    const [found, setFound] = useState(false);
    const [flash, setFlash] = useState(false);
    const [sessionPages, setSessionPages] = useState<number[]>([]);
    const shootNowRef = useRef(false);

    // ค่าล่าสุดของ props ให้ลูปกล้องอ่าน — ไม่ใส่เป็น dependency ไม่งั้นกล้องปิด-เปิดใหม่ทุกครั้งที่หน้าหลักเรนเดอร์
    const latest = useRef({ onCapture, onClose, scannedPages, totalPages });
    useEffect(() => {
        latest.current = { onCapture, onClose, scannedPages, totalPages };
    });

    // ล็อกการเลื่อนหน้าข้างหลังระหว่างเปิดกล้องเต็มจอ
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current!;
        const overlay = overlayRef.current!;
        const work = document.createElement("canvas");
        const session = new Set<number>();
        let stream: MediaStream | null = null;
        let stopped = false;
        let timer = 0;
        let prev: Point[] | null = null;
        let steadyCount = 0;
        let pausedUntil = 0;

        const pause = (ms: number) => {
            pausedUntil = Date.now() + ms;
            prev = null;
            steadyCount = 0;
            drawQuad(overlay, video, null, false);
            setFound(false);
        };

        async function capture() {
            setReading(true);
            setHint({ tone: "info", text: "กำลังอ่านกระดาษคำตอบ..." });
            // ให้จอวาดข้อความก่อนเริ่มงานหนัก (อ่านเฟรมเต็มบนเธรดหลัก)
            await new Promise((r) => setTimeout(r, 30));
            try {
                const located = locateGray(grayFromVideo(video, work));
                if (!located.ok) {
                    setHint({ tone: "warn", text: located.reason });
                    pause(1200);
                    return;
                }
                if (session.has(located.id.page)) {
                    setHint({ tone: "warn", text: `หน้า ${located.id.page} สแกนแล้ว — เปลี่ยนเป็นหน้าถัดไป` });
                    pause(1500);
                    return;
                }
                const outcome = await latest.current.onCapture(located);
                if (!outcome.ok) {
                    setHint({ tone: "warn", text: outcome.reason });
                    pause(2500);
                    return;
                }
                session.add(outcome.page);
                setSessionPages([...session].sort((a, b) => a - b));
                navigator.vibrate?.(60);
                setFlash(true);
                setTimeout(() => setFlash(false), 150);
                const done = new Set([...latest.current.scannedPages, ...session]);
                if (done.size >= latest.current.totalPages) {
                    setHint({ tone: "ok", text: latest.current.totalPages > 1 ? "สแกนครบทุกหน้าแล้ว" : "สแกนเรียบร้อย" });
                    stopped = true;
                    setTimeout(() => latest.current.onClose(), 900);
                    return;
                }
                setHint({ tone: "ok", text: `หน้า ${outcome.page} เรียบร้อย — เปลี่ยนเป็นหน้าถัดไป` });
                pause(1500);
            } finally {
                setReading(false);
            }
        }

        async function tick() {
            if (stopped) return;
            const ready = video.readyState >= 2 && video.videoWidth > 0 && !document.hidden && Date.now() >= pausedUntil;
            if (ready) {
                if (shootNowRef.current) {
                    shootNowRef.current = false;
                    await capture();
                } else {
                    const small = grayFromVideo(video, work, DETECT_MAX_SIDE);
                    const scale = video.videoWidth / small.width;
                    const result = findFiducials(small);
                    if (!result.ok) {
                        prev = null;
                        steadyCount = 0;
                        drawQuad(overlay, video, null, false);
                        setFound(false);
                        setHint({ tone: "info", text: "เล็งให้เห็นกระดาษทั้งแผ่น — สี่เหลี่ยมดำครบ 4 มุม" });
                    } else {
                        const corners = result.corners.map((p) => ({ x: p.x * scale, y: p.y * scale }));
                        const cover = quadArea(corners) / (video.videoWidth * video.videoHeight);
                        const tolerance = MAX_SHIFT * Math.min(video.videoWidth, video.videoHeight);
                        const still = !!prev && corners.every((p, i) => Math.hypot(p.x - prev![i].x, p.y - prev![i].y) < tolerance);
                        steadyCount = still ? steadyCount + 1 : 1;
                        prev = corners;
                        setFound(true);
                        if (cover < MIN_COVER) {
                            steadyCount = 0;
                            drawQuad(overlay, video, corners, false);
                            setHint({ tone: "warn", text: "ขยับกล้องเข้าใกล้อีกนิด ให้กระดาษเต็มจอ" });
                        } else {
                            drawQuad(overlay, video, corners, steadyCount >= 2);
                            setHint({ tone: "info", text: "ถือนิ่งๆ สักครู่..." });
                            if (steadyCount >= STABLE_FRAMES) await capture();
                        }
                    }
                }
            }
            if (!stopped) timer = window.setTimeout(tick, DETECT_EVERY_MS);
        }

        (async () => {
            try {
                // ขอความละเอียดสูงไว้ก่อน เครื่องให้ไม่ถึงก็ได้เท่าที่ได้ (ทดสอบแล้วว่า 1080p ยังอ่านถูก)
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
                    audio: false,
                });
            } catch (err) {
                setError(cameraErrorText(err));
                return;
            }
            if (stopped) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }
            video.srcObject = stream;
            await video.play().catch(() => {});
            setHint({ tone: "info", text: "เล็งให้เห็นกระดาษทั้งแผ่น — สี่เหลี่ยมดำครบ 4 มุม" });
            tick();
        })();

        return () => {
            stopped = true;
            clearTimeout(timer);
            stream?.getTracks().forEach((t) => t.stop());
            video.srcObject = null;
        };
    }, []);

    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div role="dialog" aria-modal="true" aria-label="สแกนกระดาษคำตอบอัตโนมัติ" className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
            <div className="relative flex-1 overflow-hidden">
                {/* object-contain ไม่ใช่ cover — ต้องเห็นครบทุกส่วนที่กล้องเห็น ไม่งั้นลูกค้าเห็นมุมกระดาษครบบนจอ แต่มุมจริงหลุดเฟรม
                    (หรือกลับกัน) แล้วงงว่าทำไมไม่ถ่าย */}
                <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
                <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                {/* กรอบนำสายตาตอนยังไม่เจอกระดาษ — สัดส่วน A4 */}
                {!found && !error && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                        <div className="aspect-[210/297] max-h-full w-full max-w-sm rounded-xl border-2 border-dashed border-white/50" />
                    </div>
                )}
                <div className={cn("pointer-events-none absolute inset-0 bg-white transition-opacity duration-300", flash ? "opacity-70" : "opacity-0")} />

                <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดกล้อง"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"
                    >
                        <X size={20} />
                    </button>
                    <p className="flex-1 text-sm font-medium">สแกนอัตโนมัติ</p>
                    <div className="flex gap-1">
                        {allPages.map((p) => {
                            const done = sessionPages.includes(p) || scannedPages.includes(p);
                            return (
                                <span
                                    key={p}
                                    className={cn(
                                        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs",
                                        sessionPages.includes(p) ? "bg-green-500 text-white" : done ? "bg-white/25" : "bg-white/10 text-white/70"
                                    )}
                                >
                                    {sessionPages.includes(p) && <Check size={11} />}
                                    หน้า {p}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-8 text-center">
                        <Camera size={32} className="text-white/60" />
                        <p className="text-sm">{error}</p>
                        <button
                            type="button"
                            onClick={onFallback}
                            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
                        >
                            ใช้กล้องปกติแทน
                        </button>
                    </div>
                )}
            </div>

            {!error && (
                <div className="flex flex-col items-center gap-3 bg-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                    <p
                        aria-live="polite"
                        className={cn(
                            "flex min-h-10 items-center gap-2 text-center text-sm",
                            hint.tone === "ok" ? "text-green-400" : hint.tone === "warn" ? "text-amber-300" : "text-white/90"
                        )}
                    >
                        {reading ? <Loader2 size={16} className="animate-spin" /> : hint.tone === "ok" ? <Check size={16} /> : null}
                        {hint.text}
                    </p>
                    {/* ถ่ายเองได้เสมอ เผื่อระบบจับไม่ติด (แสงแปลก/พื้นหลังลาย) — อ่านด้วยตัวอ่านเดียวกัน */}
                    <button
                        type="button"
                        onClick={() => {
                            shootNowRef.current = true;
                        }}
                        disabled={reading}
                        aria-label="ถ่ายเลย"
                        className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 disabled:opacity-40"
                    >
                        <span className="h-12 w-12 rounded-full bg-white" />
                    </button>
                    <p className="text-xs text-white/50">ระบบถ่ายให้เองเมื่อเจอกระดาษและถือนิ่ง · กดปุ่มเพื่อถ่ายทันที</p>
                </div>
            )}
        </div>
    );
}
