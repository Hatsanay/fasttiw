"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Image as ImageIcon, Send, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { newsImageUrl } from "@/lib/api"; // ฟังก์ชันต่อ origin เต็มให้ path รูปจาก backend — ชื่อผูกกับ
                                          // "news" จากตอนสร้างครั้งแรก แต่จริงๆ เป็น util ทั่วไป ใช้ต่อ
                                          // origin backend ให้ path อัปโหลดใดๆ ก็ได้ ไม่ได้ผูกกับข่าวสารเลย

// ความถี่เช็คข้อความใหม่ (ปรับ 2026-09-15 จากผลทดสอบโหลด — เดิมทุกคนที่เปิดเว็บเช็คทุก 10 วิตลอดเวลา แม้ไม่เคย
// แชทและแม้สลับไปแท็บอื่น กิน CPU ของเว็บราว 1/3) · ไม่มีห้อง = ไม่เช็คเลย · แท็บถูกซ่อน = หยุดเช็ค
const OPEN_POLL_MS = 2500;             // เปิดหน้าต่างแชทอยู่ = คุยสด
const AWAITING_REPLY_POLL_MS = 10000;  // ปิดหน้าต่าง แต่เพิ่งส่งข้อความไป = กำลังรอคำตอบ จุดแดงต้องขึ้นไว
const IDLE_POLL_MS = 30000;            // ปิดหน้าต่าง และไม่ได้คุยมาสักพัก
const AWAITING_REPLY_WINDOW_MS = 10 * 60 * 1000;
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

// fetch เป็น blob ก่อนสร้างลิงก์ดาวน์โหลด แทนการใช้ attribute download ตรงๆ บน <a href> เพราะรูปอยู่คนละ
// origin กับหน้าเว็บ (backend domain) — attribute download เบราว์เซอร์จะไม่ยอมบังคับดาวน์โหลดข้าม origin
// ให้ (แค่เปิดรูปในแท็บใหม่แทน) ต้องดึงไฟล์มาเป็น blob local ก่อนถึงจะสั่งดาวน์โหลดได้จริง
async function downloadImage(url: string) {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = url.split("/").pop() || "image";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch {
        // เปิดรูปในแท็บใหม่แทนถ้าดาวน์โหลดไม่สำเร็จ (เช่น CORS ติด) ยังเห็น/เซฟรูปเองได้
        window.open(url, "_blank");
    }
}

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
    return (
        // อยู่ใน container ของแชท (z-40) ค่า z-70 นี้จึงมีผลแค่ภายใน widget — ให้ทับกล่องแชทของตัวเอง
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
                <div className="absolute -top-11 right-0 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => downloadImage(url)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white transition-colors"
                        title="ดาวน์โหลดรูป"
                        aria-label="ดาวน์โหลดรูป"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white transition-colors"
                        title="ปิด"
                        aria-label="ปิด"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MessageImages({ urls, onImageClick }: { urls: string[]; onImageClick: (url: string) => void }) {
    // รูปเดียวโชว์เต็มขนาดปกติ หลายรูปจัดเป็นกริด 2 คอลัมน์ (เหมือน Messenger/LINE) กันรูปเดียวถูกบีบเล็ก
    // เกินไปตอนมีแค่รูปเดียว — กดรูปไหนก็ได้เพื่อดูรูปเต็ม/ซูม (ดู ImageLightbox)
    if (urls.length === 1) {
        const full = newsImageUrl(urls[0]);
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={full ?? undefined}
                alt=""
                onClick={() => full && onImageClick(full)}
                className="rounded-lg mb-1.5 max-w-full max-h-56 object-contain cursor-pointer"
            />
        );
    }
    return (
        <div className="grid grid-cols-2 gap-1 mb-1.5">
            {urls.map((url, i) => {
                const full = newsImageUrl(url);
                return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={i}
                        src={full ?? undefined}
                        alt=""
                        onClick={() => full && onImageClick(full)}
                        className="rounded-lg w-full h-20 object-cover cursor-pointer"
                    />
                );
            })}
        </div>
    );
}

function MessageBubble({ msg, onImageClick }: { msg: ChatMessage; onImageClick: (url: string) => void }) {
    const isMine = msg.msg_sender_type === "visitor"; // ข้อความของ "ตัวเอง" (ผู้แชท) อยู่ขวาเสมอ ไม่ว่าจะ login หรือไม่
    return (
        <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", isMine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800")}>
                {!!msg.msg_image_urls?.length && <MessageImages urls={msg.msg_image_urls} onImageClick={onImageClick} />}
                {msg.msg_text && <p className="whitespace-pre-line wrap-break-word"><Linkified text={msg.msg_text} /></p>}
            </div>
        </div>
    );
}

// ไอคอนแชทลอยมุมขวาล่าง — โชว์ทุกหน้าฝั่งลูกค้า (mount ที่ root layout) แชทได้ทั้งตอนยัง login และ login แล้ว
// (login แล้วผูกกับบัญชีจริงอัตโนมัติ ดู ensureConversation ฝั่ง backend) เรียกผ่าน Route Handler เสมอ
// (/api/chat/...) ไม่ยิงตรงไป backend จาก browser — isLoggedIn เป็นแค่ hint ฝั่ง optimistic (เหมือนที่อื่นๆ
// ในระบบนี้) ใช้กระตุ้นให้หาห้องใหม่ทันทีที่สถานะ login เปลี่ยน (เช่น login ระหว่างคุยอยู่ = merge เข้าบัญชี)
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
    const [sendError, setSendError] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
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

    const [isVisible, setIsVisible] = useState(true);
    const lookupFailedRef = useRef(false);

    const authHeaders = useCallback((): Record<string, string> => {
        // แนบ guest id เสมอถ้ามี (แม้ login แล้ว) เผื่อยังไม่เคย merge — backend ให้ความสำคัญกับ
        // บัญชีจริง (ถ้า login) มากกว่า guest id อยู่แล้วเสมอ ไม่ทำให้ข้อมูลปนกันผิดคน
        return guestIdRef.current ? { "X-Guest-Id": guestIdRef.current } : {};
    }, []);

    // create=false: หาห้องเดิมอย่างเดียว (ตอนเปิดหน้าเว็บ) — ไม่มีห้องได้ null · create=true: สร้างถ้ายังไม่มี
    // (ตอนส่งข้อความแรก) — เดิมสร้างห้องให้ทุกคนที่เปิดเว็บ ห้องว่างเต็มรายการแชทแอดมิน (ตกลงกับผู้ใช้แล้วว่ายอม
    // เสียความสามารถ "แอดมินทักคนที่ยังไม่เคยพิมพ์") · merge แชทเข้าบัญชีตอน login ยังทำงานเหมือนเดิมทั้งสองโหมด
    // throw เมื่อเชื่อมต่อไม่ได้ (แยกจาก "ไม่มีห้อง")
    const requestConversation = useCallback(async (create: boolean): Promise<string | null> => {
        guestIdRef.current = create ? getOrCreateGuestId() : localStorage.getItem(GUEST_ID_KEY);
        // ยังไม่ login และไม่เคยมี guest id = ไม่เคยแชทจากเบราว์เซอร์นี้แน่นอน ไม่ต้องถาม backend
        if (!create && !isLoggedIn && !guestIdRef.current) return null;
        const res = await fetch("/api/chat/conversation", {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ create }),
        });
        if (!res.ok) throw new Error(`conversation ${res.status}`);
        const data = await res.json();
        return (data.conv_id as string | null) ?? null;
    }, [isLoggedIn, authHeaders]);

    const fetchMessages = useCallback(async (id: string, isPoll: boolean) => {
        const url = isPoll && lastMsgIdRef.current
            ? `/api/chat/conversation/${id}/messages?after=${lastMsgIdRef.current}`
            : `/api/chat/conversation/${id}/messages`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const incoming: ChatMessage[] = data.messages ?? [];
        if (!isPoll) { // โหลดทั้งห้อง = แทนที่เสมอ แม้ว่าง (สลับห้องแล้วต้องไม่เห็นข้อความของห้องเดิมค้าง)
            lastMsgIdRef.current = incoming.at(-1)?.msg_id ?? null;
            setMessages(incoming);
            return;
        }
        if (incoming.length === 0) return;
        lastMsgIdRef.current = incoming[incoming.length - 1].msg_id;
        setMessages((prev) => [...prev, ...incoming]);
    }, [authHeaders]);

    // หาห้องเดิมตอนเปิดหน้าเว็บ + ทุกครั้งที่สถานะ login เปลี่ยน (login = merge แชทผู้เยี่ยมชมเข้าบัญชี /
    // logout = ได้ห้องผู้เยี่ยมชมของเครื่องนี้ หรือไม่มีห้อง ไม่เห็นแชทของบัญชีค้างไว้)
    useEffect(() => {
        let cancelled = false;
        const kickoff = setTimeout(async () => {
            try {
                const id = await requestConversation(false);
                lookupFailedRef.current = false;
                if (!cancelled) setConvId(id);
            } catch {
                lookupFailedRef.current = true; // ลองใหม่ตอนกดเปิดหน้าต่างแชท
            }
        }, 0);
        return () => { cancelled = true; clearTimeout(kickoff); };
    }, [requestConversation]);

    // โหลดประวัติทั้งห้องทุกครั้งที่ห้องเปลี่ยน (ครั้งเดียว ไม่ใช่ทุกครั้งที่เปิด/ปิดหน้าต่าง)
    useEffect(() => {
        const kickoff = setTimeout(() => {
            if (convId) fetchMessages(convId, false);
            else { lastMsgIdRef.current = null; setMessages([]); }
        }, 0);
        return () => clearTimeout(kickoff);
    }, [convId, fetchMessages]);

    // แท็บถูกซ่อน (สลับแท็บ/แอป/ล็อกจอ) = หยุดเช็ค · กลับมาแล้วเช็คทันที 1 ครั้ง จุดแดงขึ้นเหมือนไม่เคยหยุด
    useEffect(() => {
        const onChange = () => {
            const visible = document.visibilityState === "visible";
            setIsVisible(visible);
            if (visible && convId) fetchMessages(convId, true);
        };
        document.addEventListener("visibilitychange", onChange);
        return () => document.removeEventListener("visibilitychange", onChange);
    }, [convId, fetchMessages]);

    // เวลาที่ลูกค้าส่งข้อความล่าสุด — ใช้ตัดสินว่า "กำลังรอคำตอบ" (เช็คถี่) หรือไม่ได้คุยแล้ว (เช็คห่าง)
    const lastVisitorMsgAt = messages.reduce(
        (max, m) => (m.msg_sender_type === "visitor" ? Math.max(max, new Date(m.msg_created_at).getTime()) : max), 0
    );

    // poll ต่อเนื่อง — ตั้งเวลารอบถัดไปใหม่ทุกรอบ (ไม่ใช้ setInterval) ให้ความถี่ขยับเองเมื่อพ้นช่วงรอคำตอบ
    useEffect(() => {
        if (!convId || !isVisible) return;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;
        const delay = () => isOpen ? OPEN_POLL_MS
            : Date.now() - lastVisitorMsgAt < AWAITING_REPLY_WINDOW_MS ? AWAITING_REPLY_POLL_MS : IDLE_POLL_MS;
        const schedule = () => {
            timer = setTimeout(async () => {
                await fetchMessages(convId, true).catch(() => {});
                if (!stopped) schedule();
            }, delay());
        };
        schedule();
        return () => { stopped = true; clearTimeout(timer); };
    }, [convId, isOpen, isVisible, lastVisitorMsgAt, fetchMessages]);

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

    const postMessage = (id: string, formData: FormData) =>
        fetch(`/api/chat/conversation/${id}/messages`, { method: "POST", headers: authHeaders(), body: formData });

    // เดิมส่งไม่สำเร็จแล้วเงียบ — ข้อความที่พิมพ์หายไปเฉยๆ ลูกค้าเห็นแค่ว่า "กดส่งไม่ได้" (บั๊กที่เจอจริง 2026-09-15)
    // draft = ข้อความที่พิมพ์ไว้ ใส่คืนในช่องพิมพ์ถ้าส่งไม่ออก ไม่ต้องพิมพ์ใหม่
    async function sendPayload(formData: FormData, draft = "") {
        setIsSending(true);
        setSendError(null);
        try {
            // ข้อความแรก = สร้างห้องตอนนี้ (ตอนเปิดหน้าเว็บแค่หาห้องเดิม ไม่สร้างให้)
            let id = convId ?? await requestConversation(true);
            if (!id) throw new Error("no conversation");
            let res = await postMessage(id, formData);
            // 404 = ห้องที่ถืออยู่ไม่ใช่ของเราแล้ว (เพิ่งออกจากระบบ / เซสชันหมดอายุหรือถูกเตะ) — ขอห้องที่ถูกต้อง
            // จาก backend ใหม่แล้วส่งซ้ำ 1 ครั้ง ลูกค้าไม่ต้องรู้ตัวว่ามีการสลับห้อง
            if (res.status === 404) {
                const fresh = await requestConversation(true);
                if (fresh) {
                    id = fresh;
                    res = await postMessage(id, formData);
                }
            }
            if (res.ok) {
                if (id === convId) {
                    await fetchMessages(id, true);
                } else {
                    // ห้องใหม่ (ข้อความแรก หรือสลับห้องหลัง 404): โหลดทั้งห้องแทนการต่อท้าย
                    setConvId(id);
                    await fetchMessages(id, false);
                }
                return;
            }
            const data = await res.json().catch(() => ({}));
            setSendError(data.message ?? "ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง");
            if (draft) setText((cur) => cur || draft);
        } catch {
            setSendError("เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
            if (draft) setText((cur) => cur || draft);
        } finally {
            setIsSending(false);
        }
    }

    async function handleSendText(e: React.FormEvent) {
        e.preventDefault();
        const draft = text.trim();
        if (!draft) return;
        const fd = new FormData();
        fd.append("text", draft);
        setText("");
        await sendPayload(fd, draft);
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
        if (!isOpen) {
            // ตอนปิดหน้าต่างเช็คห่างสุด 30 วิ — เปิดปุ๊บดึงข้อความล่าสุดทันที ไม่ให้เห็นของเก่า
            if (convId) fetchMessages(convId, true);
            // หาห้องเดิมตอนเปิดเว็บไม่สำเร็จ (เน็ตหลุด/backend ล่มชั่วคราว) — ลองใหม่ ไม่งั้นไม่เห็นประวัติแชทเดิม
            else if (lookupFailedRef.current) {
                requestConversation(false).then((id) => { lookupFailedRef.current = false; setConvId(id); }).catch(() => {});
            }
        }
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
        // z-40 ต่ำกว่าหน้าต่างเต็มจอทุกตัวในเว็บ (z-50: ครอปรูปโปรไฟล์, onboarding, ขยายรูปโจทย์, เมนูมือถือ,
        // แจ้งปัญหาข้อนี้) — เดิมเป็น z-50 เท่ากัน แล้ว widget นี้ render หลังสุดใน layout เลยชนะทุกครั้ง
        // ไอคอนแชทลอยทับหน้าต่างพวกนั้น บังปุ่มยืนยันที่มุมขวาล่างของหน้าครอปรูปพอดี
        // ลำดับชั้นในเว็บ: เนื้อหา < header (z-40, อยู่บน) = แชท (z-40, อยู่ล่างขวา) < หน้าต่างเต็มจอ (z-50)
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
            {isOpen && (
                <div className="w-[min(22rem,calc(100vw-2.5rem))] h-[min(32rem,calc(100vh-8rem))] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-4.5 h-4.5" />
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
                        {messages.map((m) => <MessageBubble key={m.msg_id} msg={m} onImageClick={setLightboxUrl} />)}
                    </div>
                    {sendError && (
                        <p role="alert" className="border-t border-red-100 bg-red-50 px-3.5 py-2 text-xs text-red-600 shrink-0">
                            {sendError}
                        </p>
                    )}
                    <form onSubmit={handleSendText} className="border-t border-slate-100 p-2.5 flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending}
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
                            disabled={isSending}
                            className="flex-1 min-w-0 rounded-full border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-brand-300"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !text.trim()}
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

            {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        </div>
    );
}
