import { User, History, Bookmark, Megaphone } from "lucide-react";

// ใช้ร่วมกันทั้ง desktop nav (Navbar.tsx) และ mobile sidebar (MobileNav.tsx) กันสองที่ไม่ตรงกัน
export const NAV_LINKS = [
    { href: "/library", label: "คลังข้อสอบของฉัน", icon: User },
    { href: "/history", label: "ประวัติการทำข้อสอบ", icon: History },
    { href: "/bookmarks", label: "ข้อที่บันทึกไว้", icon: Bookmark },
    { href: "/news", label: "ข่าวสาร", icon: Megaphone },
];
