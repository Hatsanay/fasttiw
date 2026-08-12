"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Image as ImageIcon, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { newsImageUrl } from "@/lib/api"; // ฟังก์ชันต่อ origin เต็มให้ path รูปจาก backend — ชื่อผูกกับ
                                          // "news" จากตอนสร้างครั้งแรก แต่จริงๆ เป็น util ทั่วไป ใช้ต่อ
                                          // origin backend ให้ path อัปโหลดใดๆ ก็ได้ ไม่ได้ผูกกับข่าวสารเลย

const OPEN_POLL_MS = 2500;
const CLOSED_POLL_MS = 10000;
const GUEST_ID_KEY = "fasttiw_guest_chat_id";
const LAST_SEEN_KEY = "fasttiw_chat_last_seen_at";

type ChatMessage = {
    msg_id: string;
    msg_sender_type: "visitor" | "staff";
    msg_text: string | null;
    msg_image_urls: string[] | null;
    msg_created_at: string;
};

function getOrCreateGuestId(): string {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
}

// ลูกค้าส่งลิงก์มาเป็นข้อความธรรมดา — แปลง URL เปล่าในข้อความให้กดได้ตอนแสดงผล (เหมือนฝั่งแอดมิน)
function Linkified({ text }: { text: string }) {
    const parts = text.split(/(https?:\/\/\S+)/g);
    return (
        <>
            {parts.map((part, i) =>
                /^https?:\/\//.test(part)
                    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a>
                    : <span key={i}>{part}</span>
            )}
        </>
    );
}

function MessageImages({ urls }: { urls: string[] }) {
    // รูปเดียวโชว์เต็มขนาดปกติ หลายรูปจัดเป็นกริด 2 คอลัมน์ (เหมือน Messenger/LINE) กันรูปเดียวถูกบีบเล็ก
    // เกินไปตอนมีแค่รูปเดียว
    if (urls.length === 1) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={newsImageUrl(urls[0]) ?? undefined} alt="" className="rounded-lg mb-1.5 max-w-full max-h-56 object-contain" />
        );
    }
    return (
        <div className="grid grid-cols-2 gap-1 mb-1.5">
            {urls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={newsImageUrl(url) ?? undefined} alt="" className="rounded-lg w-full h-20 object-cover" />
            ))}
        </div>
    );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
    const isMine = msg.msg_sender_type === "visitor"; // ข้อความของ "ตัวเอง" (ผู้แชท) อยู่ขวาเสมอ ไม่ว่าจะ login หรือไม่
    return (
        <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", isMine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800")}>
                {!!msg.msg_image_urls?.length && <MessageImages urls={msg.msg_image_urls} />}
                {msg.msg_text && <p className="whitespace-pre-line break-words"><Linkified text={msg.msg_text} /></p>}
            </div>
        </div>
    );
}

// ไอคอนแชทลอยมุมขวาล่าง — โชว์ทุกหน้าฝั่งลูกค้า (mount ที่ root layout) แชทได้ทั้งตอนยัง login และ login แล้ว
// (login แล้วผูกกับบัญชีจริงอัตโนมัติ ดู ensureConversation ฝั่ง backend) เรียกผ่าน Route Handler เสมอ
// (/api/chat/...) ไม่ยิงตรงไป backend จาก browser — isLoggedIn เป็นแค่ hint ฝั่ง optimistic (เหมือนที่อื่นๆ
// ในระบบนี้) ใช้กระตุ้นให้เรียก ensureConversation ซ้ำทันทีที่สถานะ login เปลี่ยน (เช่น login ระหว่างคุยอยู่)
// ตัวตรวจสอบจริงอยู่ที่ Route Handler (อ่าน cookie httpOnly ฝั่ง server)
export default function ChatWidget({ isLoggedIn }: { isLoggedIn: boolean }) {
    // ซ่อนไอคอนตอนกำลังทำข้อสอบจริง (หน้าตอบคำถามทีละข้อ) — ไม่ซ่อนตอนหน้าเลือกโหมด/หน้าดูเฉลยหลังส่ง
    // เพราะยังไม่ได้ "กำลังทำข้อสอบ" อยู่จริงๆ — เช็คด้วย pathname แทนการไม่ mount ทั้ง component เพื่อให้
    // state การคุย (ประวัติ/conv_id) ไม่หายไปตอนสลับเข้า-ออกหน้าทำข้อสอบ
    const pathname = usePathname();
    const hideOnExam = /^\/exam\/attempts\/[^/]+$/.test(pathname);

    const [isOpen, setIsOpen] = useState(false);
    const [convId, setConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMsgIdRef = useRef<string | null>(null);
    const guestIdRef = useRef<string | null>(null);
    // เวลาที่เปิดดูแชทครั้งล่าสุด (มิลลิวินาที) — ใช้คำนวณ badge ข้อความใหม่ (ดูด้านล่าง) โหลดค่าเดิมจาก
    // localStorage ผ่าน lazy initializer (รันครั้งเดียวตอน render แรกในฝั่งที่มันรัน ไม่ใช่ effect) จึงไม่ชน
    // react-hooks/set-state-in-effect — SSR ไม่มี window ให้ fallback เป็น 0 ไปก่อน (แก้ไขให้ถูกตอน hydrate
    // ฝั่ง client เอง ต่างกันแค่ badge จุดแดงเล็กๆ ไม่ใช่เนื้อหาจริง ยอมรับ mismatch ระดับนี้ได้)
    const [lastSeenAt, setLastSeenAt] = useState<number>(() => (
        typeof window === "undefined" ? 0 : Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0)
    ));

    const authHeaders = useCallback((): Record<string, string> => {
        // แนบ guest id เสมอถ้ามี (แม้ login แล้ว) เผื่อยังไม่เคย merge — backend ให้ความสำคัญกับ
        // บัญชีจริง (ถ้า login) มากกว่า guest id อยู่แล้วเสมอ ไม่ทำให้ข้อมูลปนกันผิดคน
        return guestIdRef.current ? { "X-Guest-Id": guestIdRef.current } : {};
    }, []);

    const ensureConversation = useCallback(async () => {
        guestIdRef.current = getOrCreateGuestId();
        const res = await fetch("/api/chat/conversation", { method: "POST", headers: authHeaders() });
        if (!res.ok) return null;
        const data = await res.json();
        return (data.conv_id as string) ?? null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    const fetchMessages = useCallback(async (id: string, isPoll: boolean) => {
        const url = isPoll && lastMsgIdRef.current
            ? `/api/chat/conversation/${id}/messages?after=${lastMsgIdRef.current}`
            : `/api/chat/conversation/${id}/messages`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: ChatMessage[] = data.messages ?? [];
        if (incoming.length === 0) return;
        lastMsgIdRef.current = incoming[incoming.length - 1].msg_id;
        setMessages((prev) => (isPoll ? [...prev, ...incoming] : incoming));
    }, [authHeaders]);

    // ผูกแชทเข้าบัญชีทันทีที่สถานะ login เปลี่ยน (เช่น login ระหว่างคุยอยู่ในฐานะผู้เยี่ยมชม)
    useEffect(() => {
        const kickoff = setTimeout(async () => {
            const id = await ensureConversation();
            if (id) setConvId(id);
        }, 0);
        return () => clearTimeout(kickoff);
    }, [ensureConversation]);

    // โหลดประวัติครั้งแรกทันทีที่รู้ conv_id (ครั้งเดียว ไม่ใช่ทุกครั้งที่เปิด/ปิดหน้าต่าง)
    useEffect(() => {
        if (!convId) return;
        lastMsgIdRef.current = null;
        const kickoff = setTimeout(() => fetchMessages(convId, false), 0);
        return () => clearTimeout(kickoff);
    }, [convId, fetchMessages]);

    // poll ต่อเนื่อง — ถี่ตอนเปิดหน้าต่างอยู่ ห่างลงตอนปิด (ยังอยากรู้ว่ามีข้อความใหม่มาไหมเพื่อโชว์ badge)
    useEffect(() => {
        if (!convId) return;
        const interval = setInterval(() => fetchMessages(convId, true), isOpen ? OPEN_POLL_MS : CLOSED_POLL_MS);
        return () => clearInterval(interval);
    }, [convId, isOpen, fetchMessages]);

    // badge แจ้งข้อความใหม่ — derived ตรงๆ ทุก render (isOpen/messages/lastSeenAt เปลี่ยนก็ re-render อยู่
    // แล้วโดยธรรมชาติ ไม่ต้องมี effect แยกมาคำนวณ) การอัปเดต lastSeenAt จริงๆ เกิดตอนกดเปิดหน้าต่าง (ดู
    // handleToggleOpen) ไม่ใช่ผ่าน effect เพราะเป็นปฏิกิริยาต่อ "การกระทำของผู้ใช้" ไม่ใช่การ sync กับระบบ
    // ภายนอกที่ effect ควรทำ
    const hasUnread = !isOpen && messages.some(
        (m) => m.msg_sender_type === "staff" && new Date(m.msg_created_at).getTime() > lastSeenAt
    );

    useEffect(() => {
        if (isOpen) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isOpen]);

    async function sendPayload(formData: FormData) {
        if (!convId) return;
        setIsSending(true);
        try {
            const res = await fetch(`/api/chat/conversation/${convId}/messages`, {
                method: "POST", headers: authHeaders(), body: formData,
            });
            if (res.ok) await fetchMessages(convId, true);
        } finally {
            setIsSending(false);
        }
    }

    async function handleSendText(e: React.FormEvent) {
        e.preventDefault();
        if (!text.trim()) return;
        const fd = new FormData();
        fd.append("text", text.trim());
        setText("");
        await sendPayload(fd);
    }

    async function handlePickImages(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length === 0) return;
        const fd = new FormData();
        files.forEach((f) => fd.append("images", f));
        await sendPayload(fd);
    }

    // เปิดหน้าต่าง = ถือว่าเห็นข้อความล่าสุดแล้ว จำเวลาไว้ (badge หายทันที + จำข้ามครั้งผ่าน localStorage)
    function handleToggleOpen() {
        setIsOpen((prev) => {
            const next = !prev;
            if (next) {
                const now = Date.now();
                setLastSeenAt(now);
                localStorage.setItem(LAST_SEEN_KEY, String(now));
            }
            return next;
        });
    }

    if (hideOnExam) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
            {isOpen && (
                <div className="w-[min(22rem,calc(100vw-2.5rem))] h-[min(32rem,calc(100vh-8rem))] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-[18px] h-[18px]" />
                            <span className="text-sm font-medium">ฝ่ายบริการลูกค้า Fasttiw</span>
                        </div>
                        <button type="button" onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/15 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 bg-slate-50/50">
                        {messages.length === 0 && (
                            <p className="text-center text-xs text-slate-400 mt-6">
                                สวัสดีค่ะ มีคำถามหรือข้อสงสัยอะไร ทักมาได้เลยค่ะ 🙂
                            </p>
                        )}
                        {messages.map((m) => <MessageBubble key={m.msg_id} msg={m} />)}
                    </div>
                    <form onSubmit={handleSendText} className="border-t border-slate-100 p-2.5 flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending || !convId}
                            className="p-2 text-slate-400 hover:text-brand-600 shrink-0 disabled:opacity-40"
                            title="แนบรูปภาพ"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePickImages} />
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="พิมพ์ข้อความ..."
                            disabled={isSending || !convId}
                            className="flex-1 min-w-0 rounded-full border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-brand-300"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !text.trim() || !convId}
                            className="p-2 rounded-full bg-brand-600 text-white shrink-0 disabled:opacity-40 hover:bg-brand-700 transition-colors"
                            title="ส่ง"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}

            <button
                type="button"
                onClick={handleToggleOpen}
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition-colors"
                aria-label={isOpen ? "ปิดหน้าต่างแชท" : "เปิดแชทกับฝ่ายบริการลูกค้า"}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                {!isOpen && hasUnread && (
                    <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white" />
                )}
            </button>
        </div>
    );
}
