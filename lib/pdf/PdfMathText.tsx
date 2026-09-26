import type { ReactNode } from "react";
import { Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { toPdfThai } from "./thaiText";
import { mathToPdfText, hasPdfFraction, parsePdfMathLine, type PdfMathNode } from "./mathText";

// ข้อความใน PDF ที่อาจมีสูตรคณิต — ใช้แทน <Text>{toPdfThai(mathToPdfText(x))}</Text> ทุกจุด (2026-09-26)
//
// **ข้อความที่ไม่มีเศษส่วน = <Text> ตัวเดิมเป๊ะ** ข้อสอบเกือบทั้งหมดได้ PDF หน้าตาเหมือนเดิมทุกประการ
//
// บรรทัดที่มีเศษส่วน: react-pdf วางกล่องแทรกกลาง <Text> ไม่ได้ จึงประกอบบรรทัดเองเป็นแถวที่ขึ้นบรรทัดใหม่ได้
// (flexWrap) จากชิ้นเล็กๆ — คำไทยทีละคำ (ตัดคำด้วย Intl.Segmenter ให้ขึ้นบรรทัดใหม่ตรงรอยต่อคำ ไม่ใช่กลางคำ)
// สลับกับกล่องเศษส่วน (ตัวเศษ / เส้น / ตัวส่วน) ขนาดตัวอักษรเท่าข้อความรอบๆ ตามที่ผู้ใช้ขอ
// ช่องว่างวาดเป็นกล่องเปล่าแทนตัวอักษรเว้นวรรค เพราะ react-pdf ตัดเว้นวรรคที่อยู่ต้น/ท้าย <Text> ทิ้ง

type StyleInput = Style | (Style | undefined)[] | undefined;

// style ที่เป็นเรื่อง "ตำแหน่งของทั้งก้อน" ย้ายไปไว้ที่กล่องนอก ที่เหลือ (ฟอนต์ สี ขนาด) ใส่ให้ทุกชิ้นข้อความ
const LAYOUT_KEYS = ["flex", "width", "marginTop", "marginBottom", "marginLeft", "marginRight"] as const;

function flatten(style: StyleInput): Style {
    if (!style) return {};
    return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
}

const thaiWords = (() => {
    try {
        const segmenter = new Intl.Segmenter("th", { granularity: "word" });
        return (s: string) => [...segmenter.segment(s)].map((x) => x.segment);
    } catch {
        // เผื่อ Node ที่ไม่มีข้อมูลภาษาไทย (ICU ไม่ครบ) — ตัดตามเว้นวรรคแทน ยังขึ้นบรรทัดได้ แค่ตัดหยาบกว่า
        return (s: string) => s.split(/(\s+)/).filter(Boolean);
    }
})();

function renderNodes(nodes: PdfMathNode[], textStyle: Style, splitWords: boolean, key: string): ReactNode[] {
    const fontSize = typeof textStyle.fontSize === "number" ? textStyle.fontSize : 11;
    return nodes.flatMap((node, n) => {
        const k = `${key}-${n}`;
        if (node.type === "text") {
            const pieces = splitWords ? thaiWords(node.value) : [node.value];
            return pieces.map((piece, p) =>
                /^\s+$/.test(piece) ? (
                    <View key={`${k}-${p}`} style={{ width: fontSize * 0.28 }} />
                ) : (
                    <Text key={`${k}-${p}`} style={textStyle}>{toPdfThai(piece)}</Text>
                )
            );
        }
        // เศษส่วน: บรรทัดของตัวเศษ/ตัวส่วนแน่นกว่าข้อความปกติ ไม่งั้นกล่องสูงเกินจนดันบรรทัดห่าง
        const inner: Style = { ...textStyle, lineHeight: 1.15 };
        return [
            <View key={k} style={{ alignItems: "center", marginHorizontal: fontSize * 0.2 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>{renderNodes(node.num, inner, false, `${k}n`)}</View>
                <View style={{ alignSelf: "stretch", height: 0.7, marginTop: fontSize * 0.16, marginBottom: 0.8, backgroundColor: (textStyle.color as string) ?? "#1e293b" }} />
                {/* ดึงตัวส่วนขึ้น — Kanit เผื่อที่เหนือตัวเลขไว้ให้สระ/วรรณยุกต์ไทย (ascent 1.1em แต่ตัวเลขสูงแค่ 0.64em)
                    ไม่ดึงแล้วตัวเศษชิดเส้นแต่ตัวส่วนห่างเส้นมาก ดูเหมือนเศษส่วนแยกเป็นสองท่อน */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: -fontSize * 0.28 }}>{renderNodes(node.den, inner, false, `${k}d`)}</View>
            </View>,
        ];
    });
}

export function PdfMathText({ text, style }: { text: string | null | undefined; style?: StyleInput }) {
    const value = text ?? "";
    if (!hasPdfFraction(value)) {
        return <Text style={style}>{toPdfThai(mathToPdfText(value))}</Text>;
    }

    const all = flatten(style);
    const container: Style = {};
    const textStyle: Style = { ...all };
    for (const key of LAYOUT_KEYS) {
        if (key in all) {
            (container as Record<string, unknown>)[key] = all[key];
            delete (textStyle as Record<string, unknown>)[key];
        }
    }

    return (
        <View style={container}>
            {value.split("\n").map((line, i) =>
                hasPdfFraction(line) ? (
                    <View key={i} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
                        {renderNodes(parsePdfMathLine(line), textStyle, true, `l${i}`)}
                    </View>
                ) : (
                    // บรรทัดว่างใส่เว้นวรรคไว้ ไม่งั้นความสูงเป็นศูนย์ ย่อหน้าที่เว้นบรรทัดไว้จะติดกัน
                    <Text key={i} style={textStyle}>{toPdfThai(mathToPdfText(line)) || " "}</Text>
                )
            )}
        </View>
    );
}
