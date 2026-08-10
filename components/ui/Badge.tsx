import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "brand" | "neutral" | "success";

const TONE_CLASSES: Record<Tone, string> = {
    brand: "bg-brand-50 text-brand-700",
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-green-50 text-green-700",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    tone?: Tone;
};

export default function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
    return (
        <span
            className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONE_CLASSES[tone], className)}
            {...props}
        />
    );
}
