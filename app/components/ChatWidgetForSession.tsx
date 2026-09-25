import ChatWidget from "@/app/components/ChatWidget";
import { getSession } from "@/lib/session";

// ChatWidget ต้องรู้ว่า login อยู่ไหม (ไว้เลือกว่าจะหาห้องแชทของบัญชีหรือของผู้เยี่ยมชม) — แยกการอ่าน cookie
// มาไว้ที่ชิ้นนี้ชิ้นเดียว แล้ว RootLayout ครอบ <Suspense> ให้ ไม่งั้นทั้งเว็บต้องรอ cookie ก่อนแสดงผล
// ค่านี้เป็นแค่ hint แบบ optimistic — ตัวตรวจจริงอยู่ที่ Route Handler /api/chat/* ที่อ่าน cookie httpOnly เอง
export default async function ChatWidgetForSession() {
    const session = await getSession();
    return <ChatWidget isLoggedIn={!!session} />;
}
