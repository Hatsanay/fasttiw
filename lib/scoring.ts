// ตัวช่วยแสดงคะแนนฝั่งลูกค้า — ระบบคะแนนเปิด/ปิดได้รายชุดข้อสอบ (ดู backend/src/utils/scoring.js)
//
// ค่าคะแนนจาก API เป็น DECIMAL ซึ่ง mysql2 คืนมาเป็น string ("2.50") ไม่ใช่ number ทุกจุดที่แสดงผลจึงต้อง
// ผ่านตัวนี้เสมอ ไม่งั้นหน้าเว็บจะโชว์ "2.50 คะแนน" แทนที่จะเป็น "2.5 คะแนน" และเอาไปบวกกันตรงๆ ไม่ได้ด้วย
// (string + string = ต่อสตริง ไม่ใช่บวกเลข)

/** null/undefined = ชุดนี้ไม่ใช้ระบบคะแนน — ผู้เรียกควรซ่อน UI ที่เกี่ยวกับคะแนนไปเลย */
export function hasScoring(totalScore: string | number | null | undefined): boolean {
    return totalScore !== null && totalScore !== undefined && Number(totalScore) > 0;
}

/** ตัดศูนย์ท้ายทศนิยมทิ้งเพื่อให้อ่านง่าย: "2.00" -> "2", "2.50" -> "2.5" */
export function formatScore(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "";
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return String(Math.round(num * 100) / 100);
}

/**
 * ตัวเลขดิบที่ต้องแสดงคู่กับ % ทุกจุด — "40%" อย่างเดียวไม่พอ คนซ้อมข้อสอบใช้จำนวนข้อ/คะแนนจริง
 * ในการตัดสินใจ (ผิด 3 ข้อจาก 5 กับผิด 30 ข้อจาก 50 เป็นคนละสถานการณ์ทั้งที่ % เท่ากัน)
 *
 * ชุดที่ใช้ระบบคะแนนคืนคะแนนดิบ ชุดที่ไม่ใช้คืนจำนวนข้อที่ตอบถูก — คืน "" เมื่อไม่มีข้อมูลให้แสดง
 * (เช่น ยังไม่เคยทำ) ผู้เรียกจึงเขียน `{raw && <span>{raw}</span>}` ได้ตรงๆ
 */
export function formatRawScore(opts: {
    earned?: string | number | null;
    max?: string | number | null;
    correct?: number | null;
    questions?: number | null;
}): string {
    if (hasScoring(opts.max) && opts.earned !== null && opts.earned !== undefined) {
        return `${formatScore(opts.earned)}/${formatScore(opts.max)} คะแนน`;
    }
    if (opts.correct === null || opts.correct === undefined || !opts.questions) return "";
    return `ถูก ${formatScore(opts.correct)}/${opts.questions} ข้อ`;
}
