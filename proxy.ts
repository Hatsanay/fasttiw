import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 เปลี่ยนชื่อ middleware.ts เป็น proxy.ts (ดู tiwwai-store/CLAUDE.md) — ทำ optimistic
// check เท่านั้น (decode payload คร่าวๆ ไม่ verify ลายเซ็น/ไม่ query DB) ตามคำแนะนำของ Next
// การตรวจสอบจริงเกิดที่ backend ทุกครั้งที่มีการเรียก API — ที่นี่แค่กันหลงเข้าหน้าที่ยังใช้ไม่ได้เฉยๆ
const PROTECTED_PREFIXES = ["/checkout", "/library", "/exam", "/history", "/bookmarks", "/account", "/orders"];
const AUTH_PAGES = ["/login", "/register"];
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "fasttiw_store_session";

function hasValidLookingSession(req: NextRequest): boolean {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return false;
    try {
        const [, payloadB64] = token.split(".");
        const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
        if (!payload?.cus_id) return false;
        if (payload.exp && payload.exp * 1000 < Date.now()) return false;
        return true;
    } catch {
        return false;
    }
}

export default function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const loggedIn = hasValidLookingSession(req);

    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !loggedIn) {
        const url = new URL("/login", req.url);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    if (AUTH_PAGES.includes(pathname) && loggedIn) {
        return NextResponse.redirect(new URL("/library", req.url));
    }

    // ลูกค้าที่ login อยู่แล้วไม่ควรเห็นหน้า landing page (สำหรับคนยังไม่ซื้อ) อีก —
    // พาเข้าคลังข้อสอบ/ระบบทำข้อสอบตรงๆ แทน
    if (pathname === "/" && loggedIn) {
        return NextResponse.redirect(new URL("/library", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
