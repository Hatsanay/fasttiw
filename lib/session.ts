import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "fasttiw_store_session";

export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 วัน ตรงกับ JWT_EXPIRES_IN default ฝั่ง backend
    });
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

type SessionPayload = { cus_id: string; mcp?: boolean; exp?: number };

// อ่าน payload ของ JWT แบบไม่ verify ลายเซ็น — ใช้เพื่อ "เดา" สถานะ login แบบ optimistic เท่านั้น
// (โชว์/ซ่อน UI, redirect คร่าวๆ) การตรวจสอบจริงเกิดที่ backend ทุกครั้งที่มีการเรียก API จริง
// ต่อให้ปลอมค่าใน cookie นี้ได้ ก็ใช้ทำอะไรไม่ได้เพราะ backend จะปฏิเสธ token ปลอมอยู่ดี
function decodeJwtPayload(token: string): SessionPayload | null {
    try {
        const [, payloadB64] = token.split(".");
        const json = Buffer.from(payloadB64, "base64").toString("utf8");
        const payload = JSON.parse(json);
        return typeof payload?.cus_id === "string" ? payload : null;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<{ cus_id: string; mustChangePassword: boolean } | null> {
    const token = await getSessionToken();
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    return { cus_id: payload.cus_id, mustChangePassword: !!payload.mcp };
}

// ใช้เรียก backend แทนตัวลูกค้าที่ login อยู่ (Server Component/Server Action เท่านั้น — ปลอดภัย
// เพราะ token ไม่เคยหลุดออกไปที่ browser JS)
export async function authorizedFetch(path: string, init: RequestInit = {}) {
    const token = await getSessionToken();
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";
    return fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            ...init.headers,
            Authorization: `Bearer ${token}`,
        },
    });
}

export type MyProfile = {
    cus_fname: string | null;
    cus_lname: string | null;
    cus_avatar_url: string | null;
};

// โปรไฟล์แบบย่อ ใช้แสดงชื่อ+รูปใน Navbar — คืน null ถ้ายังไม่ login หรือเรียก backend ไม่สำเร็จ
export async function getMyProfile(): Promise<MyProfile | null> {
    const session = await getSession();
    if (!session) return null;

    const res = await authorizedFetch("/store/me");
    if (!res.ok) return null;
    return res.json();
}

// ชุด prod_id ที่ลูกค้าถือสิทธิ์ใช้งานอยู่จริงตอนนี้ (active เท่านั้น ไม่รวมหมดอายุ/ถูกยกเลิก) —
// ใช้โชว์ badge "ซื้อแล้ว" ในหน้าแคตตาล็อก/รายละเอียดสินค้า คืนเซ็ตว่างถ้ายังไม่ login
export async function getOwnedProductIds(): Promise<Set<string>> {
    const session = await getSession();
    if (!session) return new Set();

    const res = await authorizedFetch("/store/my/entitlements");
    if (!res.ok) return new Set();
    const { data } = (await res.json()) as { data: { ent_product_id: string; effective_status: string }[] };
    return new Set(data.filter((e) => e.effective_status === "active").map((e) => e.ent_product_id));
}
