import { User, History, Bookmark, Receipt, Megaphone, Settings } from "lucide-react";

// ใช้ร่วมกันทั้ง desktop nav (Navbar.tsx) และ mobile sidebar (MobileNav.tsx) กันสองที่ไม่ตรงกัน
export const NAV_LINKS = [
    { href: "/library", label: "คลังข้อสอบของฉัน", icon: User },
    { href: "/history", label: "ประวัติการทำข้อสอบ", icon: History },
    { href: "/bookmarks", label: "ข้อที่บันทึกไว้", icon: Bookmark },
    { href: "/news", label: "ข่าวสาร", icon: Megaphone },
];

// ลิงก์กลุ่ม "บัญชี" — อยู่ใน dropdown ของ UserMenu (จอใหญ่) และท้าย sidebar (จอเล็ก) ไม่ปนกับ NAV_LINKS
// ที่โชว์เป็นลิงก์ตรงๆ บน navbar เพราะแถวบนเริ่มแน่นแล้ว และสองอันนี้เป็นเรื่องบัญชีตัวเอง ไม่ใช่การใช้งานประจำวัน
export const ACCOUNT_LINKS = [
    { href: "/orders", label: "คำสั่งซื้อของฉัน", icon: Receipt },
    { href: "/account", label: "บัญชีของฉัน", icon: Settings },
];
