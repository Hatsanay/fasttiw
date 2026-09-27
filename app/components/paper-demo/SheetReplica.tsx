import type { ReactNode } from "react";
import { CHOICE_LABELS, FIDUCIALS, FIDUCIAL_SIZE, GRID, QR_BOX, pageSlots } from "@/lib/paper/layout";
import { QrGlyph } from "@/app/components/phone-demo/kit";

// กระดาษคำตอบจำลองสำหรับ motion graphic หน้าแรก — วาดเป็น SVG หน่วยมิลลิเมตร (viewBox 210×297 = A4)
// ตำแหน่งสี่เหลี่ยมมุม / QR / วงคำตอบมาจาก lib/paper/layout.ts ตัวเดียวกับ PDF จริงและตัวอ่านภาพ หน้าตาจึงตรงกับที่พิมพ์ออกไป
// ⚠ หัวกระดาษ/แถบ/ท้ายกระดาษ ลอกตำแหน่งมาจาก lib/pdf/AnswerSheetDocument.tsx — แก้หน้าตาใบจริงเมื่อไหร่ให้แก้ที่นี่ตาม
// QR เป็นลายจำลอง (ไม่ใช่รหัสจริง)

const BRAND = "#2b5ce6";
const BRAND_DARK = "#1e3a8a";
const ACCENT = "#ff9f1c";
const BRAND_50 = "#eff4ff";
const BRAND_100 = "#dbe5fd";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#cbd5e1";
const BUBBLE_LINE = "#5b7fe8";
const BUBBLE_LETTER = "#a9bcf5";
const PENCIL = "#2b2d33";

const PT = 25.4 / 72; // ขนาดตัวอักษรใน PDF เป็น pt → มม.
const SLOTS = pageSlots(Array(100).fill(4), 1);

/** ข้อความวางแบบเดียวกับ Label ของ PDF: top = ขอบบนของบรรทัด */
function T({
    x,
    top,
    size,
    color = INK,
    bold,
    anchor = "start",
    children,
}: {
    x: number;
    top: number;
    size: number;
    color?: string;
    bold?: boolean;
    anchor?: "start" | "middle" | "end";
    children: ReactNode;
}) {
    const mm = size * PT;
    return (
        <text x={x} y={top + mm * 1.02} fontSize={mm} fill={color} fontWeight={bold ? 600 : 400} textAnchor={anchor}>
            {children}
        </text>
    );
}

export type SheetMarks = Record<number, number[]>;

/**
 * marks = วงที่ฝนแล้ว { เลขข้อ: [ดัชนีตัวเลือก] } · fresh = ข้อที่เพิ่งฝน (เล่นแอนิเมชันกดดินสอลง)
 * pencilAt = ดินสอชี้ที่วงไหน (เลขข้อ + ดัชนี) — ไม่ส่ง = ไม่มีดินสอ
 */
export default function SheetReplica({
    code,
    productName,
    marks,
    pencilAt,
    viewBox = "0 0 210 297",
    className,
}: {
    code: string;
    productName: string;
    marks: SheetMarks;
    pencilAt?: { number: number; choice: number } | null;
    /** ตัดดูเฉพาะบางส่วนของแผ่น (หน่วยมม.) — เช่น แถวของข้อเดียวในฉากยืนยัน */
    viewBox?: string;
    className?: string;
}) {
    const r = GRID.bubbleRadius;
    const groupsPerCol = GRID.rowsPerCol / GRID.groupEvery;
    const pencilSlot = pencilAt ? SLOTS[pencilAt.number - 1]?.bubbles[pencilAt.choice] : null;
    const name = productName.length > 52 ? `${productName.slice(0, 51)}…` : productName;
    return (
        <svg viewBox={viewBox} className={className} style={{ fontFamily: "var(--font-kanit), sans-serif" }} aria-hidden>
            <rect width="210" height="297" fill="#fff" />
            {FIDUCIALS.map((f, i) => (
                <rect key={i} x={f.x - FIDUCIAL_SIZE / 2} y={f.y - FIDUCIAL_SIZE / 2} width={FIDUCIAL_SIZE} height={FIDUCIAL_SIZE} fill="#000" />
            ))}
            <QrGlyph x={QR_BOX.x} y={QR_BOX.y} width={QR_BOX.size} height={QR_BOX.size} fill="#000" />
            <T x={QR_BOX.x + QR_BOX.size / 2} top={QR_BOX.y + QR_BOX.size + 0.6} size={6.5} color={MUTED} anchor="middle">
                ห้ามเขียนทับ QR
            </T>

            {/* หัวกระดาษ */}
            <image href="/logo/fasttiw-logo.svg" x={22} y={17.2} width={25.4} height={7} preserveAspectRatio="xMinYMid meet" />
            <rect x={50.5} y={17.6} width={0.25} height={6.2} fill={BORDER} />
            <T x={53.5} top={16.6} size={15} color={BRAND_DARK} bold>
                กระดาษคำตอบ
            </T>
            <rect x={53.8} y={24.4} width={9} height={0.9} rx={0.45} fill={ACCENT} />
            <T x={22} top={27.6} size={11} bold>
                {name}
            </T>
            {[
                { x: 22, w: 40, text: `ใบสอบ ${code}`, strong: true },
                { x: 64, w: 20, text: "หน้า 1/1" },
                { x: 86, w: 26, text: "ข้อ 1–100" },
            ].map((p) => (
                <g key={p.x}>
                    <rect x={p.x} y={35} width={p.w} height={5.2} rx={2.6} fill={p.strong ? BRAND_50 : "#f1f5f9"} />
                    <T x={p.x + p.w / 2} top={36.05} size={7.5} color={p.strong ? BRAND : MUTED} bold={p.strong} anchor="middle">
                        {p.text}
                    </T>
                </g>
            ))}
            {[
                { x: 22, w: 68, label: "ชื่อ-นามสกุล" },
                { x: 92, w: 34, label: "วันที่สอบ (วัน / เดือน / ปี)" },
                { x: 128, w: 32, label: "เวลาสอบ (เริ่ม – เสร็จ)" },
            ].map((f) => (
                <g key={f.x}>
                    <rect x={f.x} y={41.4} width={f.w} height={9.6} rx={1.8} fill="none" stroke={BORDER} strokeWidth={0.21} />
                    <T x={f.x + 2.5} top={42.3} size={6.5} color={BRAND} bold>
                        {f.label}
                    </T>
                    <line x1={f.x + 3} x2={f.x + f.w - 3} y1={48.6} y2={48.6} stroke="#94a3b8" strokeWidth={0.25} strokeDasharray="0.42 0.56" />
                </g>
            ))}

            {/* แถบวิธีฝน */}
            <rect x={22} y={52.4} width={166} height={8.4} rx={2.2} fill={BRAND_50} stroke={BRAND_100} strokeWidth={0.21} />
            <T x={25} top={54.7} size={8} color={BRAND} bold>
                วิธีฝน
            </T>
            <circle cx={42.5} cy={56.6} r={r} fill="#111" stroke={BUBBLE_LINE} strokeWidth={0.25} />
            <T x={46.5} top={54.8} size={7.5} color="#15803d" bold>
                ถูก
            </T>
            {[58, 64.5, 71].map((x) => (
                <circle key={x} cx={x} cy={56.6} r={r} fill="#fff" stroke={BUBBLE_LINE} strokeWidth={0.25} />
            ))}
            <path d="M56.6 56.6 l1.1 1.1 l1.9 -2.4" stroke="#111" strokeWidth={0.42} fill="none" />
            <path d="M63.1 55.2 l2.8 2.8 M65.9 55.2 l-2.8 2.8" stroke="#111" strokeWidth={0.42} />
            <path d={`M71 ${56.6 - r} A${r} ${r} 0 0 0 71 ${56.6 + r} Z`} fill="#111" />
            <T x={75} top={54.8} size={7.5} color="#dc2626" bold>
                ผิด
            </T>
            <T x={87} top={54.8} size={7.5} color="#334155">
                ใช้ดินสอ 2B หรือปากกาดำ ฝนให้เต็มวง · ข้อละ 1 วง · ลบให้สะอาด
            </T>

            {/* แถบกลุ่มละ 5 ข้อ */}
            {Array.from({ length: GRID.cols * groupsPerCol }, (_, i) => {
                const col = Math.floor(i / groupsPerCol);
                const group = i % groupsPerCol;
                const top = GRID.top + group * (GRID.groupEvery * GRID.rowHeight + GRID.groupGap) - 0.4;
                return (
                    <rect
                        key={i}
                        x={GRID.left + col * GRID.colWidth + 1}
                        y={top}
                        width={GRID.colWidth - 2}
                        height={GRID.groupEvery * GRID.rowHeight + 0.8}
                        rx={1.8}
                        fill={group % 2 === 0 ? "#f5f8ff" : "#ffffff"}
                        stroke={group % 2 === 0 ? "none" : "#eef2fb"}
                        strokeWidth={0.21}
                    />
                );
            })}

            {SLOTS.map((slot) => (
                <g key={slot.number}>
                    <T x={slot.numberAt.x} top={slot.numberAt.y - 2.2} size={8.5} color={slot.number % 5 === 0 ? BRAND : INK} bold anchor="end">
                        {slot.number}
                    </T>
                    {slot.bubbles.map((b, c) => (
                        <g key={c}>
                            <circle cx={b.x} cy={b.y} r={r - 0.14} fill="#fff" stroke={BUBBLE_LINE} strokeWidth={0.21} />
                            <T x={b.x} top={b.y - 1.6} size={5.5} color={BUBBLE_LETTER} anchor="middle">
                                {CHOICE_LABELS[c]}
                            </T>
                        </g>
                    ))}
                    {(marks[slot.number] ?? []).map((c) => (
                        <circle key={`m${c}`} className="paper-mark" cx={slot.bubbles[c].x} cy={slot.bubbles[c].y} r={r * 0.86} fill={PENCIL} />
                    ))}
                </g>
            ))}

            <T x={105} top={272.2} size={7} color={MUTED} anchor="middle">
                ห้ามพับ · ห้ามเขียนทับสี่เหลี่ยมดำที่มุม · ถ่ายรูปให้เห็นมุมดำครบ 4 มุม · พิมพ์ขนาดจริง 100% (ห้ามย่อ)
            </T>
            <T x={22} top={276.4} size={7.5} color={BRAND} bold>
                fasttiw.com
            </T>
            <T x={40} top={276.4} size={7.5} color={MUTED}>
                แนวข้อสอบพร้อมเฉลยละเอียด
            </T>
            <T x={188} top={276.4} size={7.5} color={MUTED} anchor="end">
                {`${code} · หน้า 1/1`}
            </T>

            {/* ดินสอ — ปลายแตะวงที่กำลังฝน ตัวดินสอเอียงไปทางขวาบน */}
            {pencilSlot && (
                <g className="paper-pencil" style={{ transform: `translate(${pencilSlot.x}px, ${pencilSlot.y}px)` }}>
                    <g transform="rotate(35)">
                        <polygon points="0,0 -1.3,-3.2 1.3,-3.2" fill="#f1c27d" />
                        <polygon points="0,0 -0.45,-1.1 0.45,-1.1" fill="#333" />
                        <rect x={-1.3} y={-25} width={2.6} height={21.8} fill="#fbbf24" />
                        <rect x={-1.3} y={-25} width={0.9} height={21.8} fill="#f59e0b" />
                        <rect x={-1.3} y={-27.5} width={2.6} height={2.5} fill="#cbd5e1" />
                        <rect x={-1.3} y={-30} width={2.6} height={2.5} rx={0.8} fill="#f472b6" />
                    </g>
                </g>
            )}
        </svg>
    );
}
