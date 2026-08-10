import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50", className)}
            {...props}
        />
    );
}
