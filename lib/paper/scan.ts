import jsQR from "jsqr";
import { QUESTIONS_PER_PAGE, decodeSheetId, pageSlots, paginate, type SheetId } from "./layout";
import { RECTIFY_PX_PER_MM, cropMm, grayToRgba, locateSheet, readSheet, toGray, type GrayImage, type QuestionReading } from "./omr";
import type { Point } from "./layout";

// ขั้นตอนอ่านรูปกระดาษคำตอบในเบราว์เซอร์ — ใช้ร่วมกันระหว่างหน้าสแกนจริง (/exam/paper/forms/[code]) กับหน้าแล็บ
// รูป → ภาพขาวดำ → หาแผ่น+ดึงตรง → อ่าน QR (รู้ว่าใบสอบไหน หน้าไหน) → อ่านวงตามผังของใบสอบนั้น
// รูปไม่ออกจากเครื่องลูกค้า — ที่ส่งขึ้น server มีแค่คำตอบ + ภาพที่ดึงตรงแล้ว (rectToJpeg)

// รูปจากมือถือรุ่นใหม่ 48-200MP ใหญ่เกินจำเป็นมาก (กระดาษ A4 เต็มเฟรม 4000px ≈ 14 px/มม. ส่วนผังอ่านที่ 5 px/มม.)
// ย่อก่อนเพื่อไม่ให้หน่วยความจำมือถือเต็ม — รูป 12MP (4000×3000) ทั่วไปไม่ถูกย่อ ผลอ่านจึงเหมือนตอนวัดความแม่น
const MAX_SIDE = 4000;

export async function loadGray(file: Blob): Promise<GrayImage> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const { data } = ctx.getImageData(0, 0, width, height);
    return toGray(data, width, height);
}

export type LocatedPage = { ok: true; id: SheetId; rect: GrayImage } | { ok: false; reason: string; detail?: string };

/** เฟรมปัจจุบันของกล้อง → ภาพขาวดำ (ย่อให้ด้านยาวไม่เกิน maxSide) · canvas ส่งมาใช้ซ้ำ ไม่สร้างใหม่ทุกเฟรม */
export function grayFromVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement, maxSide = Infinity): GrayImage {
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, width, height);
    return toGray(ctx.getImageData(0, 0, width, height).data, width, height);
}

/** หาแผ่น + อ่าน QR — อ่าน QR ไม่ได้ = ปฏิเสธทั้งแผ่น (ไม่รู้ว่าเป็นแผ่นไหน หน้าไหน ห้ามเดาผัง) */
export async function locatePage(file: Blob): Promise<LocatedPage> {
    return locateGray(await loadGray(file));
}

/** เหมือน locatePage แต่รับภาพขาวดำที่มีอยู่แล้ว (เฟรมจากกล้องสด) */
export function locateGray(img: GrayImage): LocatedPage {
    const located = locateSheet(img);
    if (!located.ok) return { ok: false, reason: located.reason, detail: "detail" in located ? located.detail : undefined };
    const qr = jsQR(grayToRgba(located.qrImage), located.qrImage.width, located.qrImage.height);
    const id = qr ? decodeSheetId(qr.data) : null;
    if (!id) return { ok: false, reason: "อ่าน QR ที่มุมขวาบนไม่ได้ — ถ่ายใหม่ให้ QR ชัด ไม่มีเงาหรือแสงสะท้อน" };
    return { ok: true, id, rect: located.rect };
}

/** ข้อความที่ลูกค้าเห็นเมื่อกระดาษโค้ง/ยับเกินกว่าจะจัดตำแหน่งวงได้ (omr.ts alignSlots) */
export const CURLED_PAPER_REASON = "กระดาษโค้งหรือยับเกินไป — วางกระดาษให้เรียบบนโต๊ะ (กดขอบให้แนบ) แล้วถ่ายใหม่";

/**
 * อ่านวงของหน้าหนึ่ง — choiceCounts คือจำนวนวงของทุกข้อทั้งใบ (จากใบสอบ) · null = ไม่มีหน้านี้
 * problem ไม่ใช่ null = ต้องปฏิเสธทั้งหน้า ห้ามใช้ readings (กระดาษโค้งจนหาวงที่พิมพ์ไว้ไม่เจอในระยะที่ปลอดภัย)
 */
export function readPage(rect: GrayImage, choiceCounts: number[], page: number): { readings: QuestionReading[]; problem: string | null } | null {
    const layout = paginate(choiceCounts)[page - 1];
    if (!layout) return null;
    return readSheet(rect, RECTIFY_PX_PER_MM, pageSlots(layout.choiceCounts, layout.firstNumber));
}

/** ภาพขาวดำที่ดึงตรงแล้ว → JPEG สำหรับส่งเก็บ (~150-250KB ต่อหน้า) */
export function grayToJpeg(img: GrayImage, quality = 0.8): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d")!.putImageData(new ImageData(grayToRgba(img), img.width, img.height), 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("แปลงภาพไม่สำเร็จ"))), "image/jpeg", quality));
}

/** ตัดภาพแถวของข้อหนึ่ง (เลขข้อ + วงทั้งหมด) ไว้ให้ลูกค้าดูตอนยืนยันข้อที่ระบบอ่านไม่ชัด */
export function cropQuestionRow(rect: GrayImage, choiceCounts: number[], number: number, shift: Point = { x: 0, y: 0 }): GrayImage | null {
    const page = Math.ceil(number / QUESTIONS_PER_PAGE);
    const layout = paginate(choiceCounts)[page - 1];
    if (!layout) return null;
    const slot = pageSlots(layout.choiceCounts, layout.firstNumber)[number - layout.firstNumber];
    if (!slot) return null;
    const last = slot.bubbles[slot.bubbles.length - 1];
    // เลื่อนตามที่จัดตำแหน่งเฉพาะที่ตอนอ่าน (กระดาษโค้ง) — ภาพที่ลูกค้าเห็นต้องเป็นแถวเดียวกับที่ระบบอ่านจริง
    const x = slot.numberAt.x - 9 + shift.x;
    return cropMm(rect, RECTIFY_PX_PER_MM, x, slot.numberAt.y - 4 + shift.y, last.x + 4.5 - (slot.numberAt.x - 9), 8);
}
