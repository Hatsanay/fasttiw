// ผังกระดาษคำตอบ (ระบบสอบกระดาษ — เฟส 0 ต้นแบบ, 2026-09-27)
//
// **ที่เดียวที่กำหนดตำแหน่งทุกอย่างบนกระดาษ** — ใช้ทั้งตอนพิมพ์ (lib/pdf/AnswerSheetDocument.tsx) และตอนอ่านภาพ
// (lib/paper/omr.ts) ห้ามเขียนตัวเลขตำแหน่งซ้ำที่อื่น: ถ้าสองฝั่งไม่ตรงกันแม้ครึ่งมิลลิเมตร ตัวอ่านจะไปดูวงผิดตำแหน่ง
// แล้วตรวจผิดทั้งแผ่นโดยไม่มีอะไรเตือน
//
// หน่วยเป็นมิลลิเมตรทั้งหมด (A4 แนวตั้ง 210 × 297) — ตำแหน่งวง = จุดศูนย์กลาง
// ⚠ แก้ค่าในไฟล์นี้ = กระดาษที่ลูกค้าพิมพ์ไปแล้วอ่านไม่ได้ ต้องขึ้นเลขรุ่นผัง (LAYOUT_VERSION) ใหม่ แล้วให้ตัวอ่าน
// รองรับรุ่นเก่าต่อ (รุ่นอยู่ใน QR ของทุกแผ่น)

export const LAYOUT_VERSION = 1;

export const PAPER = { width: 210, height: 297 };

/** สี่เหลี่ยมดำ 4 มุม — ตัวอ่านใช้หามุมกระดาษและดึงภาพให้ตรง · ลำดับ: บนซ้าย บนขวา ล่างขวา ล่างซ้าย */
export const FIDUCIAL_SIZE = 8;
export const FIDUCIALS: Point[] = [
    { x: 12, y: 12 },
    { x: 198, y: 12 },
    { x: 198, y: 285 },
    { x: 12, y: 285 },
];

/** QR ของแผ่น (มุมขวาบน ใต้แนวสี่เหลี่ยมมุม) */
export const QR_BOX = { x: 164, y: 20, size: 24 };

/** ตารางวงคำตอบ: 4 คอลัมน์ × 25 แถว = 100 ข้อต่อหน้า · เว้นช่องทุก 5 แถวให้ไล่ตาง่าย */
export const GRID = {
    top: 64,
    left: 20,
    colWidth: 42.5,
    rowsPerCol: 25,
    cols: 4,
    rowHeight: 8,
    groupEvery: 5,
    groupGap: 1.6,
    // จากขอบซ้ายของคอลัมน์
    numberRight: 8,
    firstBubbleX: 12.5,
    bubbleSpacing: 6.7,
    bubbleRadius: 2.4,
};

export const QUESTIONS_PER_PAGE = GRID.rowsPerCol * GRID.cols;
export const MAX_CHOICES = 5;
export const CHOICE_LABELS = ["ก", "ข", "ค", "ง", "จ"];

export type Point = { x: number; y: number };

export type QuestionSlot = {
    /** เลขข้อที่พิมพ์บนกระดาษ (นับต่อกันทุกหน้า เริ่ม 1) */
    number: number;
    /** ตำแหน่งขอบขวาของเลขข้อ */
    numberAt: Point;
    bubbles: Point[];
};

/** ตำแหน่งแถวที่ i ในหน้า (0-based) */
function slotOrigin(indexOnPage: number): { left: number; centerY: number } {
    const col = Math.floor(indexOnPage / GRID.rowsPerCol);
    const row = indexOnPage % GRID.rowsPerCol;
    const groups = Math.floor(row / GRID.groupEvery);
    return {
        left: GRID.left + col * GRID.colWidth,
        centerY: GRID.top + row * GRID.rowHeight + groups * GRID.groupGap + GRID.rowHeight / 2,
    };
}

/**
 * ผังของ 1 หน้า — choiceCounts = จำนวนตัวเลือกของแต่ละข้อในหน้านี้ตามลำดับ (ข้อที่มี 3 ตัวเลือกพิมพ์ 3 วง)
 * firstNumber = เลขข้อแรกของหน้านี้
 */
export function pageSlots(choiceCounts: number[], firstNumber: number): QuestionSlot[] {
    if (choiceCounts.length > QUESTIONS_PER_PAGE) throw new Error(`หน้าเดียวรับได้ไม่เกิน ${QUESTIONS_PER_PAGE} ข้อ`);
    return choiceCounts.map((count, i) => {
        if (count < 1 || count > MAX_CHOICES) throw new Error(`ข้อ ${firstNumber + i} มี ${count} ตัวเลือก — กระดาษรองรับ 1-${MAX_CHOICES}`);
        const { left, centerY } = slotOrigin(i);
        return {
            number: firstNumber + i,
            numberAt: { x: left + GRID.numberRight, y: centerY },
            bubbles: Array.from({ length: count }, (_, c) => ({ x: left + GRID.firstBubbleX + c * GRID.bubbleSpacing, y: centerY })),
        };
    });
}

/** แบ่งข้อทั้งหมดเป็นหน้าๆ ละไม่เกิน 100 ข้อ */
export function paginate(choiceCounts: number[]): { firstNumber: number; choiceCounts: number[] }[] {
    const pages = [];
    for (let i = 0; i < choiceCounts.length; i += QUESTIONS_PER_PAGE) {
        pages.push({ firstNumber: i + 1, choiceCounts: choiceCounts.slice(i, i + QUESTIONS_PER_PAGE) });
    }
    return pages;
}

// ── QR ─────────────────────────────────────────────────────────────────────────────────────────────
// รูปแบบ: FT<รุ่นผัง>|<รหัสใบสอบ>|<หน้า>/<จำนวนหน้า>  เช่น FT1|PF-7K3Q9|2/3
// สั้นไว้ก่อน (QR ยิ่งเก็บน้อย ช่องยิ่งใหญ่ อ่านง่ายจากรูปมือถือ) ข้อมูลอื่นทั้งหมดดึงจากรหัสใบสอบ

export type SheetId = { version: number; code: string; page: number; pages: number };

export function encodeSheetId({ code, page, pages }: Omit<SheetId, "version">): string {
    return `FT${LAYOUT_VERSION}|${code}|${page}/${pages}`;
}

export function decodeSheetId(text: string): SheetId | null {
    const m = /^FT(\d+)\|([A-Z0-9-]{3,24})\|(\d+)\/(\d+)$/.exec(text.trim());
    if (!m) return null;
    const [version, page, pages] = [Number(m[1]), Number(m[3]), Number(m[4])];
    if (page < 1 || page > pages) return null;
    return { version, code: m[2], page, pages };
}
