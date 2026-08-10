import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

async function buildHeaders(req: Request): Promise<Record<string, string>> {
    const token = await getSessionToken();
    const guestId = req.headers.get("x-guest-id");
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (guestId) headers["X-Guest-Id"] = guestId;
    return headers;
}

// poll ข้อความ (รองรับ ?after=<msg_id> สำหรับดึงแค่ข้อความใหม่)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const after = new URL(req.url).searchParams.get("after");
    const url = new URL(`${API_URL}/store/chat/conversation/${id}/messages`);
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url, { headers: await buildHeaders(req) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}

// ส่งข้อความ (multipart: text ไม่บังคับ, image ไม่บังคับ) — ส่งต่อ FormData ตรงๆ ไม่แตะเนื้อหาไฟล์เอง
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const formData = await req.formData();

    const res = await fetch(`${API_URL}/store/chat/conversation/${id}/messages`, {
        method: "POST", headers: await buildHeaders(req), body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
