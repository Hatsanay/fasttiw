import { NextResponse } from "next/server";
import { authorizedFetch } from "@/lib/session";

// ตัวกลางของกลุ่มสอบกระดาษ — หน้าเว็บยิง JSON มาที่นี่ แล้วส่งต่อ backend พร้อม token จาก cookie
// Route Handler ไม่ใช่ Server Action เพราะ WAF ของโฮสต์บล็อกฟอร์ม Server Action (CLAUDE.md ข้อ 6.2)
// ส่งต่อได้เฉพาะใต้ /store/paper-groups เท่านั้น — backend ตรวจสิทธิ์/ความเป็นเจ้าของทั้งหมดเอง
async function forward(req: Request, params: Promise<{ path?: string[] }>) {
    const { path = [] } = await params;
    if (!path.every((seg) => /^[A-Za-z0-9-]{1,40}$/.test(seg))) {
        return NextResponse.json({ message: "ไม่พบหน้าที่ต้องการ" }, { status: 404 });
    }
    const body = req.method === "GET" || req.method === "DELETE" ? undefined : await req.text();
    try {
        const res = await authorizedFetch(`/store/paper-groups${path.length ? "/" + path.join("/") : ""}`, {
            method: req.method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body,
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ message: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 502 });
    }
}

type Ctx = { params: Promise<{ path?: string[] }> };
export const GET = (req: Request, { params }: Ctx) => forward(req, params);
export const POST = (req: Request, { params }: Ctx) => forward(req, params);
export const PUT = (req: Request, { params }: Ctx) => forward(req, params);
export const DELETE = (req: Request, { params }: Ctx) => forward(req, params);
