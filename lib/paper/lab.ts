// รหัสแผ่นทดสอบของเฟส 0 — ใส่ผังไว้ในรหัสเลย ไม่ต้องมีฐานข้อมูล: LAB-<จำนวนข้อ>-<ตัวเลือกต่อข้อ>-<ชุดที่>
// เช่น LAB-100-4-1 = 100 ข้อ ข้อละ 4 ตัวเลือก แบบฝนชุดที่ 1 · ของจริง (เฟส 1) จะเป็นรหัสใบสอบที่ผูกกับฐานข้อมูล

export type LabSpec = { code: string; questions: number; choices: number; set: number };

export function labCode(questions: number, choices: number, set: number): string {
    return `LAB-${questions}-${choices}-${set}`;
}

export function parseLabCode(code: string): LabSpec | null {
    const m = /^LAB-(\d{1,3})-([2-5])-(\d{1,3})$/.exec(code);
    if (!m) return null;
    const questions = Number(m[1]);
    if (questions < 1 || questions > 300) return null;
    return { code, questions, choices: Number(m[2]), set: Number(m[3]) };
}
