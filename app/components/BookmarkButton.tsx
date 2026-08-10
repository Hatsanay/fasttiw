"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleBookmarkAction } from "@/app/actions/exam";

export default function BookmarkButton({
    questionId,
    initialBookmarked,
    onToggled,
}: {
    questionId: string;
    initialBookmarked: boolean;
    // แจ้ง parent ทุกครั้งที่ toggle สำเร็จ — ใช้ตอนอยู่ในหน้ารายการ bookmark เอง (BookmarksList) เพื่อเอา
    // การ์ดออกจากลิสต์ทันทีที่กดเอาออก ไม่ต้องรอรีเฟรชหน้า หน้าอื่น (เช่น review) ไม่ต้องส่ง prop นี้มาก็ได้
    onToggled?: (bookmarked: boolean) => void;
}) {
    const [bookmarked, setBookmarked] = useState(initialBookmarked);
    const [isPending, startTransition] = useTransition();

    function handleClick() {
        const next = !bookmarked;
        startTransition(async () => {
            const result = await toggleBookmarkAction(questionId, next);
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            setBookmarked(next);
            toast.success(next ? "บันทึกไว้ทบทวนแล้ว" : "นำออกจากรายการทบทวนแล้ว");
            onToggled?.(next);
        });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            className="-m-2 flex items-center gap-1.5 rounded-lg p-2 text-sm text-slate-400 transition-colors hover:bg-slate-50 hover:text-brand-600 disabled:opacity-50"
        >
            {bookmarked ? <BookmarkCheck size={16} className="text-brand-600" /> : <Bookmark size={16} />}
            {bookmarked ? "บันทึกไว้ทบทวนแล้ว" : "บันทึกไว้ทบทวน"}
        </button>
    );
}
