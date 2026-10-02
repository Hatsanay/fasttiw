// ตั้งชื่อ import ว่า PdfImage (ไม่ใช้ชื่อ Image ตรงๆ) เพราะ eslint-plugin-jsx-a11y จะเข้าใจผิดว่าเป็น
// <img>/next-image ธรรมดาแล้วเรียกร้อง alt prop ทั้งที่จริงเป็นคนละ component กัน (ของ @react-pdf/renderer
// สำหรับ render ลง PDF ไม่มี/ไม่ต้องมี alt)
import {
  Document,
  Page,
  Text,
  View,
  Image as PdfImage,
  StyleSheet,
} from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toPdfThai } from "./thaiText";
import { PDF_FONT_FAMILY } from "./fonts";
// ข้อความที่อาจมีสูตรคณิตผ่าน PdfMathText ทุกจุด — react-pdf เรนเดอร์ HTML ของ KaTeX ไม่ได้ (ดู mathText.ts / PdfMathText.tsx)
import { PdfMathText } from "./PdfMathText";
import { hasScoring, formatScore } from "../scoring";

// ฟอนต์ (Kanit + ฟอนต์สำรองของ KaTeX สำหรับเครื่องหมายพิเศษ) ลงทะเบียนที่ lib/pdf/fonts.ts ใช้ร่วมกับกระดาษคำตอบ

const THAI_CHOICE_LETTERS = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ"];

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 11,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 45,
    color: "#1e293b",
  },

  // ลายน้ำ: วางกริดลายจางๆ ในกล่องที่ใหญ่กว่าหน้ากระดาษมาก แล้วหมุนเอียง 30 องศา ให้แน่ใจว่าหลังหมุนแล้ว
  // ยังคลุมทุกมุมของหน้า A4 (595x842pt) ไม่มีช่องว่าง — fixed ทำให้ซ้ำทุกหน้าอัตโนมัติ
  //
  // เดิมวาง <PdfImage> โลโก้จางๆ 63 ก้อนแยกกันในกริดนี้ (ผ่าน flexWrap) แล้วให้ react-pdf จัด layout เอง —
  // วัดจริงพบว่า react-pdf/pdfkit ไม่ dedupe รูปเดียวกันที่วางซ้ำหลายจุด แต่ละจุดฝังข้อมูลภาพซ้ำใหม่ทุกครั้ง
  // (ชุดข้อสอบ 282 ข้อ ~26 หน้า: 63 tiles/หน้า -> ไฟล์ 29.8MB, render 48 วิ / เปลี่ยนมาใช้ภาพ pre-composite
  // ภาพเดียว -> ไฟล์ 3.6MB, render 33 วิ) จึงเปลี่ยนมาใช้ `watermark-tiled.png` (สร้างล่วงหน้าครั้งเดียวด้วย
  // `scripts/build-tiled-watermark.mjs` ไม่ใช่ตอน render จริง — รันสคริปต์นั้นใหม่ถ้าจะเปลี่ยนโลโก้ต้นฉบับ)
  // ที่มี pattern เหมือนเดิมทุกประการ ฝังภาพแค่ 1 จุดต่อหน้าแทน 63 จุด ผลลัพธ์ที่เห็นเหมือนเดิมเป๊ะ แค่เร็ว
  // ขึ้น+ไฟล์เล็กลงมาก
  watermarkLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  watermarkGrid: {
    position: "absolute",
    top: -220,
    left: -220,
    width: 1000,
    height: 1300,
    transform: "rotate(-30deg)",
  },

  header: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1D4ED8",
    borderBottomStyle: "solid",
  },
  brandText: {
    fontSize: 9,
    fontWeight: "semibold",
    color: "#1D4ED8",
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "semibold", color: "#0f172a" },
  badge: {
    fontSize: 14,
    fontWeight: "semibold",
    color: "#ea580c",
    marginBottom: 4,
  },
  meta: { fontSize: 9, color: "#64748b", marginTop: 4 },

  question: { marginBottom: 16 },
  questionRow: { flexDirection: "row" },
  questionNumber: {
    fontSize: 11,
    fontWeight: "semibold",
    color: "#1D4ED8",
    width: 22,
  },
  questionText: { fontSize: 11, flex: 1, lineHeight: 1.5 },
  // คะแนนรายข้อวางชิดขวาของบรรทัดโจทย์ ไม่ตั้ง flex เพื่อให้กว้างเท่าเนื้อหาจริง (โจทย์ยังกิน flex:1 เหมือนเดิม)
  questionScore: {
    fontSize: 9,
    color: "#64748b",
    marginLeft: 6,
    marginTop: 1.5,
  },
  questionImage: {
    width: 260,
    height: 150,
    marginTop: 6,
    marginBottom: 8,
    marginLeft: 22,
    objectFit: "contain",
  },

  choiceRow: { flexDirection: "row", marginLeft: 22, marginBottom: 5 },
  choiceLetter: {
    fontSize: 10,
    fontWeight: "semibold",
    color: "#475569",
    width: 16,
  },
  choiceLetterCorrect: { color: "#15803d" },
  choiceBody: { flex: 1 },
  choiceText: { fontSize: 10, lineHeight: 1.4, color: "#334155" },
  choiceTextCorrect: { fontWeight: "semibold", color: "#15803d" },
  choiceImage: { width: 90, height: 60, marginTop: 3, objectFit: "contain" },
  wrongReason: { fontSize: 9, lineHeight: 1.4, color: "#b91c1c", marginTop: 2 },

  explanationBox: {
    marginLeft: 22,
    marginTop: 6,
    padding: 8,
    backgroundColor: "#eff6ff",
    borderLeftWidth: 2,
    borderLeftColor: "#1D4ED8",
    borderLeftStyle: "solid",
  },
  explanationLabel: {
    fontSize: 9,
    fontWeight: "semibold",
    color: "#1D4ED8",
    marginBottom: 2,
  },
  explanationText: { fontSize: 9.5, lineHeight: 1.5, color: "#1e3a8a" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 45,
    right: 45,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 8,
  },
});

// รูปภาพเป็น Buffer ที่แปลงเป็น PNG มาเรียบร้อยแล้ว (ทำใน route.tsx ก่อนเรียก component นี้) เพราะรูปที่
// อัปโหลดจริงในระบบเป็น .webp ทั้งหมด แต่ @react-pdf/image รู้จักแค่ jpg/png/svg เท่านั้น — ถ้าส่ง URL ตรงๆ
// ให้ react-pdf ไปดึงเองจะ fail เงียบๆ (แค่ console.warn ไม่โยน error) ทำให้รูปหายไปจาก PDF โดยไม่รู้ตัว
export type ExportPdfQuestion = {
  ques_id: string;
  ques_text: string;
  ques_score: string | number | null;
  ques_image: Buffer | null;
  choices: { cho_id: string; cho_text: string; cho_image: Buffer | null }[];
  reveal: {
    correct_choice_id: string | null;
    explanation: string | null;
    choice_reasons: {
      cho_id: string;
      is_correct: boolean;
      wrong_reason: string | null;
    }[];
  } | null;
};

// ── กันข้อที่ยาวเกินหนึ่งหน้า (2026-10-02 ผู้ใช้เจอข้อความซ้อนกันใน PDF) ──────────────────────────────────
// เดิมทุกข้อเป็น wrap={false} (โจทย์+ตัวเลือก+วิธีคิดอยู่หน้าเดียวกันเสมอ) แต่ข้อที่ยาวเกินหนึ่งหน้า (บทอ่านยาว +
// วิธีคิดยาว) react-pdf ทำตามไม่ได้ — ขึ้นเตือน "can't wrap between pages and it's bigger than available page height"
// แล้วจัดตำแหน่งเพี้ยน ข้อความซ้อนกัน **และพาข้ออื่นในไฟล์เดียวกันเพี้ยนตามไปด้วย** (ทำซ้ำได้: _perf-tmp/pdf-overlap-*)
// react-pdf ไม่บอกความสูงจริงก่อนวาด จึงประมาณเองแบบเผื่อ (นับบรรทัดเกินไว้) แล้วเลือก:
//   ทั้งข้อพอดีหน้า → wrap={false} ทั้งก้อนเหมือนเดิม (ข้อเกือบทั้งหมด หน้าตาไม่เปลี่ยน)
//   ไม่พอดี → โจทย์+ตัวเลือกยังติดกัน (ถ้าพอดีหน้า) ส่วนกล่องวิธีคิดไหลข้ามหน้าได้
// ⚠ ห้ามกลับไปใส่ wrap={false} ให้ก้อนที่อาจสูงเกินหน้า
const PAGE_CONTENT_HEIGHT = 842 - 50 - 50; // A4 ลบ paddingTop/Bottom ของ styles.page
const FIT_HEIGHT = PAGE_CONTENT_HEIGHT - 60; // เผื่อความคลาดเคลื่อนของการประมาณ

/** จำนวนบรรทัดโดยประมาณ — นับเกินไว้ก่อน (ไทยมีสระ/วรรณยุกต์ที่ไม่กินที่ แต่ถูกนับเป็นตัวอักษร) · เศษส่วนสูงราว 2 บรรทัด */
function estimateLines(
  text: string | null | undefined,
  charsPerLine: number,
): number {
  if (!text) return 0;
  const fractions = (text.match(/\\frac/g) ?? []).length;
  return (
    text
      .split("\n")
      .reduce(
        (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
        0,
      ) + fractions
  );
}

function estimateHeights(q: ExportPdfQuestion): {
  stem: number;
  explanation: number;
} {
  let stem = estimateLines(q.ques_text, 70) * 16.5 + (q.ques_image ? 164 : 0);
  for (const c of q.choices) {
    const reason = q.reveal?.choice_reasons.find((r) => r.cho_id === c.cho_id);
    stem += estimateLines(c.cho_text, 85) * 14 + 5 + (c.cho_image ? 63 : 0);
    if (reason && !reason.is_correct && reason.wrong_reason)
      stem += estimateLines(reason.wrong_reason, 95) * 12.6 + 2;
  }
  const explanation = q.reveal?.explanation
    ? estimateLines(q.reveal.explanation, 90) * 14.25 + 34
    : 0;
  return { stem: stem + 16, explanation };
}

export function ExamPdfDocument({
  productName,
  totalScore,
  questions,
  watermarkTiledImage,
  formCode,
  formNote,
  badge,
}: {
  productName: string;
  // รหัสใบสอบกระดาษ (ระบบสอบกระดาษ) — มีค่า = ชุดข้อสอบที่พิมพ์คู่กับกระดาษคำตอบ บอกรหัสให้เทียบว่าเป็นคู่เดียวกัน
  formCode?: string;
  // ข้อความกำกับแทนประโยคเรื่องรหัสใบสอบ — ชุดข้อสอบของกลุ่มใช้ร่วมกันหลายใบ จึงบอกวิธีจับคู่กับกระดาษคำตอบเอง
  formNote?: string;
  // ป้ายตัวใหญ่เหนือชื่อชุด เช่น "ชุด B" / ชื่อเจ้าของชุดข้อสอบ — คนแจกกระดาษเห็นได้ทันที
  badge?: string;
  // null = ชุดนี้ไม่ใช้ระบบคะแนน — PDF จะไม่พิมพ์อะไรเกี่ยวกับคะแนนเลย หน้าตาเหมือนเดิมทุกประการ
  totalScore: string | number | null;
  questions: ExportPdfQuestion[];
  watermarkTiledImage: Buffer;
}) {
  const scored = hasScoring(totalScore);
  return (
    <Document title={`แนวข้อสอบ ${productName}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.watermarkLayer} fixed>
          <View style={styles.watermarkGrid}>
            <PdfImage
              src={watermarkTiledImage}
              style={{ width: 1000, height: 1300 }}
            />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.brandText}>FASTTIW.COM</Text>
          {badge && <Text style={styles.badge}>{toPdfThai(badge)}</Text>}
          <Text style={styles.title}>
            {toPdfThai(`แนวข้อสอบ ${productName}`)}
          </Text>
          <Text style={styles.meta}>
            {toPdfThai(
              `จำนวน ${questions.length} ข้อ${scored ? ` · คะแนนเต็ม ${formatScore(totalScore)} คะแนน` : ""}` +
                (formNote
                  ? ` · ${formNote}`
                  : formCode
                    ? ` · ใบสอบ ${formCode} — ฝนคำตอบในกระดาษคำตอบรหัสเดียวกัน แล้วถ่ายรูปให้ระบบตรวจ`
                    : ` — ใช้สำหรับฝึกทำเท่านั้น ดูเฉลยและวิธีคิดทีละขั้นตอนได้ที่เว็บไซต์`),
            )}
          </Text>
        </View>

        {questions.map((q, i) => {
          const h = estimateHeights(q);
          const wholeFits = h.stem + h.explanation <= FIT_HEIGHT;
          const stemFits = h.stem <= FIT_HEIGHT;
          return (
            <View key={q.ques_id} style={styles.question} wrap={!wholeFits}>
              <View wrap={!stemFits}>
                <View style={styles.questionRow}>
                  <Text style={styles.questionNumber}>{i + 1}.</Text>
                  <PdfMathText style={styles.questionText} text={q.ques_text} />
                  {scored && (
                    <Text style={styles.questionScore}>
                      {toPdfThai(`(${formatScore(q.ques_score)} คะแนน)`)}
                    </Text>
                  )}
                </View>
                {q.ques_image && (
                  <PdfImage src={q.ques_image} style={styles.questionImage} />
                )}
                {q.choices.map((c, ci) => {
                  const reason = q.reveal?.choice_reasons.find(
                    (r) => r.cho_id === c.cho_id,
                  );
                  const isCorrect = !!reason?.is_correct;
                  return (
                    <View key={c.cho_id} style={styles.choiceRow}>
                      <Text
                        style={[
                          styles.choiceLetter,
                          isCorrect ? styles.choiceLetterCorrect : undefined,
                        ]}
                      >
                        {THAI_CHOICE_LETTERS[ci] ?? ci + 1}.
                      </Text>
                      <View style={styles.choiceBody}>
                        <PdfMathText
                          style={[
                            styles.choiceText,
                            isCorrect ? styles.choiceTextCorrect : undefined,
                          ]}
                          text={`${c.cho_text}${isCorrect ? "  ✓ คำตอบที่ถูกต้อง" : ""}`}
                        />
                        {c.cho_image && (
                          <PdfImage
                            src={c.cho_image}
                            style={styles.choiceImage}
                          />
                        )}
                        {reason &&
                          !reason.is_correct &&
                          reason.wrong_reason && (
                            <PdfMathText
                              style={styles.wrongReason}
                              text={`✗ ${reason.wrong_reason}`}
                            />
                          )}
                      </View>
                    </View>
                  );
                })}
              </View>
              {q.reveal?.explanation && (
                <View style={styles.explanationBox}>
                  {/* minPresenceAhead: ไม่ทิ้งหัว "วิธีคิด" ไว้ท้ายหน้าเดี่ยวๆ ตอนกล่องไหลข้ามหน้า */}
                  <Text style={styles.explanationLabel} minPresenceAhead={30}>
                    วิธีคิด
                  </Text>
                  <PdfMathText
                    style={styles.explanationText}
                    text={q.reveal.explanation}
                  />
                </View>
              )}
            </View>
          );
        })}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Fasttiw.com — แนวข้อสอบพร้อมเฉลยละเอียด  |  หน้า ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

// watermark-tiled.png คือ pattern โลโก้จางๆ (opacity 7%) แบบ pre-composite ไว้ล่วงหน้าเป็นภาพแบนภาพเดียว
// (grid 7 คอลัมน์ครอบคลุมพื้นที่ 1000x1300 — สร้างจาก watermark.png ต้นฉบับผ่าน sharp ครั้งเดียว ไม่ใช่
// ตอน render จริง) แทนที่จะวาง <PdfImage> 63 ก้อนแยกกันแล้วให้ react-pdf จัด layout เอง ดูเหตุผลเต็มๆ ที่
// comment ของ watermarkGrid ด้านบน
export function loadWatermarkTiledImage(): Buffer {
  return readFileSync(join(process.cwd(), "public/logo/watermark-tiled.png"));
}
