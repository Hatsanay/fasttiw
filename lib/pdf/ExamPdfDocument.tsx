// ตั้งชื่อ import ว่า PdfImage (ไม่ใช้ชื่อ Image ตรงๆ) เพราะ eslint-plugin-jsx-a11y จะเข้าใจผิดว่าเป็น
// <img>/next-image ธรรมดาแล้วเรียกร้อง alt prop ทั้งที่จริงเป็นคนละ component กัน (ของ @react-pdf/renderer
// สำหรับ render ลง PDF ไม่มี/ไม่ต้องมี alt)
import { Document, Page, Text, View, Image as PdfImage, StyleSheet, Font } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// react-pdf ไม่ผ่าน Next.js font loader เลย (คนละ render pipeline) ต้องลงทะเบียนไฟล์ฟอนต์ตรงๆ เอง
// เหมือนที่ opengraph-image.tsx ทำไว้แล้ว — ต้องมี glyph ไทยฝังในไฟล์ ใช้ next/font/google ไม่ได้
Font.register({
    family: "Kanit",
    fonts: [
        { src: join(process.cwd(), "app/assets/Kanit-Regular.ttf"), fontWeight: "normal" },
        { src: join(process.cwd(), "app/assets/Kanit-SemiBold.ttf"), fontWeight: "semibold" },
    ],
});

const THAI_CHOICE_LETTERS = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ"];

const styles = StyleSheet.create({
    page: { fontFamily: "Kanit", fontSize: 11, paddingTop: 50, paddingBottom: 50, paddingHorizontal: 45, color: "#1e293b" },

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
    watermarkLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" },
    watermarkGrid: {
        position: "absolute",
        top: -220,
        left: -220,
        width: 1000,
        height: 1300,
        transform: "rotate(-30deg)",
    },

    header: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: "#1D4ED8", borderBottomStyle: "solid" },
    brandText: { fontSize: 9, fontWeight: "semibold", color: "#1D4ED8", letterSpacing: 1, marginBottom: 10 },
    title: { fontSize: 16, fontWeight: "semibold", color: "#0f172a" },
    meta: { fontSize: 9, color: "#64748b", marginTop: 4 },

    question: { marginBottom: 16 },
    questionRow: { flexDirection: "row" },
    questionNumber: { fontSize: 11, fontWeight: "semibold", color: "#1D4ED8", width: 22 },
    questionText: { fontSize: 11, flex: 1, lineHeight: 1.5 },
    questionImage: { width: 260, height: 150, marginTop: 6, marginBottom: 8, marginLeft: 22, objectFit: "contain" },

    choiceRow: { flexDirection: "row", marginLeft: 22, marginBottom: 5 },
    choiceLetter: { fontSize: 10, fontWeight: "semibold", color: "#475569", width: 16 },
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
    explanationLabel: { fontSize: 9, fontWeight: "semibold", color: "#1D4ED8", marginBottom: 2 },
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
    ques_image: Buffer | null;
    choices: { cho_id: string; cho_text: string; cho_image: Buffer | null }[];
    reveal: {
        correct_choice_id: string | null;
        explanation: string | null;
        choice_reasons: { cho_id: string; is_correct: boolean; wrong_reason: string | null }[];
    } | null;
};

export function ExamPdfDocument({
    productName,
    questions,
    watermarkTiledImage,
}: {
    productName: string;
    questions: ExportPdfQuestion[];
    watermarkTiledImage: Buffer;
}) {
    return (
        <Document title={`แนวข้อสอบ ${productName}`}>
            <Page size="A4" style={styles.page} wrap>
                <View style={styles.watermarkLayer} fixed>
                    <View style={styles.watermarkGrid}>
                        <PdfImage src={watermarkTiledImage} style={{ width: 1000, height: 1300 }} />
                    </View>
                </View>

                <View style={styles.header}>
                    <Text style={styles.brandText}>FASTTIW.COM</Text>
                    <Text style={styles.title}>แนวข้อสอบ {productName}</Text>
                    <Text style={styles.meta}>
                        จำนวน {questions.length} ข้อ — ใช้สำหรับฝึกทำเท่านั้น ดูเฉลยและวิธีคิดทีละขั้นตอนได้ที่เว็บไซต์
                    </Text>
                </View>

                {questions.map((q, i) => (
                    <View key={q.ques_id} style={styles.question} wrap={false}>
                        <View style={styles.questionRow}>
                            <Text style={styles.questionNumber}>{i + 1}.</Text>
                            <Text style={styles.questionText}>{q.ques_text}</Text>
                        </View>
                        {q.ques_image && <PdfImage src={q.ques_image} style={styles.questionImage} />}
                        {q.choices.map((c, ci) => {
                            const reason = q.reveal?.choice_reasons.find((r) => r.cho_id === c.cho_id);
                            const isCorrect = !!reason?.is_correct;
                            return (
                                <View key={c.cho_id} style={styles.choiceRow}>
                                    <Text style={[styles.choiceLetter, isCorrect ? styles.choiceLetterCorrect : undefined]}>
                                        {THAI_CHOICE_LETTERS[ci] ?? ci + 1}.
                                    </Text>
                                    <View style={styles.choiceBody}>
                                        <Text style={[styles.choiceText, isCorrect ? styles.choiceTextCorrect : undefined]}>
                                            {c.cho_text}
                                            {isCorrect ? "  ✓ คำตอบที่ถูกต้อง" : ""}
                                        </Text>
                                        {c.cho_image && <PdfImage src={c.cho_image} style={styles.choiceImage} />}
                                        {reason && !reason.is_correct && reason.wrong_reason && (
                                            <Text style={styles.wrongReason}>✗ {reason.wrong_reason}</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                        {q.reveal?.explanation && (
                            <View style={styles.explanationBox}>
                                <Text style={styles.explanationLabel}>วิธีคิด</Text>
                                <Text style={styles.explanationText}>{q.reveal.explanation}</Text>
                            </View>
                        )}
                    </View>
                ))}

                <Text
                    style={styles.footer}
                    fixed
                    render={({ pageNumber, totalPages }) => `Fasttiw.com — แนวข้อสอบพร้อมเฉลยละเอียด  |  หน้า ${pageNumber}/${totalPages}`}
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
