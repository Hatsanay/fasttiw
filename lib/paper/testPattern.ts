// แบบฝนสำหรับทดสอบความแม่นของการอ่านกระดาษ (เฟส 0) — รู้เฉลยของ "สิ่งที่ฝนจริง" ทุกข้อ จึงวัดได้เป็นตัวเลข
//
// ปนกรณียากไว้ตั้งใจ (เว้นว่าง / ฝนสองวง / ฝนจาง / กากบาท / ลบแล้วฝนใหม่) เพราะนี่คือสิ่งที่คนทำจริงบนกระดาษ
// รหัสแผ่น (code) เป็น seed — แผ่นรหัสเดียวกันได้แบบฝนเดียวกันเสมอ ทั้งตอนพิมพ์ใบบอกวิธีฝนและตอนตรวจ

import { CHOICE_LABELS } from "./layout";
import type { Reading } from "./omr";

export type MarkKind = "single" | "blank" | "double" | "faint" | "cross" | "erased";

export type Mark = { kind: MarkKind; choice: number; other?: number };

export const MARK_LABEL: Record<MarkKind, string> = {
    single: "ฝนเต็มวง",
    blank: "เว้นว่าง",
    double: "ฝนสองวง",
    faint: "ฝนจางๆ (กดเบา)",
    cross: "กากบาททับวง",
    erased: "ฝนแล้วลบ แล้วฝนวงใหม่",
};

function seeded(text: string) {
    let s = 2166136261;
    for (const ch of text) s = Math.imul(s ^ ch.charCodeAt(0), 16777619) >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

/** แบบฝน n ข้อ (แต่ละข้อมี choiceCount ตัวเลือก) — ~70% ฝนปกติ ที่เหลือเป็นกรณียากกระจายทั่วแผ่น */
export function testPattern(code: string, choiceCounts: number[]): Mark[] {
    const rand = seeded(code);
    const hard: MarkKind[] = ["blank", "double", "faint", "cross", "erased"];
    return choiceCounts.map((count, i) => {
        const choice = Math.floor(rand() * count);
        const other = (choice + 1 + Math.floor(rand() * (count - 1))) % count;
        // ข้อ 1-10 ฝนปกติทั้งหมด (ให้เริ่มฝนแล้วเข้าใจง่าย) ที่เหลือสุ่ม
        const kind: MarkKind = i < 10 || rand() < 0.7 ? "single" : hard[Math.floor(rand() * hard.length)];
        return kind === "double" || kind === "erased" ? { kind, choice, other } : { kind, choice };
    });
}

export function describeMark(m: Mark): string {
    const a = CHOICE_LABELS[m.choice];
    switch (m.kind) {
        case "single":
            return a;
        case "blank":
            return "— (เว้นว่าง)";
        case "double":
            return `${a} และ ${CHOICE_LABELS[m.other!]}`;
        case "faint":
            return `${a} (จาง)`;
        case "cross":
            return `${a} (กากบาท)`;
        case "erased":
            return `${CHOICE_LABELS[m.other!]} → ลบ → ${a}`;
    }
}

export type Verdict = "exact" | "flagged" | "silent_error";

/**
 * เทียบผลอ่านกับสิ่งที่ฝนจริง:
 * exact = อ่านถูกเป๊ะ · flagged = ระบบไม่แน่ใจแล้วถามลูกค้า (ยอมรับได้) · silent_error = ตอบผิดโดยไม่เตือน (ห้ามมี)
 */
export function judge(mark: Mark, reading: Reading): Verdict {
    if (reading.kind === "unclear") {
        // ฝนสองวงต้องถูกถามเสมอ — ถามถือว่าถูกต้องที่สุดแล้ว
        return mark.kind === "double" ? "exact" : "flagged";
    }
    if (mark.kind === "double") return "silent_error";
    if (mark.kind === "blank") return reading.kind === "blank" ? "exact" : "silent_error";
    if (reading.kind === "blank") {
        // ฝนจาง/กากบาท แล้วอ่านว่าไม่ได้ตอบ = คะแนนหายโดยไม่มีใครรู้ นับเป็นผิด
        return "silent_error";
    }
    return reading.choice === mark.choice ? "exact" : "silent_error";
}
