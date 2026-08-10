"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { requestDataDeletionAction } from "@/app/actions/account";

export default function DeletionRequestButton() {
    const [isPending, startTransition] = useTransition();

    function handleClick() {
        if (!window.confirm("ยืนยันขอลบข้อมูลบัญชีนี้? ทีมงานจะตรวจสอบและดำเนินการภายในระยะเวลาอันสมควร")) return;

        startTransition(async () => {
            const result = await requestDataDeletionAction();
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            toast.success("ส่งคำขอลบข้อมูลเรียบร้อยแล้ว ทีมงานจะดำเนินการตรวจสอบต่อไป");
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
        >
            {isPending ? "กำลังส่งคำขอ..." : "ขอลบข้อมูลบัญชี"}
        </button>
    );
}
