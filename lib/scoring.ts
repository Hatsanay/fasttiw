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
