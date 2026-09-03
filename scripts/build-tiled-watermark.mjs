// สร้างภาพลายน้ำแบบ tile ซ้ำสำเร็จรูปไว้ล่วงหน้า (`public/logo/watermark-tiled.png`) ใช้กับ PDF export
// (`lib/pdf/ExamPdfDocument.tsx`) — รันสคริปต์นี้ครั้งเดียวตอน dev เท่านั้น ไม่ใช่ส่วนหนึ่งของ request path
// รันด้วย: node scripts/build-tiled-watermark.mjs
//
// เหตุผลที่ต้อง pre-composite ไว้ล่วงหน้าแทนวาง <PdfImage> หลายก้อนตอน render จริง: วัดจริงพบว่า
// react-pdf/pdfkit ไม่ dedupe รูปเดียวกันที่วางซ้ำหลายจุด แต่ละจุดที่วางถูกฝังข้อมูลภาพซ้ำใหม่ทุกครั้ง
// (ทดสอบกับชุดข้อสอบ 282 ข้อ ~26 หน้า: วาง 63 tiles/หน้าแบบแยกก้อน -> ไฟล์ผลลัพธ์ 29.8MB, render 48 วิ
// เปลี่ยนมาใช้ภาพ pre-composite ภาพเดียวที่สคริปต์นี้สร้าง -> ไฟล์เหลือ 3.6MB (88% เล็กลง), render 33 วิ
// (31% เร็วขึ้น) — ที่เหลือ ~25 วิ เป็นต้นทุนพื้นฐานของ react-pdf layout engine เองสำหรับเอกสารขนาดนี้)
//
// grid ที่สร้างจงใจให้ตำแหน่ง/ขนาด/ระยะห่างตรงกับ watermarkGrid/watermarkItem style เดิมใน
// ExamPdfDocument.tsx เป๊ะ (ก่อนจะถูกลบออกตอนเปลี่ยนมาใช้ภาพเดียวนี้) ผลลัพธ์ที่เห็นในหน้า PDF จึงเหมือนเดิม
// ทุกประการ — react-pdf ยังหมุนภาพนี้ทั้งก้อน -30deg เหมือนเดิม (ใน watermarkGrid) ไม่ต้องคำนวณการหมุนที่นี่
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "public", "logo", "watermark.png");
const OUT = path.join(__dirname, "..", "public", "logo", "watermark-tiled.png");

const CANVAS_W = 1000;
const CANVAS_H = 1300;
const TILE_W = 100;
const TILE_H = 31; // 100 / 3.242 = 30.8 ปัดขึ้น — สัดส่วนโลโก้ตาม brand kit ชุดปัจจุบัน (496:153)
const MARGIN_X = 20; // marginLeft/marginRight เดิม
const MARGIN_Y = 40; // คุมให้ CELL_H คง ~111 เท่าเดิม (11 แถว x 7 คอลัมน์ = 77 tiles)
const CELL_W = MARGIN_X + TILE_W + MARGIN_X; // 140
const CELL_H = MARGIN_Y + TILE_H + MARGIN_Y; // 112
const COLS = Math.floor(CANVAS_W / CELL_W); // 7
const OPACITY = 0.07;

async function main() {
    const tileRaw = await sharp(SRC).ensureAlpha().resize(TILE_W, TILE_H).raw().toBuffer({ resolveWithObject: true });
    // ลด alpha ทุกพิกเซลเหลือ 7% (แทนที่ opacity:0.07 ที่ react-pdf เคยใส่ให้ทีละ tile ตอน render)
    const { data, info } = tileRaw;
    for (let i = 3; i < data.length; i += info.channels) {
        data[i] = Math.round(data[i] * OPACITY);
    }
    const fadedTile = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .png()
        .toBuffer();

    const composites = [];
    for (let row = 0; row * CELL_H + CELL_H <= CANVAS_H; row++) {
        for (let col = 0; col < COLS; col++) {
            composites.push({ input: fadedTile, left: col * CELL_W + MARGIN_X, top: row * CELL_H + MARGIN_Y });
        }
    }

    await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(composites)
        .png()
        .toFile(OUT);

    console.log(`วางไป ${composites.length} tiles (grid ${COLS} คอลัมน์) -> ${OUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
