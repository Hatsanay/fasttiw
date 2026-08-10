import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean;
};

export default function Input({ error, className, ...props }: InputProps) {
    return (
        <input
            className={cn(
                "w-full px-4 py-2.5 rounded-xl border bg-white text-sm transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
                error ? "border-red-400" : "border-slate-200",
                className
            )}
            {...props}
        />
    );
}
