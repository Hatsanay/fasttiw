"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Timer, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import { startAttemptAction } from "@/app/actions/exam";

type Mode = "practice" | "timed";

export default function ModeSelectClient({ productId, examDurationMinutes }: { productId: string; examDurationMinutes: number }) {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("practice");
    const [isPending, startTransition] = useTransition();

    function handleStart() {
        startTransition(async () => {
            const result = await startAttemptAction(productId, mode);
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            router.push(`/exam/attempts/${result.att_id}`);
        });
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModeCard
                    icon={BookOpen}
                    title="โหมดฝึก"
                    description="ตอบแล้วเห็นเฉลยทันที เข้าใจวิธีคิดทีละข้อ"
                    selected={mode === "practice"}
                    onClick={() => setMode("practice")}
                />
                <ModeCard
                    icon={Timer}
                    title="โหมดจับเวลา"
                    description={`จำลองสอบจริง เฉลยตอนจบ (${examDurationMinutes} นาที)`}
                    selected={mode === "timed"}
                    onClick={() => setMode("timed")}
                />
            </div>

            <Button size="lg" onClick={handleStart} disabled={isPending} className="w-full sm:w-auto sm:self-center">
                {isPending ? "กำลังเริ่ม..." : "เริ่มทำข้อสอบ"}
            </Button>
        </div>
    );
}

function ModeCard({
    icon: Icon,
    title,
    description,
    selected,
    onClick,
}: {
    icon: typeof BookOpen;
    title: string;
    description: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98]",
                selected ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5"
            )}
        >
            {selected && (
                <span className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check size={12} />
                </span>
            )}
            <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3", selected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
                <Icon size={18} />
            </span>
            <h3 className="font-medium text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </button>
    );
}
