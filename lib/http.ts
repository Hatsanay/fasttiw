// ตัวช่วยยิง JSON จากฝั่ง client ไปที่ Route Handler ของเราเอง — ใช้ร่วมกันทุกฟอร์มที่ย้ายออกจาก
// Server Action เพราะ WAF ของโฮสต์บล็อกสตริง `$@` ที่ Next แนบมากับฟอร์ม Server Action
// (ดู app/api/auth/login/route.ts) รวมไว้ที่เดียวเพื่อให้การจัดการ error เหมือนกันทุกฟอร์ม
export type JsonResponse = { ok: boolean; status: number; message?: string; data: Record<string, unknown> };

export async function postJson(url: string, body: unknown): Promise<JsonResponse> {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return {
            ok: res.ok,
            status: res.status,
            message: typeof data.message === "string" ? data.message : undefined,
            data,
        };
    } catch {
        // เน็ตหลุด/เซิร์ฟเวอร์ไม่ตอบ — คืนรูปแบบเดียวกับกรณี error อื่นเพื่อให้ผู้เรียกจัดการทางเดียว
        return { ok: false, status: 0, message: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", data: {} };
    }
}

// ไปหน้าถัดไปแบบโหลดใหม่ทั้งหน้า (ไม่ใช่ router.push) เพราะเพิ่งตั้ง/ล้าง session cookie —
// ต้องให้ Server Component ทุกตัวถูก render ใหม่ด้วย cookie ชุดใหม่ ไม่ใช้ของที่ค้างใน router cache
// ตรวจซ้ำว่าเป็น path ภายในเว็บเท่านั้น กัน open redirect ถ้ามีใครแก้ค่า next ใน URL
export function hardNavigate(path: string) {
    window.location.assign(path.startsWith("/") ? path : "/");
}
