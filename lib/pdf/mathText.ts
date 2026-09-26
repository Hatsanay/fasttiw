// แปลงสูตร LaTeX เป็นตัวอักษรจริงสำหรับ PDF (2026-09-24)
//
// **ทำไมไม่ใช้ KaTeX เหมือนบนเว็บ**: KaTeX คืน HTML+CSS ซึ่ง `@react-pdf/renderer` เรนเดอร์ไม่ได้เลย
// (มันรับแค่ `<Text>`/`<View>`/`<Image>` ของตัวเอง) ทางที่ได้หน้าตาเป๊ะคือเรนเดอร์สูตรเป็นรูปทีละอัน
// แล้วฝังเป็น `<Image>` ซึ่งต้องเพิ่ม MathJax + แปลง SVG→PNG + แคช = งานใหญ่และ PDF จะหนักขึ้นมาก
//
// ที่เลือกทำก่อนคือ **แปลงเป็นตัวอักษร Unicode ที่อ่านรู้เรื่อง** — เศษส่วนเขียนเป็น (3)/(2),
// เลขยกกำลังใช้ตัวยก ², รากใช้ √ ฯลฯ · ไฟล์ PDF คือใบงานไว้พิมพ์ลงกระดาษ อ่านออกคือพอแล้ว
// และดีกว่าปล่อยให้ลูกค้าเห็น `$\frac{3}{2}$` ดิบๆ ซึ่งคือสิ่งที่จะเกิดถ้าไม่ทำอะไรเลย
//
// ⚠ ข้อจำกัดที่ยอมรับ: สูตรซับซ้อน (เมทริกซ์ อินทิกรัล) จะได้รูปแบบที่อ่านได้แต่ไม่สวย
// ถ้าวันหนึ่งเนื้อหามีสูตรแบบนั้นเยอะ ค่อยลงทุนทำเป็นรูปจริง
//
// **อัปเดต 2026-09-26: เศษส่วนซ้อนชั้นจริงแล้ว** — ข้อความที่มีเศษส่วนไม่ใช้ mathToPdfText ทั้งก้อน แต่ผ่าน
// parsePdfMathLine ด้านล่าง แล้ว PdfMathText.tsx วาดเป็นกล่องตัวเศษ/เส้น/ตัวส่วน · mathToPdfText ยังใช้กับ
// ข้อความที่ไม่มีเศษส่วน (หน้าตาเดิมทุกประการ) และส่วนอื่นของสูตร (x², √)

const SUPERSCRIPT: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ", x: "ˣ", a: "ᵃ", b: "ᵇ",
};
const SUBSCRIPT: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎", n: "ₙ", i: "ᵢ", a: "ₐ", x: "ₓ",
};

// คำสั่ง LaTeX ที่มีตัวอักษร Unicode ตรงตัว — แทนได้เลยโดยไม่เสียความหมาย
const SYMBOLS: [RegExp, string][] = [
    [/\\times/g, "×"], [/\\div/g, "÷"], [/\\pm/g, "±"], [/\\mp/g, "∓"],
    [/\\cdot/g, "·"], [/\\ast/g, "*"],
    [/\\neq/g, "≠"], [/\\leq/g, "≤"], [/\\geq/g, "≥"], [/\\approx/g, "≈"], [/\\equiv/g, "≡"],
    [/\\infty/g, "∞"], [/\\degree/g, "°"], [/\\circ/g, "°"], [/\\%/g, "%"],
    [/\\pi/g, "π"], [/\\alpha/g, "α"], [/\\beta/g, "β"], [/\\gamma/g, "γ"], [/\\theta/g, "θ"],
    [/\\lambda/g, "λ"], [/\\mu/g, "μ"], [/\\sigma/g, "σ"], [/\\omega/g, "ω"], [/\\Delta/g, "Δ"],
    [/\\sum/g, "Σ"], [/\\prod/g, "∏"], [/\\int/g, "∫"],
    [/\\rightarrow|\\to/g, "→"], [/\\leftarrow/g, "←"], [/\\Rightarrow/g, "⇒"], [/\\leftrightarrow/g, "↔"],
    [/\\in/g, "∈"], [/\\notin/g, "∉"], [/\\subset/g, "⊂"], [/\\cup/g, "∪"], [/\\cap/g, "∩"],
    [/\\ldots|\\dots|\\cdots/g, "…"],
    [/\\quad|\\qquad|\\,|\\;|\\!/g, " "],
    [/\\left|\\right/g, ""],
];

const toScript = (text: string, table: Record<string, string>) =>
    // แปลงได้ทุกตัวถึงจะใช้ตัวยก/ตัวห้อย — ถ้ามีตัวไหนแปลงไม่ได้ให้ถอยไปใช้ ^(...) ซึ่งยังอ่านถูกความหมาย
    [...text].every((ch) => table[ch]) ? [...text].map((ch) => table[ch]).join("") : null;

/** แปลงเนื้อในสูตร LaTeX 1 ก้อนเป็นข้อความอ่านได้ */
function latexToPlain(latex: string): string {
    let s = latex;

    // วนซ้ำเพราะสูตรซ้อนกันได้ เช่น \frac{\sqrt{2}}{3} — รอบเดียวจะเหลือคำสั่งชั้นในไว้
    for (let round = 0; round < 5; round++) {
        const before = s;

        // เศษส่วน: ใส่วงเล็บเสมอเมื่อตัวเศษ/ตัวส่วนยาวกว่า 1 ตัวอักษร กันอ่านผิดลำดับ เช่น 1/2x
        s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_m, a: string, b: string) => {
            const wrap = (t: string) => (t.length > 1 ? `(${t})` : t);
            return `${wrap(a.trim())}/${wrap(b.trim())}`;
        });

        // ราก: \sqrt[n]{x} → ⁿ√(x) · \sqrt{x} → √x
        s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, (_m, n: string, x: string) =>
            `${toScript(n.trim(), SUPERSCRIPT) ?? `[${n.trim()}]`}√(${x.trim()})`);
        s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_m, x: string) =>
            (x.trim().length > 1 ? `√(${x.trim()})` : `√${x.trim()}`));

        // ยกกำลัง/ตัวห้อย ทั้งแบบมีปีกกาและตัวเดียวโดดๆ
        s = s.replace(/\^\s*\{([^{}]*)\}/g, (_m, x: string) => toScript(x.trim(), SUPERSCRIPT) ?? `^(${x.trim()})`);
        s = s.replace(/\^\s*(\w)/g, (_m, x: string) => SUPERSCRIPT[x] ?? `^${x}`);
        s = s.replace(/_\s*\{([^{}]*)\}/g, (_m, x: string) => toScript(x.trim(), SUBSCRIPT) ?? `_(${x.trim()})`);
        s = s.replace(/_\s*(\w)/g, (_m, x: string) => SUBSCRIPT[x] ?? `_${x}`);

        // ข้อความในสูตร \text{...} เอาเนื้อในมาตรงๆ
        s = s.replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, "$1");

        if (s === before) break;
    }

    for (const [pattern, replacement] of SYMBOLS) s = s.replace(pattern, replacement);

    // ปีกกาที่เหลือจากคำสั่งที่ไม่รู้จัก เอาออกให้อ่านง่าย แล้วยุบช่องว่างซ้ำ
    return s.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

// ─── เศษส่วนซ้อนชั้นจริง (2026-09-26 ผู้ใช้ขอ) ────────────────────────────────────────────────────────
// เดิมเศษส่วนเป็น (11)/(32) ในบรรทัดเดียว — ตอนนี้แยกเป็นโครงสร้าง ให้ PdfMathText.tsx วาดเป็นกล่องตัวเศษ/เส้น/ตัวส่วน
// ส่วนอื่นของสูตร (x², √, ×, ÷) ยังใช้ latexToPlain ตัวเดิม · ข้อความที่ไม่มีเศษส่วนไม่ผ่านตรงนี้เลย (hasPdfFraction)

export type PdfMathNode =
    | { type: "text"; value: string }
    | { type: "frac"; num: PdfMathNode[]; den: PdfMathNode[] };

const MATH_SEGMENT = /(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;
const FRAC_COMMAND = /\\[dt]?frac\s*/g;

/** ข้อความนี้มีเศษส่วนในสูตรไหม — ไม่มี = ใช้ <Text> แบบเดิมได้เลย PDF หน้าตาเหมือนเดิมทุกประการ */
export function hasPdfFraction(text: string | null | undefined): boolean {
    if (!text || !text.includes("$")) return false;
    return [...text.matchAll(MATH_SEGMENT)].some((m) => /\\[dt]?frac/.test(m[1]));
}

// อ่าน {…} ที่ตำแหน่ง start (ข้ามช่องว่างนำหน้าได้) รองรับปีกกาซ้อน เช่น \frac{\frac{1}{2}}{3}
function readGroup(s: string, start: number): { content: string; end: number } | null {
    let i = start;
    while (s[i] === " ") i++;
    if (s[i] !== "{") return null;
    let depth = 0;
    for (let j = i; j < s.length; j++) {
        if (s[j] === "{") depth++;
        else if (s[j] === "}" && --depth === 0) return { content: s.slice(i + 1, j), end: j + 1 };
    }
    return null;
}

function parseLatex(latex: string): PdfMathNode[] {
    const nodes: PdfMathNode[] = [];
    let buffer = "";
    const flush = () => {
        const plain = latexToPlain(buffer);
        if (plain) nodes.push({ type: "text", value: plain });
        buffer = "";
    };
    let i = 0;
    while (i < latex.length) {
        FRAC_COMMAND.lastIndex = i;
        const m = FRAC_COMMAND.exec(latex);
        if (!m) { buffer += latex.slice(i); break; }
        buffer += latex.slice(i, m.index);
        const num = readGroup(latex, m.index + m[0].length);
        const den = num && readGroup(latex, num.end);
        if (!num || !den) {
            // ปีกกาไม่ครบ (แอดมินพิมพ์ผิด) — ปล่อยเป็นข้อความให้ latexToPlain จัดการเหมือนเดิม ไม่พัง
            buffer += m[0];
            i = m.index + m[0].length;
            continue;
        }
        flush();
        nodes.push({ type: "frac", num: parseLatex(num.content), den: parseLatex(den.content) });
        i = den.end;
    }
    flush();
    return nodes;
}

/** แยกข้อความ 1 บรรทัด (ห้ามมี \n) เป็น ข้อความธรรมดา + ชิ้นสูตร */
export function parsePdfMathLine(line: string): PdfMathNode[] {
    const nodes: PdfMathNode[] = [];
    let last = 0;
    for (const m of line.matchAll(MATH_SEGMENT)) {
        const before = line.slice(last, m.index).replace(/\\\$/g, "$");
        if (before) nodes.push({ type: "text", value: before });
        nodes.push(...parseLatex(m[1]));
        last = m.index! + m[0].length;
    }
    const rest = line.slice(last).replace(/\\\$/g, "$");
    if (rest) nodes.push({ type: "text", value: rest });
    return nodes;
}

/**
 * แปลงข้อความทั้งก้อน (ที่อาจมีสูตรคร่อม `$...$` ปนอยู่) ให้พร้อมใส่ใน PDF
 * ข้อความที่ไม่มีสูตรจะไม่ถูกแตะเลย — ข้อสอบเก่าทุกชุดได้ PDF หน้าตาเหมือนเดิมเป๊ะ
 */
export function mathToPdfText(text: string | null | undefined): string {
    if (!text) return "";
    if (!text.includes("$")) return text;

    return text
        .replace(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g, (_m, latex: string) => latexToPlain(latex))
        .replace(/\\\$/g, "$");
}
