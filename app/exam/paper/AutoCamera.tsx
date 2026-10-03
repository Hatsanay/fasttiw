"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Flashlight, FlashlightOff, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Point } from "@/lib/paper/layout";
import { SHADOW_SCORE } from "@/lib/paper/omr";
import { grayFromVideo, type LocatedPage } from "@/lib/paper/scan";
import { detectFrame, locateImage } from "@/lib/paper/scanWorker";

// สแกนอัตโนมัติด้วยกล้องสด (ระบบสอบกระดาษ — CLAUDE.md ข้อ 6.9)
// ดูเฟรมกล้องทุก ~0.25 วิ หาสี่เหลี่ยมดำ 4 มุม (ภาพย่อ ~960px · หาใน Web Worker วิดีโอบนจอจึงไม่กระตุก) → กระดาษอยู่นิ่งครบ ~1 วิ → จับเฟรมเต็ม
// ความละเอียดแล้วอ่านจริง (QR + วง) · อ่านไม่ผ่านก็สแกนต่อเอง ลูกค้าแค่ถือให้นิ่ง
// ความแม่นที่ความละเอียดวิดีโอ (1080×1920, 1440×1920) วัดด้วย _perf-tmp/paper-omr-harness.mjs แล้ว: ผิดโดยไม่เตือน 0
// กติกา "ไม่เดา" เหมือนเดิมทุกอย่าง — ข้อที่ไม่ชัดยังต้องให้ลูกค้ายืนยันในหน้าหลักหลังปิดกล้อง

/** ok: key = รหัสของแผ่นที่รับไว้ (ตรงกับ keyOf) · label = ชื่อที่บอกบนจอ เช่น "หน้า 2" / "สมชาย ใจดี" */
export type CaptureOutcome = { ok: true; key: string; label: string } | { ok: false; reason: string };

/** แผ่นที่ต้องสแกนในรอบนี้ — ใบเดียวหลายหน้า: key = "1","2"… · ทั้งกอง: key = "<รหัสใบสอบ>|<หน้า>" */
export type ExpectedSheet = { key: string; label: string };

/** เกินนี้แสดงเป็นตัวนับแทนรายการชิป (สแกนทั้งกองหลายสิบคนไม่พอที่บนจอ) */
const MAX_CHIPS = 6;

const DETECT_EVERY_MS = 250;
const DETECT_MAX_SIDE = 960;
/** จำนวนครั้งติดกันที่เจอกระดาษในตำแหน่งเดิม ก่อนถ่ายเอง (~1 วินาที) — กันภาพเบลอจากมือที่ยังขยับ */
const STABLE_FRAMES = 4;
/** มุมขยับได้ไม่เกินกี่ส่วนของด้านสั้นของภาพ ถึงนับว่า "นิ่ง" */
const MAX_SHIFT = 0.02;
/** กรอบสี่เหลี่ยมมุมต้องกินพื้นที่ภาพอย่างน้อยเท่านี้ — ไกลกว่านี้วงคำตอบเล็กเกินไปจะอ่านได้ไม่ดี */
const MIN_COVER = 0.2;
/** มีเงาค้างนานเกินนี้ (หลังถือนิ่งแล้ว) = ถ่ายให้เลย — ตัวอ่านรับมือเงาได้อย่างปลอดภัย (ถามข้อที่ไม่ชัด) ลูกค้าต้องไม่ติดค้าง */
const SHADOW_GRACE_MS = 4000;

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
    expected,
    doneKeys,
    keyOf,
    onCapture,
    onClose,
    onFallback,
}: {
    /** แผ่นทั้งหมดที่ต้องสแกน — ครบแล้วปิดกล้องเอง */
    expected: ExpectedSheet[];
    /** แผ่นที่สแกนไว้แล้วก่อนเปิดกล้อง (นับรวมตอนเช็คว่าครบหรือยัง) */
    doneKeys: string[];
    /** รหัสของแผ่นที่อ่านได้ — แผ่นเดิมที่ยังอยู่ในเฟรมจะไม่ถูกถ่ายวนซ้ำในรอบนี้ */
    keyOf: (located: Extract<LocatedPage, { ok: true }>) => string;
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
    const [sessionKeys, setSessionKeys] = useState<string[]>([]);
    const shootNowRef = useRef(false);
    // ไฟฉาย — มีเฉพาะเครื่องที่เบราว์เซอร์ให้สั่งได้ (Android Chrome) · ช่วยลบเงามือ/เงามือถือบนกระดาษ
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const [torch, setTorch] = useState<{ available: boolean; on: boolean }>({ available: false, on: false });

    async function toggleTorch() {
        const track = trackRef.current;
        if (!track) return;
        const next = !torch.on;
        try {
            await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
            setTorch({ available: true, on: next });
        } catch {
            setTorch({ available: false, on: false });
        }
    }

    // ค่าล่าสุดของ props ให้ลูปกล้องอ่าน — ไม่ใส่เป็น dependency ไม่งั้นกล้องปิด-เปิดใหม่ทุกครั้งที่หน้าหลักเรนเดอร์
    const latest = useRef({ onCapture, onClose, doneKeys, expected, keyOf });
    useEffect(() => {
        latest.current = { onCapture, onClose, doneKeys, expected, keyOf };
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
        const session = new Set<string>();
        let stream: MediaStream | null = null;
        let stopped = false;
        let timer = 0;
        let prev: Point[] | null = null;
        let steadyCount = 0;
        let pausedUntil = 0;
        let shadowSince: number | null = null;

        const pause = (ms: number) => {
            pausedUntil = Date.now() + ms;
            prev = null;
            steadyCount = 0;
            shadowSince = null;
            drawQuad(overlay, video, null, false);
            setFound(false);
        };

        async function capture() {
            setReading(true);
            setHint({ tone: "info", text: "กำลังอ่านกระดาษคำตอบ..." });
            try {
                // อ่านเฟรมเต็มความละเอียดใน Web Worker — จอยังขยับได้ระหว่างอ่าน
                const located = await locateImage(grayFromVideo(video, work));
                if (stopped) return;
                if (!located.ok) {
                    setHint({ tone: "warn", text: located.reason });
                    pause(1200);
                    return;
                }
                const key = latest.current.keyOf(located);
                if (session.has(key)) {
                    const label = latest.current.expected.find((e) => e.key === key)?.label ?? "แผ่นนี้";
                    setHint({ tone: "warn", text: `${label} สแกนแล้ว — เปลี่ยนเป็นแผ่นถัดไป` });
                    pause(1500);
                    return;
                }
                const outcome = await latest.current.onCapture(located);
                if (!outcome.ok) {
                    setHint({ tone: "warn", text: outcome.reason });
                    pause(2500);
                    return;
                }
                session.add(outcome.key);
                setSessionKeys([...session]);
                navigator.vibrate?.(60);
                setFlash(true);
                setTimeout(() => setFlash(false), 150);
                const done = new Set([...latest.current.doneKeys, ...session]);
                if (latest.current.expected.every((e) => done.has(e.key))) {
                    setHint({ tone: "ok", text: latest.current.expected.length > 1 ? "สแกนครบทุกแผ่นแล้ว" : "สแกนเรียบร้อย" });
                    stopped = true;
                    setTimeout(() => latest.current.onClose(), 900);
                    return;
                }
                setHint({ tone: "ok", text: `${outcome.label} เรียบร้อย — เปลี่ยนเป็นแผ่นถัดไป` });
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
                    // หามุม + วัดเงา (ภาพตรงหยาบ 2 px/มม.) ใน Web Worker — วัดเงาทุกเฟรมได้เพราะไม่กินเธรดหลัก
                    // แต่ใช้ผลเงาเฉพาะตอนเริ่มนิ่งแล้ว (ช่วงมือยังขยับ เงาวัดได้ไม่นิ่ง)
                    const result = await detectFrame(small, true);
                    if (stopped) return;
                    if (!result.corners) {
                        prev = null;
                        steadyCount = 0;
                        shadowSince = null;
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
                            const shadow = steadyCount >= 2 && result.lighting !== null && result.lighting < SHADOW_SCORE;
                            if (shadow) shadowSince ??= Date.now();
                            else shadowSince = null;
                            const waitShadow = shadowSince !== null && Date.now() - shadowSince < SHADOW_GRACE_MS;
                            drawQuad(overlay, video, corners, steadyCount >= 2 && !waitShadow);
                            setHint(
                                waitShadow
                                    ? { tone: "warn", text: "มีเงาบังกระดาษ — ยกมือออก หรือเอียงมือถือเล็กน้อยให้เงาหลุด" }
                                    : { tone: "info", text: "ถือนิ่งๆ สักครู่..." }
                            );
                            if (steadyCount >= STABLE_FRAMES && !waitShadow) await capture();
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
            const track = stream.getVideoTracks()[0];
            trackRef.current = track ?? null;
            const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
            if (caps.torch) setTorch({ available: true, on: false });
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

    const doneCount = expected.filter((e) => sessionKeys.includes(e.key) || doneKeys.includes(e.key)).length;

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
                    {torch.available && (
                        <button
                            type="button"
                            onClick={toggleTorch}
                            aria-pressed={torch.on}
                            aria-label={torch.on ? "ปิดไฟฉาย" : "เปิดไฟฉาย"}
                            className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full backdrop-blur",
                                torch.on ? "bg-yellow-300 text-slate-900" : "bg-white/15 hover:bg-white/25"
                            )}
                        >
                            {torch.on ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
                        </button>
                    )}
                    {expected.length > MAX_CHIPS ? (
                        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs tabular-nums">
                            สแกนแล้ว {doneCount}/{expected.length}
                        </span>
                    ) : (
                        <div className="flex gap-1">
                            {expected.map((e) => {
                                const now = sessionKeys.includes(e.key);
                                const done = now || doneKeys.includes(e.key);
                                return (
                                    <span
                                        key={e.key}
                                        className={cn(
                                            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs",
                                            now ? "bg-green-500 text-white" : done ? "bg-white/25" : "bg-white/10 text-white/70"
                                        )}
                                    >
                                        {now && <Check size={11} />}
                                        {e.label}
                                    </span>
                                );
                            })}
                        </div>
                    )}
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
