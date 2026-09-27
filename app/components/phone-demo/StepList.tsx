"use client";

import type { ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * รายการขั้นตอนข้างมือถือจำลอง — กดขั้นไหนก็ข้ามไปขั้นนั้น · ขั้นที่กำลังเล่นมีคำอธิบาย + แถบเวลา
 * extra(i) = ของที่ติดอยู่ใต้ขั้นนั้นตลอด (flow-demo ใช้วางปุ่มสลับโหมดใต้ขั้น "เลือกโหมด")
 */
export default function StepList({
    steps,
    active,
    progress,
    reduced,
    paused,
    onJump,
    onTogglePause,
    extra,
    className,
}: {
    steps: { key: string; title: string; caption: string }[];
    active: number;
    progress: number;
    reduced: boolean;
    paused: boolean;
    onJump: (index: number) => void;
    onTogglePause: () => void;
    extra?: (index: number) => ReactNode;
    className?: string;
}) {
    return (
        <ol className={cn("flex flex-col gap-2", className)}>
            {steps.map((s, i) => {
                const isActive = i === active;
                return (
                    <li key={s.key}>
                        <button
                            type="button"
                            onClick={() => onJump(i)}
                            aria-current={isActive ? "step" : undefined}
                            className={cn(
                                "w-full text-left rounded-2xl border px-4 py-3 transition-colors",
                                isActive ? "border-brand-200 bg-brand-50/60" : "border-transparent hover:bg-slate-50"
                            )}
                        >
                            <span className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                        isActive ? "bg-brand-600 text-white" : i < active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                                    )}
                                >
                                    {i + 1}
                                </span>
                                <span className={cn("font-medium", isActive ? "text-slate-900" : "text-slate-600")}>{s.title}</span>
                            </span>
                            {/* คำอธิบาย + แถบเวลา เฉพาะขั้นที่กำลังเล่น */}
                            {isActive && (
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
                        {extra?.(i)}
                    </li>
                );
            })}
            {!reduced && (
                <li className="pl-4 pt-1">
                    <button
                        type="button"
                        onClick={onTogglePause}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"
                    >
                        {paused ? <Play size={15} /> : <Pause size={15} />}
                        {paused ? "เล่นต่อ" : "หยุดชั่วคราว"}
                    </button>
                </li>
            )}
        </ol>
    );
}
