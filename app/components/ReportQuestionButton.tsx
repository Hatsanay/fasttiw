"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { reportQuestionAction } from "@/app/actions/exam";

export default function ReportQuestionButton({ questionId }: { questionId: string }) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!message.trim()) return;

        startTransition(async () => {
            const result = await reportQuestionAction(questionId, message.trim());
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            toast.success("ส่งเรื่องแจ้งปัญหาแล้ว ขอบคุณที่ช่วยแจ้ง");
            setOpen(false);
            setMessage("");
        });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="-m-2 flex items-center gap-1.5 rounded-lg p-2 text-sm text-slate-400 transition-colors hover:bg-slate-50 hover:text-red-500"
            >
                <Flag size={16} />
                แจ้งปัญหาข้อนี้
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    onClick={() => setOpen(false)}
                >
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-medium text-slate-900 mb-1">แจ้งปัญหาข้อนี้</h3>
                        <p className="text-xs text-slate-400 mb-3">เช่น เฉลยผิด พิมพ์ตก หรือคำอธิบายไม่ชัดเจน</p>
                        <form onSubmit={handleSubmit}>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={4}
                                autoFocus
                                placeholder="อธิบายปัญหาที่พบ..."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                            <div className="mt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || !message.trim()}
                                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {isPending ? "กำลังส่ง..." : "ส่งเรื่อง"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
