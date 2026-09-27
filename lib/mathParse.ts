
// แสดงคณิตศาสตร์ในโจทย์/ตัวเลือก/เฉลย (2026-09-24)
//
// **ไวยากรณ์: LaTeX คร่อมด้วย `$...$`** เช่น `ข้อใดมีค่าเท่ากับ $\frac{3}{2}$` — เลือก LaTeX เพราะเป็น
// ทางเดียวที่ครอบคลุม "คณิตศาสตร์" จริงๆ ทั้งเศษส่วน เลขยกกำลัง ราก ซิกม่า เมทริกซ์ ไม่ใช่แค่เศษส่วน
// (ทางเลือกอื่นที่ทิ้งไป: อักขระ Unicode เช่น ½ มีแค่ไม่กี่ตัว · HTML ในช่องข้อความ = เปิดช่อง XSS
// และแอดมินพิมพ์ยากกว่า)
//
// **ข้อความที่ไม่มี `$` จะไม่ถูกแตะเลย** — ข้อสอบเก่าทั้งหมดแสดงผลเหมือนเดิมเป๊ะ ไม่ต้องแก้อะไรย้อนหลัง
//
// ความปลอดภัย: ส่วนที่เป็นข้อความธรรมดาปล่อยให้ React escape ตามปกติ (ไม่ประกอบ HTML string เอง)
// ส่วนที่เป็นสูตรให้ KaTeX แปลงด้วย `trust: false` (ค่าเริ่มต้น) ซึ่งไม่ยอมให้ `\href`/`\url`/`\includegraphics`
// และ `throwOnError: false` เพื่อให้สูตรที่พิมพ์ผิดแสดงเป็นข้อความสีแดงในที่ของมัน **ไม่ทำให้ทั้งหน้าพัง**
// (ข้อสอบ 1 ข้อพิมพ์ผิดต้องไม่ทำให้ลูกค้าทำข้อสอบต่อไม่ได้)

// `$...$` ภายในบรรทัดเดียว — จำกัดไม่ให้ข้ามบรรทัดเพื่อไม่ให้ `$` ที่โดดเดี่ยวคนละบรรทัดจับคู่กันเองมั่ว
// `\$` = เครื่องหมายดอลลาร์จริงๆ (เผื่อวันหนึ่งมีโจทย์เรื่องเงินดอลลาร์)
const MATH_PATTERN = /(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;

// ตัวตรวจแยกอีกตัว **ห้ามใช้ MATH_PATTERN ตรวจ** — `.test()` ของ regex ที่มี /g เลื่อน `lastIndex` ค้างไว้
// แล้ว `matchAll` ครั้งถัดไป (ซึ่งคัดลอก `lastIndex` ไปด้วย) จะเริ่มอ่านกลางข้อความ สูตรหายเป็นครั้งๆ
// (จุดที่เจอจริง: ตัวอย่างสดใต้ช่องกรอกของแอดมิน ที่เรียก hasMath ก่อน MathText เสมอ)
const MATH_TEST = /(?<!\\)\$[^$\n]+?(?<!\\)\$/;

// ขนาดสูตร (2026-09-26 ผู้ใช้ขอ): ค่าเริ่มต้นของ KaTeX วาดสูตรในบรรทัดข้อความแบบย่อ (text style) ตัวเศษ/ตัวส่วน
// ของเศษส่วนเล็กกว่าข้อความรอบๆ มาก อ่านยาก โดยเฉพาะบนมือถือ · ใส่ \displaystyle ให้วาดขนาดเต็มเสมอ แลกกับ
// บรรทัดที่มีเศษส่วนสูงขึ้นเล็กน้อย
// ตัวเรนเดอร์ทั้งสองฝั่ง (lib/math.tsx, lib/mathClient.tsx) ต้องเรียกผ่านฟังก์ชันนี้ ขนาดสูตรจะได้ตรงกันทุกหน้า
export function katexSource(latex: string): string {
    return `\\displaystyle ${textAsterisk(latex)}`;
}

// `*` ในสูตร = ดอกจันแบบตัวหนังสือ ชิดบน (2026-09-27 ผู้ใช้ขอ) — ข้อสอบใช้เป็น "เครื่องหมายนิยามพิเศษ" เช่น
// `ถ้า 8 * 9 = 17` ต้องหน้าตาเหมือนพิมพ์ธรรมดา ไม่ใช่ดอกจันกลางบรรทัด (∗) ที่ KaTeX วาดให้ และไม่ใช่เครื่องหมายคูณ
// \mathbin คงระยะห่างซ้าย-ขวาแบบเครื่องหมายดำเนินการ · หลัง ^ หรือ _ ใส่ \mathbin ตรงๆ ไม่ได้ (KaTeX error)
// จึงครอบปีกกาแทน · ดอกจันกลางแบบเดิมพิมพ์ `\ast` · ต้องตรงกับฝั่งแอดมิน (frontend/app/lib/math.tsx)
function textAsterisk(latex: string): string {
    return latex.replace(/([\^_]\s*)?\*/g, (_m, script?: string) =>
        script ? `${script}{\\text{*}}` : "\\mathbin{\\text{*}}");
}

/**
 * วาดสูตร 1 ก้อนเป็น HTML — ตัวเรนเดอร์ทุกตัวเรียกผ่านที่นี่ (รับ katex เป็นพารามิเตอร์ ไฟล์นี้จึงไม่ดึง KaTeX เข้า bundle)
 *
 * ดอกจันจาก \text{*} ยังเป็นฟอนต์ของ KaTeX (ดอกจันเซอริฟ หน้าตาไม่เหมือนที่พิมพ์) จึงติด class `math-star` ให้
 * แล้ว globals.css สั่งให้ใช้ฟอนต์เดียวกับข้อความ · KaTeX วาด `*` ในโหมดสูตรเป็น ∗ (U+2217) เสมอ ดอกจัน ASCII
 * ในผลลัพธ์จึงมาจากโหมดตัวหนังสือเท่านั้น ไม่ไปโดนสัญลักษณ์อื่น
 */
export function renderMath(katex: { renderToString: (tex: string, options: object) => string }, latex: string): string {
    return katex
        .renderToString(katexSource(latex), { throwOnError: false, output: "html" })
        .replace(/<span class="mord( mtight)?">\*<\/span>/g, '<span class="mord$1 math-star">*</span>');
}

export type MathSegment = { type: "text" | "math"; value: string };

/** แยกข้อความเป็นช่วงข้อความธรรมดากับช่วงสูตร — แยกออกมาเป็นฟังก์ชันเพื่อให้เทสต์ได้โดยไม่ต้องเรนเดอร์ React */
export function splitMath(text: string): MathSegment[] {
    const segments: MathSegment[] = [];
    let last = 0;
    for (const match of text.matchAll(MATH_PATTERN)) {
        const start = match.index ?? 0;
        if (start > last) segments.push({ type: "text", value: text.slice(last, start) });
        segments.push({ type: "math", value: match[1] });
        last = start + match[0].length;
    }
    if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
    return segments;
}

/** มีสูตรอยู่ในข้อความไหม — ใช้เลี่ยงงานที่ไม่จำเป็นในจุดที่ข้อความส่วนใหญ่ไม่มีสูตร */
export function hasMath(text: string | null | undefined): boolean {
    return !!text && MATH_TEST.test(text);
}

/** คืนข้อความล้วนแบบไม่มีเครื่องหมาย `$` — ใช้กับที่ที่แสดง HTML ไม่ได้ เช่น title/aria-label */
export function stripMathDelimiters(text: string): string {
    return splitMath(text).map((s) => s.value).join("").replace(/\\\$/g, "$");
}
