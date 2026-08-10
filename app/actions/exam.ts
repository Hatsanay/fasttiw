"use server";

import { authorizedFetch } from "@/lib/session";

export type ActionResult<T> = T | { error: string };

export async function startAttemptAction(productId: string, mode: "practice" | "timed"): Promise<ActionResult<{ att_id: string }>> {
    const res = await authorizedFetch(`/store/products/${productId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message ?? "เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่" };
    return { att_id: data.att_id };
}

export type AnswerReveal = {
    correct_choice_id: string;
    explanation: string | null;
    choice_reasons: { cho_id: string; is_correct: boolean; wrong_reason: string | null }[];
};

export async function submitAnswerAction(
    attemptId: string,
    questionId: string,
    choiceId: string | null
): Promise<ActionResult<{ selected_choice_id: string | null; reveal: AnswerReveal | null }>> {
    const res = await authorizedFetch(`/store/attempts/${attemptId}/answers/${questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice_id: choiceId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message ?? "บันทึกคำตอบไม่สำเร็จ กรุณาลองใหม่" };
    return data;
}

export async function submitAttemptAction(attemptId: string): Promise<ActionResult<{ att_id: string }>> {
    const res = await authorizedFetch(`/store/attempts/${attemptId}/submit`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message ?? "ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่" };
    return { att_id: attemptId };
}

export async function abandonAttemptAction(attemptId: string): Promise<ActionResult<{ att_id: string }>> {
    const res = await authorizedFetch(`/store/attempts/${attemptId}/abandon`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message ?? "ยกเลิกทำข้อสอบไม่สำเร็จ กรุณาลองใหม่" };
    return { att_id: attemptId };
}

export async function toggleBookmarkAction(questionId: string, bookmarked: boolean): Promise<ActionResult<{ ok: true }>> {
    const res = await authorizedFetch(`/store/bookmarks/${questionId}`, {
        method: bookmarked ? "POST" : "DELETE",
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: data.message ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
    }
    return { ok: true };
}

export async function reportQuestionAction(questionId: string, message: string): Promise<ActionResult<{ ok: true }>> {
    const res = await authorizedFetch(`/store/questions/${questionId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message ?? "ส่งเรื่องไม่สำเร็จ กรุณาลองใหม่" };
    return { ok: true };
}
