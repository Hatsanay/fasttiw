import { Document, Page, Text, View, Svg, Circle, Path, Line, Image as PdfImage } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import { PDF_FONT_FAMILY } from "./fonts";
import { toPdfThai } from "./thaiText";
import {
    CHOICE_LABELS,
    FIDUCIALS,
    FIDUCIAL_SIZE,
    GRID,
    QR_BOX,
    encodeSheetId,
    pageSlots,
    type Point,
} from "../paper/layout";
import { describeMark, type Mark } from "../paper/testPattern";

// กระดาษคำตอบแบบฝน สไตล์ fasttiw (ระบบสอบกระดาษ — เฟส 0 ต้นแบบ, 2026-09-27)
//
// ⚠ ตำแหน่งสี่เหลี่ยมมุม / QR / วงคำตอบ มาจาก lib/paper/layout.ts ที่เดียว (ตัวอ่านภาพใช้ไฟล์เดียวกัน) — ทุกชิ้นวาง
// แบบ absolute ด้วยพิกัดมิลลิเมตรตรงๆ ห้ามใช้ flex/margin จัดตำแหน่งของพวกนี้
// ⚠ ของตกแต่ง (สีแบรนด์ หัวกระดาษ แถบ) ต้องไม่ล้ำเข้า 3 เขตที่ตัวอ่านใช้ตรวจว่าดึงภาพถูก (lib/paper/omr.ts registrationOk):
//   1) ขอบกระดาษ 4-6 มม. ทุกด้าน ต้องขาว  2) รอบสี่เหลี่ยมมุม 7 มม. ต้องขาว  3) ในวงคำตอบต้องสีอ่อน (ห้ามถมสี)
//   และห้ามลายน้ำ (ทำให้ความเข้มของวงเปล่าไม่เท่ากันทั้งแผ่น)
// ⚠ ต้องพิมพ์ขนาดจริง 100% — เผื่อสี่เหลี่ยมมุมไว้ห่างขอบ 8 มม. กันเครื่องพิมพ์ที่ขอบกว้างตัดทิ้ง

const MM = 72 / 25.4;
const pt = (mm: number) => mm * MM;

// สีแบรนด์ (ตรงกับโลโก้/หน้าเว็บ — tiwwai-store/app/globals.css)
const BRAND = "#2b5ce6";
const BRAND_DARK = "#1e3a8a";
const ACCENT = "#ff9f1c";
const BRAND_50 = "#eff4ff";
const BRAND_100 = "#dbe5fd";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#cbd5e1";
// วง: เส้นขอบสีแบรนด์ (พิมพ์ขาวดำจะออกเทากลาง ยังเห็นชัด) ตัวอักษรข้างในจางมาก ไม่ให้กวนตอนอ่านความเข้ม
const BUBBLE_LINE = "#5b7fe8";
const BUBBLE_LETTER = "#a9bcf5";

// ส่งเป็นข้อมูลไฟล์ (Buffer) เหมือนรูปอื่นใน ExamPdfDocument — ส่งเป็น path เฉยๆ react-pdf ไม่แสดงรูปและไม่ error
const LOGO = readFileSync(join(process.cwd(), "public/logo/fasttiw-logo.png"));
const LOGO_RATIO = 1800 / 497;

function Fiducial({ at }: { at: Point }) {
    return (
        <View
            style={{
                position: "absolute",
                left: pt(at.x - FIDUCIAL_SIZE / 2),
                top: pt(at.y - FIDUCIAL_SIZE / 2),
                width: pt(FIDUCIAL_SIZE),
                height: pt(FIDUCIAL_SIZE),
                backgroundColor: "#000",
            }}
        />
    );
}

/** QR เป็นเวกเตอร์ (คมทุกขนาดพิมพ์) — เว้นขอบขาว 2 ช่องในกล่องตามมาตรฐานให้ตัวอ่าน QR หาเจอง่าย */
function SheetQr({ text }: { text: string }) {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const quiet = 2;
    const cell = QR_BOX.size / (n + quiet * 2);
    let d = "";
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            if (qr.modules.get(y, x)) d += `M${pt((x + quiet) * cell)} ${pt((y + quiet) * cell)}h${pt(cell)}v${pt(cell)}h${-pt(cell)}z`;
        }
    }
    return (
        <Svg style={{ position: "absolute", left: pt(QR_BOX.x), top: pt(QR_BOX.y) }} width={pt(QR_BOX.size)} height={pt(QR_BOX.size)}>
            <Path d={d} fill="#000" />
        </Svg>
    );
}

function Label({
    x,
    y,
    width,
    align = "left",
    size,
    color = INK,
    bold,
    children,
}: {
    x: number;
    y: number;
    width: number;
    align?: "left" | "right" | "center";
    size: number;
    color?: string;
    bold?: boolean;
    children: string;
}) {
    return (
        <Text
            style={{
                position: "absolute",
                left: pt(x),
                top: pt(y),
                width: pt(width),
                textAlign: align,
                fontSize: size,
                color,
                fontWeight: bold ? "semibold" : "normal",
            }}
        >
            {toPdfThai(children)}
        </Text>
    );
}

/** กล่องมุมมน (พื้น/ขอบ) วางด้วยพิกัดมม. */
function Box({ x, y, w, h, fill, stroke, radius = 1.8 }: { x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius?: number }) {
    return (
        <View
            style={{
                position: "absolute",
                left: pt(x),
                top: pt(y),
                width: pt(w),
                height: pt(h),
                borderRadius: pt(radius),
                backgroundColor: fill,
                ...(stroke ? { borderWidth: 0.6, borderColor: stroke, borderStyle: "solid" } : {}),
            }}
        />
    );
}

/** เส้นประให้เขียนทับ (ช่องชื่อ/วันที่) */
function WriteLine({ x1, x2, y }: { x1: number; x2: number; y: number }) {
    return (
        <Svg style={{ position: "absolute", left: pt(x1), top: pt(y - 0.5) }} width={pt(x2 - x1)} height={pt(1)}>
            <Line x1={0} y1={pt(0.5)} x2={pt(x2 - x1)} y2={pt(0.5)} stroke="#94a3b8" strokeWidth={0.7} strokeDasharray="1.2 1.6" />
        </Svg>
    );
}

// ความกว้างของตัวคั่นในช่องกรอก (มม.)
const SEPARATOR_WIDTH: Record<string, number> = { "/": 3, ":": 2, "–": 3.5, "น.": 4 };

/**
 * ช่องกรอกด้วยมือ: กล่อง + ป้ายเล็กมุมบนซ้าย + เส้นประเป็นช่วงๆ
 * parts = ตัวเลข → เส้นประยาวเท่านั้น (มม.) · ข้อความ → ตัวคั่น เช่น "/" ":" "–" "น."
 */
function WriteField({ x, w, label, parts }: { x: number; w: number; label: string; parts: (number | string)[] }) {
    // จุดเริ่มของแต่ละชิ้น คิดล่วงหน้าก่อน render (ห้ามแก้ตัวแปรสะสมระหว่าง map — กฎของ React Compiler)
    const widthOf = (part: number | string) => (typeof part === "number" ? part : (SEPARATOR_WIDTH[part] ?? 3));
    const starts = parts.map((_, i) => x + 3 + parts.slice(0, i).reduce<number>((sum, p) => sum + widthOf(p), 0));
    const pieces = parts.map((part, i) =>
        typeof part === "number" ? (
            <WriteLine key={i} x1={starts[i]} x2={starts[i] + part} y={48.6} />
        ) : (
            <Label key={i} x={starts[i]} y={part === "น." ? 46.5 : 45.9} width={widthOf(part)} align="center" size={part === "น." ? 7 : 9} color={MUTED}>
                {part}
            </Label>
        )
    );
    return (
        <>
            <Box x={x} y={41.4} w={w} h={9.6} stroke={BORDER} />
            <Label x={x + 2.5} y={42.3} width={w - 3} size={6.5} color={BRAND} bold>
                {label}
            </Label>
            {pieces}
        </>
    );
}

/** เม็ดยาข้อมูล (รหัสใบสอบ / หน้า / ช่วงข้อ) */
function Pill({ x, y, w, children, strong }: { x: number; y: number; w: number; children: string; strong?: boolean }) {
    return (
        <>
            <Box x={x} y={y} w={w} h={5.2} fill={strong ? BRAND_50 : "#f1f5f9"} radius={2.6} />
            <Label x={x} y={y + 1.05} width={w} align="center" size={7.5} color={strong ? BRAND : MUTED} bold={strong}>
                {children}
            </Label>
        </>
    );
}

/** ตัวอย่างวิธีฝน ถูก/ผิด — วาดด้วยเวกเตอร์ (ฟอนต์ไม่มี ✗) */
function FillExample({ x, y, kind }: { x: number; y: number; kind: "good" | "tick" | "cross" | "half" }) {
    const r = GRID.bubbleRadius;
    const size = pt(r * 2 + 1);
    const c = pt(r + 0.5);
    return (
        <Svg style={{ position: "absolute", left: pt(x - r - 0.5), top: pt(y - r - 0.5) }} width={size} height={size}>
            <Circle cx={c} cy={c} r={pt(r)} stroke={BUBBLE_LINE} strokeWidth={0.7} fill={kind === "good" ? "#111" : "white"} />
            {kind === "tick" && <Path d={`M${c - pt(1.4)} ${c} L${c - pt(0.3)} ${c + pt(1.1)} L${c + pt(1.6)} ${c - pt(1.3)}`} stroke="#111" strokeWidth={1.2} fill="none" />}
            {kind === "cross" && (
                <>
                    <Line x1={c - pt(1.4)} y1={c - pt(1.4)} x2={c + pt(1.4)} y2={c + pt(1.4)} stroke="#111" strokeWidth={1.2} />
                    <Line x1={c + pt(1.4)} y1={c - pt(1.4)} x2={c - pt(1.4)} y2={c + pt(1.4)} stroke="#111" strokeWidth={1.2} />
                </>
            )}
            {kind === "half" && <Path d={`M${c} ${c - pt(r)} A${pt(r)} ${pt(r)} 0 0 0 ${c} ${c + pt(r)} Z`} fill="#111" />}
        </Svg>
    );
}

/** ชื่อชุดยาวเกินบรรทัดเดียวจะดันทับกล่องข้อมูลข้างล่าง — ตัดให้พอดีบรรทัด */
function oneLine(text: string, max = 58): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export type AnswerSheetPage = { firstNumber: number; choiceCounts: number[] };

function SheetPage({
    productName,
    code,
    page,
    pages,
    layout,
}: {
    productName: string;
    code: string;
    page: number;
    pages: number;
    layout: AnswerSheetPage;
}) {
    const slots = pageSlots(layout.choiceCounts, layout.firstNumber);
    const r = GRID.bubbleRadius;
    const lastNumber = layout.firstNumber + layout.choiceCounts.length - 1;
    const groupsPerCol = GRID.rowsPerCol / GRID.groupEvery;
    return (
        <Page size="A4" style={{ fontFamily: PDF_FONT_FAMILY, position: "relative", backgroundColor: "#fff" }}>
            {FIDUCIALS.map((f, i) => (
                <Fiducial key={i} at={f} />
            ))}
            <SheetQr text={encodeSheetId({ code, page, pages })} />
            <Label x={QR_BOX.x - 4} y={QR_BOX.y + QR_BOX.size + 0.6} width={QR_BOX.size + 8} align="center" size={6.5} color={MUTED}>
                ห้ามเขียนทับ QR
            </Label>

            {/* หัวกระดาษ: โลโก้ | กระดาษคำตอบ (ขีดส้มแบบจุดในโลโก้) */}
            <PdfImage src={LOGO} style={{ position: "absolute", left: pt(22), top: pt(17.2), width: pt(7 * LOGO_RATIO), height: pt(7) }} />
            <View style={{ position: "absolute", left: pt(50.5), top: pt(17.6), width: 0.6, height: pt(6.2), backgroundColor: BORDER }} />
            <Label x={53.5} y={16.6} width={100} size={15} color={BRAND_DARK} bold>
                กระดาษคำตอบ
            </Label>
            <Box x={53.8} y={24.4} w={9} h={0.9} fill={ACCENT} radius={0.45} />

            <Label x={22} y={27.6} width={138} size={11} bold>
                {oneLine(productName)}
            </Label>

            <Pill x={22} y={35} w={40} strong>
                {`ใบสอบ ${code}`}
            </Pill>
            <Pill x={64} y={35} w={20}>
                {`หน้า ${page}/${pages}`}
            </Pill>
            <Pill x={86} y={35} w={26}>
                {`ข้อ ${layout.firstNumber}–${lastNumber}`}
            </Pill>

            {/* ช่องเขียนมือ (ระบบไม่อ่าน) — ป้ายเล็กมุมบน + เส้นประให้เขียนทับ ให้เห็นทันทีว่าเขียนตรงไหน
                (เดิมมีแค่ป้ายในกล่องว่าง คนดูไม่ออกว่าต้องเขียนในกล่องหรือข้างหลังป้าย) · เวลาเริ่ม-เสร็จไว้ให้ลูกค้าจับเวลาเอง */}
            <WriteField x={22} w={68} label="ชื่อ-นามสกุล" parts={[62]} />
            <WriteField x={92} w={34} label="วันที่สอบ (วัน / เดือน / ปี)" parts={[7, "/", 7, "/", 9]} />
            <WriteField x={128} w={32} label="เวลาสอบ (เริ่ม – เสร็จ)" parts={[4, ":", 4, "–", 4, ":", 4, "น."]} />

            {/* แถบวิธีฝน */}
            <Box x={22} y={52.4} w={166} h={8.4} fill={BRAND_50} stroke={BRAND_100} radius={2.2} />
            <Label x={25} y={54.7} width={16} size={8} color={BRAND} bold>
                วิธีฝน
            </Label>
            <FillExample x={42.5} y={56.6} kind="good" />
            <Label x={46.5} y={54.8} width={10} size={7.5} color="#15803d" bold>
                ถูก
            </Label>
            <FillExample x={58} y={56.6} kind="tick" />
            <FillExample x={64.5} y={56.6} kind="cross" />
            <FillExample x={71} y={56.6} kind="half" />
            <Label x={75} y={54.8} width={10} size={7.5} color="#dc2626" bold>
                ผิด
            </Label>
            <Label x={87} y={54.8} width={99} size={7.5} color="#334155">
                ใช้ดินสอ 2B หรือปากกาดำ ฝนให้เต็มวง · ข้อละ 1 วง · ลบให้สะอาด
            </Label>

            {/* แถบกลุ่มละ 5 ข้อ ช่วยไล่ตา — สีจางมาก ไม่รบกวนการอ่านความเข้มของวง */}
            {Array.from({ length: GRID.cols * groupsPerCol }, (_, i) => {
                const col = Math.floor(i / groupsPerCol);
                const group = i % groupsPerCol;
                const firstIndex = col * GRID.rowsPerCol + group * GRID.groupEvery;
                if (firstIndex >= slots.length) return null;
                const top = GRID.top + group * (GRID.groupEvery * GRID.rowHeight + GRID.groupGap) - 0.4;
                const left = GRID.left + col * GRID.colWidth + 1;
                return (
                    <Box
                        key={i}
                        x={left}
                        y={top}
                        w={GRID.colWidth - 2}
                        h={GRID.groupEvery * GRID.rowHeight + 0.8}
                        fill={group % 2 === 0 ? "#f5f8ff" : "#ffffff"}
                        stroke={group % 2 === 0 ? undefined : "#eef2fb"}
                        radius={1.8}
                    />
                );
            })}

            {slots.map((slot) => (
                <View key={slot.number}>
                    <Label x={slot.numberAt.x - 8} y={slot.numberAt.y - 2.2} width={8} align="right" size={8.5} color={slot.number % 5 === 0 ? BRAND : INK} bold>
                        {String(slot.number)}
                    </Label>
                    {slot.bubbles.map((b, c) => (
                        <View key={c}>
                            <Svg style={{ position: "absolute", left: pt(b.x - r), top: pt(b.y - r) }} width={pt(r * 2)} height={pt(r * 2)}>
                                <Circle cx={pt(r)} cy={pt(r)} r={pt(r) - 0.4} stroke={BUBBLE_LINE} strokeWidth={0.6} fill="white" />
                            </Svg>
                            <Label x={b.x - r} y={b.y - 1.6} width={r * 2} align="center" size={5.5} color={BUBBLE_LETTER}>
                                {CHOICE_LABELS[c]}
                            </Label>
                        </View>
                    ))}
                </View>
            ))}

            {/* ท้ายกระดาษ — อยู่เหนือแนวสี่เหลี่ยมมุมล่าง (ขอบกระดาษ 4-6 มม. ต้องขาวเสมอ) */}
            <Label x={22} y={272.2} width={166} align="center" size={7} color={MUTED}>
                ห้ามพับ · ห้ามเขียนทับสี่เหลี่ยมดำที่มุม · ถ่ายรูปให้เห็นมุมดำครบ 4 มุม · พิมพ์ขนาดจริง 100% (ห้ามย่อ)
            </Label>
            <Label x={22} y={276.4} width={90} size={7.5} color={BRAND} bold>
                fasttiw.com
            </Label>
            <Label x={40} y={276.4} width={90} size={7.5} color={MUTED}>
                แนวข้อสอบพร้อมเฉลยละเอียด
            </Label>
            <Label x={128} y={276.4} width={60} align="right" size={7.5} color={MUTED}>
                {`${code} · หน้า ${page}/${pages}`}
            </Label>
        </Page>
    );
}

/** ใบบอกวิธีฝนสำหรับทดสอบความแม่น (เฟส 0) — บอกว่าข้อไหนต้องฝนแบบไหน */
function TestPatternPages({ code, marks }: { code: string; marks: Mark[] }) {
    const perPage = 100;
    const chunks: Mark[][] = [];
    for (let i = 0; i < marks.length; i += perPage) chunks.push(marks.slice(i, i + perPage));
    return (
        <>
            {chunks.map((chunk, p) => (
                <Page key={p} size="A4" style={{ fontFamily: PDF_FONT_FAMILY, padding: pt(15) }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <PdfImage src={LOGO} style={{ width: pt(5.5 * LOGO_RATIO), height: pt(5.5) }} />
                        <Text style={{ fontSize: 12, fontWeight: "semibold", color: BRAND_DARK, marginLeft: 10 }}>
                            {toPdfThai(`ใบบอกวิธีฝน (ทดสอบความแม่น) — ${code}${chunks.length > 1 ? ` หน้า ${p + 1}` : ""}`)}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 8.5, color: "#475569", marginBottom: 8 }}>
                        {toPdfThai(
                            "ฝนลงกระดาษคำตอบตามนี้ทุกข้อ แล้วถ่ายรูปส่งเข้าหน้าทดสอบ ระบบจะเทียบผลอ่านกับรายการนี้ · \"ฝนจาง\" = กดดินสอเบาๆ · \"กากบาท\" = ขีด X ทับวง · \"ลบ\" = ฝนวงแรกแล้วลบด้วยยางลบก่อนฝนวงใหม่"
                        )}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {chunk.map((m, i) => (
                            <Text
                                key={i}
                                style={{
                                    width: "25%",
                                    fontSize: 8.5,
                                    paddingVertical: 1.6,
                                    color: m.kind === "single" ? "#334155" : "#b45309",
                                }}
                            >
                                {toPdfThai(`${p * perPage + i + 1}.  ${describeMark(m)}`)}
                            </Text>
                        ))}
                    </View>
                </Page>
            ))}
        </>
    );
}

export function AnswerSheetDocument({
    productName,
    code,
    pages,
    testMarks,
}: {
    productName: string;
    code: string;
    pages: AnswerSheetPage[];
    testMarks?: Mark[];
}) {
    return (
        <Document title={`กระดาษคำตอบ ${code}`} author="Fasttiw">
            {pages.map((layout, i) => (
                <SheetPage key={i} productName={productName} code={code} page={i + 1} pages={pages.length} layout={layout} />
            ))}
            {testMarks && <TestPatternPages code={code} marks={testMarks} />}
        </Document>
    );
}
