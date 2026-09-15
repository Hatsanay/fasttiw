import "server-only";
import { API_URL } from "@/lib/api";
import { forwardedClientHeaders } from "@/lib/clientIp";
import type { DiagnosticCategory, DiagnosticQuestion } from "@/lib/diagnosticTypes";

// แบบทดสอบวัดระดับฟรี — ดูกติกาเต็มที่ backend/src/controllers/diagnostic.controller.js

export async function getDiagnosticCategories(): Promise<DiagnosticCategory[]> {
    const res = await fetch(`${API_URL}/store/diagnostic`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
}

// สุ่มข้อใหม่ทุกครั้ง — ห้าม cache · แนบ IP จริงให้ rate limit ของ backend นับรายคน (ไม่งั้นทั้งเว็บแชร์โควตาเดียว)
export async function getDiagnosticQuestions(
    categoryId: string
): Promise<{ category: { cat_id: string; cat_name: string }; questions: DiagnosticQuestion[] } | null> {
    const res = await fetch(`${API_URL}/store/diagnostic/${encodeURIComponent(categoryId)}/questions`, {
        cache: "no-store",
        headers: await forwardedClientHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
}
