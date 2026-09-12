import { forwardedClientHeaders } from "@/lib/clientIp";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

// รับสัญญาณสถิติผู้เยี่ยมชมจาก VisitTracker แล้วส่งต่อให้ backend
//
// ต้องผ่านเซิร์ฟเวอร์ Next ก่อน (ไม่ยิงจากเบราว์เซอร์ไป backend ตรงๆ) เพราะ backend อยู่คนละโดเมน และที่นี่
// เป็นที่เดียวที่รู้ IP จริงของผู้เยี่ยมชม — ส่งต่อด้วย x-client-ip + x-internal-secret ชุดเดียวกับ rate limit
// user-agent อ่านจาก header ของ request ฝั่ง server เอง ไม่เชื่อค่าที่ JavaScript ส่งมา
//
// ตอบ 204 เสมอ — ตัวนับเป็นของเสริม ห้ามทำให้หน้าเว็บเห็น error หรือรอนาน
export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return new Response(null, { status: 204 });

    const payload = {
        kind: body.kind === "ping" ? "ping" : "view",
        path: typeof body.path === "string" ? body.path.slice(0, 300) : "",
        entry: body.entry === true,
        referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "",
        utm_source: typeof body.utm_source === "string" ? body.utm_source.slice(0, 40) : "",
        fbclid: body.fbclid === true,
        ua: req.headers.get("user-agent") ?? "",
    };

    try {
        await fetch(`${API_URL}/store/track`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await forwardedClientHeaders()) },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(3000),
        });
    } catch {
        // backend ล่ม/ช้า — ทิ้งไปเงียบๆ ไม่มีผลกับการใช้งานเว็บ
    }
    return new Response(null, { status: 204 });
}
