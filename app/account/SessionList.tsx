"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Smartphone, X } from "lucide-react";
import { revokeSessionAction } from "@/app/actions/account";

type Session = { sess_id: string; sess_device_info: string | null; sess_created_at: string; is_current: boolean };

export default function SessionList({ sessions }: { sessions: Session[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleRevoke(sessionId: string) {
        startTransition(async () => {
            const result = await revokeSessionAction(sessionId);
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            toast.success("ออกจากระบบอุปกรณ์นั้นแล้ว");
            router.refresh();
        });
    }

    return (
        <div className="flex flex-col gap-2">
            {sessions.map((s) => (
                <div key={s.sess_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Smartphone size={14} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-slate-700 truncate">{s.is_current ? "อุปกรณ์นี้" : "อุปกรณ์อื่น"}</p>
                            <p className="text-xs text-slate-400">
                                เข้าสู่ระบบเมื่อ {new Date(s.sess_created_at).toLocaleString("th-TH")}
                            </p>
                        </div>
                    </div>
                    {!s.is_current && (
                        <button
                            type="button"
                            onClick={() => handleRevoke(s.sess_id)}
                            disabled={isPending}
                            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                            aria-label="ออกจากระบบอุปกรณ์นี้"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
