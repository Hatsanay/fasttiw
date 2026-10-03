/// <reference lib="webworker" />
import { FIDUCIALS } from "./layout";
import { RECTIFY_PX_PER_MM, findFiducials, grayToRgba, homography, lightingScore, rectify, toGray, type GrayImage } from "./omr";
import { MAX_SIDE, locateGray, readPage } from "./scan";
import type { ScanRequest, ScanResponse } from "./scanWorker";

// Web Worker ของตัวอ่านกระดาษคำตอบ — งานหนักทั้งหมด (หาแผ่น / QR / อ่านวง / หากระดาษในเฟรมกล้อง) ทำที่นี่
// เธรดหลักจึงว่างวาดจอ/ตอบสนองการแตะได้ตลอด (เดิมจอค้าง ~1-2 วิต่อหน้าบนมือถือ)
// **ใช้ฟังก์ชันชุดเดียวกับเธรดหลักเป๊ะ** (omr.ts / scan.ts) — ผลอ่านต้องเหมือนกันทุกบิต ไม่มีตัวอ่านฉบับที่สอง
// ผู้เรียก: lib/paper/scanWorker.ts (ถอยไปทำบนเธรดหลักเองถ้า worker ใช้ไม่ได้)

declare const self: DedicatedWorkerGlobalScope;

/** "UNSUPPORTED" = เครื่องนี้ทำงานนี้ใน worker ไม่ได้ (ไม่มี OffscreenCanvas) — ฝั่งเรียกทำบนเธรดหลักแทน */
class Unsupported extends Error {
    constructor() {
        super("UNSUPPORTED");
    }
}

/** รูป → ภาพขาวดำ (ย่อด้านยาวไม่เกิน MAX_SIDE) — เหมือน loadGray ใน scan.ts แต่ใช้ OffscreenCanvas */
async function decode(file: Blob): Promise<GrayImage> {
    if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") throw new Unsupported();
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Unsupported();
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return toGray(ctx.getImageData(0, 0, width, height).data, width, height);
}

/** ภาพที่ดึงตรงแล้ว → JPEG (เหมือน grayToJpeg ใน scan.ts) · null = เครื่องนี้ทำใน worker ไม่ได้ ให้เธรดหลักทำ */
async function encodeJpeg(img: GrayImage, quality = 0.8): Promise<Blob | null> {
    if (typeof OffscreenCanvas === "undefined") return null;
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof canvas.convertToBlob !== "function") return null;
    ctx.putImageData(new ImageData(grayToRgba(img), img.width, img.height), 0, 0);
    return canvas.convertToBlob({ type: "image/jpeg", quality });
}

async function handle(req: ScanRequest): Promise<{ result: unknown; transfer: Transferable[] }> {
    switch (req.op) {
        case "locateFile":
        case "locateGray": {
            const img = req.op === "locateFile" ? await decode(req.file) : req.img;
            const located = locateGray(img);
            return { result: located, transfer: located.ok ? [located.rect.data.buffer] : [] };
        }
        case "analyze": {
            const read = readPage(req.rect, req.choiceCounts, req.page);
            const shadow = lightingScore(req.rect, RECTIFY_PX_PER_MM);
            // JPEG สำหรับส่งเก็บ — ทำเฉพาะหน้าที่อ่านผ่าน (หน้าที่ถูกปฏิเสธไม่ถูกส่ง)
            const jpeg = read && !read.problem ? await encodeJpeg(req.rect).catch(() => null) : null;
            return { result: { read, shadow, jpeg }, transfer: [] };
        }
        case "detect": {
            const found = findFiducials(req.img);
            if (!found.ok) return { result: { corners: null, lighting: null }, transfer: [] };
            // เงาทับกระดาษ? ดึงภาพตรงหยาบๆ (2 px/มม.) แล้ววัดความสม่ำเสมอของแสง — เฉพาะตอนผู้เรียกขอ (เริ่มถือนิ่งแล้ว)
            const lighting = req.withLighting ? lightingScore(rectify(req.img, homography(FIDUCIALS, found.corners), 2), 2) : null;
            return { result: { corners: found.corners, lighting }, transfer: [] };
        }
    }
}

self.onmessage = async (event: MessageEvent<ScanRequest>) => {
    const req = event.data;
    try {
        const { result, transfer } = await handle(req);
        self.postMessage({ id: req.id, ok: true, result } satisfies ScanResponse, transfer);
    } catch (err) {
        const unsupported = err instanceof Unsupported;
        self.postMessage({ id: req.id, ok: false, unsupported, message: err instanceof Error ? err.message : String(err) } satisfies ScanResponse);
    }
};
