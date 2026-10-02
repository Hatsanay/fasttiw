"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * ปุ่มดาวน์โหลด PDF ของระบบสอบกระดาษ — สร้างไฟล์ใช้เวลาหลายวินาที (ชุดใหญ่มีรูป / กระดาษคำตอบทั้งกลุ่ม)
 * จึงต้องบอกว่ากำลังสร้าง ไม่งั้นลูกค้ากดซ้ำ · error จาก route เป็น JSON { message } แสดงเป็น toast
 */
export default function DownloadButton({
    href,
    fileName,
    label,
    primary,
    className,
}: {
    href: string;
    fileName: string;
    label: string;
    primary?: boolean;
    className?: string;
}) {
    const [busy, setBusy] = useState(false);
    async function download() {
        setBusy(true);
        try {
            const res = await fetch(href);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? "สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่");
            }
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setBusy(false);
        }
    }
    return (
        <Button type="button" variant={primary ? "primary" : "secondary"} size="sm" onClick={download} disabled={busy} className={cn("w-full sm:w-auto", className)}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {busy ? "กำลังสร้างไฟล์..." : label}
        </Button>
    );
}
