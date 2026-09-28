// อ่านกระดาษคำตอบจากรูปถ่าย (OMR) — ระบบสอบกระดาษ เฟส 0 ต้นแบบ (2026-09-27)
//
// **ฟังก์ชันล้วน ไม่แตะ DOM** — รับภาพเป็นตัวเลข คืนผลเป็นตัวเลข ใช้ได้ทั้งในเบราว์เซอร์ (หน้าสแกน) และใน Node
// (สคริปต์ทดสอบที่สร้างรูปจำลองหลายร้อยแบบแล้ววัดความแม่น) · ไม่ใช้ OpenCV.js เพราะหนัก ~8MB โหลดบนมือถือไม่ไหว
// งานที่ต้องการจริงมีแค่ 4 อย่าง เขียนเองได้ในไม่กี่ร้อยบรรทัด:
//   1. หาสี่เหลี่ยมดำ 4 มุม  2. คำนวณการดึงภาพให้ตรง (homography)  3. ดึงภาพ  4. วัดความเข้มในแต่ละวง
//
// **กติกาเหล็ก: ไม่เดา** — วงที่อ่านไม่ชัด (จาง / ฝนหลายวง / ลบไม่หมด) ต้องคืนเป็น "unclear" ให้ลูกค้ายืนยันเอง
// ตรวจผิดโดยไม่เตือนแย่กว่าไม่มีฟีเจอร์นี้เลย (ลูกค้าเสียความเชื่อใจทั้งระบบ)

import { FIDUCIALS, FIDUCIAL_SIZE, PAPER, QR_BOX, type Point, type QuestionSlot, GRID } from "./layout";

export type GrayImage = { width: number; height: number; data: Uint8ClampedArray };

/** RGBA (จาก canvas/sharp) → ความสว่าง 0-255 */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, channels = 4): GrayImage {
    const data = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i++, j += channels) {
        data[i] = channels >= 3 ? (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000 : rgba[j];
    }
    return { width, height, data };
}

/** ย่อภาพ (เฉลี่ยทีละช่อง) — ใช้ตอนหามุม ไม่ต้องใช้ความละเอียดเต็ม */
function downscale(img: GrayImage, maxSide: number): { img: GrayImage; scale: number } {
    const factor = Math.max(1, Math.ceil(Math.max(img.width, img.height) / maxSide));
    if (factor === 1) return { img, scale: 1 };
    const w = Math.floor(img.width / factor);
    const h = Math.floor(img.height / factor);
    const data = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let dy = 0; dy < factor; dy++) {
                const row = (y * factor + dy) * img.width + x * factor;
                for (let dx = 0; dx < factor; dx++) sum += img.data[row + dx];
            }
            data[y * w + x] = sum / (factor * factor);
        }
    }
    return { img: { width: w, height: h, data }, scale: factor };
}

/**
 * ขาวดำแบบปรับตามแสงรอบข้าง — เงามือ/ไฟส่องไม่เท่ากันทั้งแผ่นเป็นเรื่องปกติของรูปจากมือถือ
 * ค่าเดียวทั้งภาพจะทำให้มุมที่มืดกลายเป็นดำหมด · ใช้ integral image หาค่าเฉลี่ยรอบจุดได้เร็ว
 */
function adaptiveDark(img: GrayImage, window: number, offset: number): Uint8Array {
    const { width: w, height: h, data } = img;
    const integral = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
        let rowSum = 0;
        for (let x = 0; x < w; x++) {
            rowSum += data[y * w + x];
            integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + rowSum;
        }
    }
    const half = Math.max(1, Math.floor(window / 2));
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        const y0 = Math.max(0, y - half);
        const y1 = Math.min(h, y + half + 1);
        for (let x = 0; x < w; x++) {
            const x0 = Math.max(0, x - half);
            const x1 = Math.min(w, x + half + 1);
            const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
            const mean = sum / ((x1 - x0) * (y1 - y0));
            out[y * w + x] = data[y * w + x] < mean - offset ? 1 : 0;
        }
    }
    return out;
}

type Blob = { cx: number; cy: number; area: number; squareness: number };

/**
 * กลุ่มพิกเซลดำที่ต่อกัน → เก็บเฉพาะตัวที่ "ทึบและเป็นสี่เหลี่ยม"
 * squareness = พื้นที่ ÷ (ระยะไกลสุดจากจุดศูนย์กลาง)² — สี่เหลี่ยมทึบ ≈ 2 ไม่ว่าจะเอียงกี่องศา, วงกลมทึบ ≈ 3.14,
 * วงแหวน/ตัวหนังสือ/เส้น ต่ำกว่านั้นมาก — แยกสี่เหลี่ยมมุมออกจากวงที่ฝนแล้วได้แม้รูปจะเอียง
 */
function findBlobs(mask: Uint8Array, w: number, h: number, minArea: number, maxArea: number): Blob[] {
    const seen = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    const blobs: Blob[] = [];
    for (let start = 0; start < mask.length; start++) {
        if (!mask[start] || seen[start]) continue;
        let top = 0;
        stack[top++] = start;
        seen[start] = 1;
        let area = 0;
        let sx = 0;
        let sy = 0;
        const pixels: number[] = [];
        while (top > 0) {
            const p = stack[--top];
            const x = p % w;
            const y = (p - x) / w;
            area++;
            sx += x;
            sy += y;
            if (area <= maxArea) pixels.push(p);
            if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[top++] = p - 1; }
            if (x < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[top++] = p + 1; }
            if (y > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack[top++] = p - w; }
            if (y < h - 1 && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack[top++] = p + w; }
        }
        if (area < minArea || area > maxArea) continue;
        const cx = sx / area;
        const cy = sy / area;
        let maxDist = 0;
        for (const p of pixels) {
            const x = p % w;
            const d = (x - cx) ** 2 + ((p - x) / w - cy) ** 2;
            if (d > maxDist) maxDist = d;
        }
        blobs.push({ cx, cy, area, squareness: area / Math.max(1, maxDist) });
    }
    return blobs;
}

export type FiducialResult =
    // alternatives = ชุดมุมที่เข้าเค้ารองลงมา (ลองต่อถ้าชุดแรกไม่ผ่านการตรวจตำแหน่ง)
    | { ok: true; corners: [Point, Point, Point, Point]; alternatives: [Point, Point, Point, Point][] }
    // debug = กลุ่มพิกเซลดำที่เห็น (พื้นที่, ความเป็นสี่เหลี่ยม) — ไว้ไล่หาสาเหตุในหน้าทดสอบ/สคริปต์วัดผล
    | { ok: false; reason: string; debug?: { area: number; squareness: number; cx: number; cy: number }[] };

/** หาสี่เหลี่ยมดำ 4 มุมในรูป — คืนพิกัดในรูปขนาดเต็ม (บนซ้าย บนขวา ล่างขวา ล่างซ้าย) */
export function findFiducials(img: GrayImage): FiducialResult {
    const { img: small, scale } = downscale(img, 1100);
    const minSide = Math.min(small.width, small.height);
    const mask = adaptiveDark(small, Math.round(minSide / 8), 18);
    // สี่เหลี่ยมมุมกว้าง 8 มม. บนกระดาษกว้าง 210 มม. ≈ 3.8% — เผื่อกระดาษเต็มหรือไม่เต็มเฟรม (1.5% - 9% ของด้านสั้น)
    const minArea = (minSide * 0.015) ** 2;
    const maxArea = (minSide * 0.09) ** 2;
    const blobs = findBlobs(mask, small.width, small.height, minArea, maxArea);
    const debug = blobs.map((b) => ({ area: b.area, squareness: +b.squareness.toFixed(2), cx: Math.round(b.cx), cy: Math.round(b.cy) }));
    const squares = blobs.filter((b) => b.squareness > 1.55 && b.squareness < 2.6);
    if (squares.length < 4) return { ok: false, reason: "หาสี่เหลี่ยมดำที่มุมกระดาษไม่ครบ 4 มุม — ถ่ายให้เห็นกระดาษทั้งแผ่น", debug };

    // สี่เหลี่ยมมุมเป็นสี่เหลี่ยมทึบที่ใหญ่ที่สุดบนกระดาษ — ตัดของเล็กๆ (จุดกลาง QR ฯลฯ) ออกก่อน
    const largest = Math.max(...squares.map((s) => s.area));
    const big = squares.filter((s) => s.area >= largest * 0.35).sort((a, b) => b.area - a.area).slice(0, 10);
    if (big.length < 4) return { ok: false, reason: "หาสี่เหลี่ยมดำที่มุมกระดาษไม่ครบ 4 มุม — ถ่ายให้เห็นกระดาษทั้งแผ่น", debug };

    // เดิมหยิบ "ตัวที่อยู่สุดมุมภาพ" ทีละมุม — พังเมื่อมีของดำเหลี่ยมๆ นอกกระดาษ (เจอจริง: ไอคอนบน taskbar ในภาพหน้าจอ
    // ถูกหยิบเป็นมุมล่างขวา) · ตอนนี้ลองทุกชุด 4 ตัว แล้วให้คะแนนว่าเข้ากับรูปทรงกระดาษแค่ไหน:
    // ขนาดใกล้กัน + สัดส่วนกว้าง:สูง ใกล้ของจริง + ด้านตรงข้ามยาวใกล้กัน · คืนหลายชุดเรียงจากดีสุด ให้ locateSheet
    // ลองทีละชุดจนผ่านการตรวจตำแหน่ง
    const expected = (FIDUCIALS[1].x - FIDUCIALS[0].x) / (FIDUCIALS[3].y - FIDUCIALS[0].y);
    const quads: { corners: Blob[]; score: number }[] = [];
    for (let a = 0; a < big.length; a++) {
        for (let b = a + 1; b < big.length; b++) {
            for (let c = b + 1; c < big.length; c++) {
                for (let d = c + 1; d < big.length; d++) {
                    const set = [big[a], big[b], big[c], big[d]];
                    const pick = (score: (x: Blob) => number) => set.reduce((m, x) => (score(x) < score(m) ? x : m));
                    const tl = pick((x) => x.cx + x.cy);
                    const tr = pick((x) => -x.cx + x.cy);
                    const br = pick((x) => -x.cx - x.cy);
                    const bl = pick((x) => x.cx - x.cy);
                    if (new Set([tl, tr, br, bl]).size < 4) continue;
                    const dist = (p: Blob, q: Blob) => Math.hypot(p.cx - q.cx, p.cy - q.cy);
                    const top = dist(tl, tr);
                    const bottom = dist(bl, br);
                    const left = dist(tl, bl);
                    const right = dist(tr, br);
                    const ratio = (top + bottom) / (left + right);
                    if (ratio < expected * 0.6 || ratio > expected * 1.6) continue;
                    const areas = set.map((x) => x.area);
                    const sizePenalty = Math.log(Math.max(...areas) / Math.min(...areas));
                    const shapePenalty = Math.abs(Math.log(ratio / expected));
                    const sidePenalty = Math.abs(top - bottom) / (top + bottom) + Math.abs(left - right) / (left + right);
                    quads.push({ corners: [tl, tr, br, bl], score: sizePenalty + shapePenalty * 2 + sidePenalty * 2 });
                }
            }
        }
    }
    if (!quads.length) return { ok: false, reason: "รูปเอียงมากเกินไป — ถ่ายจากด้านบนตรงๆ", debug };
    quads.sort((p, q) => p.score - q.score);

    const toFull = (b: Blob): Point => ({ x: (b.cx + 0.5) * scale - 0.5, y: (b.cy + 0.5) * scale - 0.5 });
    const options = quads.slice(0, 4).map((q) => q.corners.map(toFull) as [Point, Point, Point, Point]);
    return { ok: true, corners: options[0], alternatives: options.slice(1) };
}

/** homography 3×3 (แถวต่อแถว, h33 = 1) ที่แปลงจุด src → dst · แก้สมการ 8×8 ด้วย Gaussian elimination */
export function homography(src: Point[], dst: Point[]): number[] {
    const a: number[][] = [];
    for (let i = 0; i < 4; i++) {
        const { x, y } = src[i];
        const { x: u, y: v } = dst[i];
        a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
        a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (let col = 0; col < 8; col++) {
        let pivot = col;
        for (let r = col + 1; r < 8; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
        [a[col], a[pivot]] = [a[pivot], a[col]];
        if (Math.abs(a[col][col]) < 1e-12) throw new Error("จุดมุมอยู่ในแนวเดียวกัน คำนวณไม่ได้");
        for (let r = 0; r < 8; r++) {
            if (r === col) continue;
            const f = a[r][col] / a[col][col];
            for (let c = col; c < 9; c++) a[r][c] -= f * a[col][c];
        }
    }
    return [...Array.from({ length: 8 }, (_, i) => a[i][8] / a[i][i]), 1];
}

export function applyH(h: number[], p: Point): Point {
    const w = h[6] * p.x + h[7] * p.y + h[8];
    return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/**
 * ดึงภาพกระดาษให้ตรงเป็นภาพใหม่ขนาด A4 (pxPerMm พิกเซลต่อมิลลิเมตร) — ทุกจุดบนผังจึงอยู่ที่ (mm × pxPerMm) เป๊ะ
 * sheetToImage = homography จากพิกัดกระดาษ (มม.) ไปพิกัดในรูป · สุ่มค่าแบบ bilinear จากภาพขนาดเต็ม
 */
export function rectify(img: GrayImage, sheetToImage: number[], pxPerMm: number): GrayImage {
    const width = Math.round(PAPER.width * pxPerMm);
    const height = Math.round(PAPER.height * pxPerMm);
    const data = new Uint8ClampedArray(width * height);
    const h = sheetToImage;
    for (let oy = 0; oy < height; oy++) {
        const my = (oy + 0.5) / pxPerMm;
        for (let ox = 0; ox < width; ox++) {
            const mx = (ox + 0.5) / pxPerMm;
            const w = h[6] * mx + h[7] * my + h[8];
            const x = (h[0] * mx + h[1] * my + h[2]) / w;
            const y = (h[3] * mx + h[4] * my + h[5]) / w;
            const x0 = Math.floor(x);
            const y0 = Math.floor(y);
            if (x0 < 0 || y0 < 0 || x0 >= img.width - 1 || y0 >= img.height - 1) {
                data[oy * width + ox] = 255;
                continue;
            }
            const fx = x - x0;
            const fy = y - y0;
            const i = y0 * img.width + x0;
            const top = img.data[i] * (1 - fx) + img.data[i + 1] * fx;
            const bottom = img.data[i + img.width] * (1 - fx) + img.data[i + img.width + 1] * fx;
            data[oy * width + ox] = top * (1 - fy) + bottom * fy;
        }
    }
    return { width, height, data };
}

/**
 * ปรับมุมให้แม่นขึ้นหลังดึงภาพรอบแรก — จุดกลางสี่เหลี่ยมมุมที่หาจากภาพย่อคลาดได้ ~1-2 พิกเซลของภาพย่อ
 * (≈ 0.3-0.5 มม. บนกระดาษ) ซึ่งพอให้วงแถวล่างสุดคลาดตำแหน่ง จึงหาจุดกลางของสี่เหลี่ยมใหม่บนภาพที่ดึงตรงแล้ว
 * แล้วคำนวณ homography ใหม่อีกรอบ
 */
/** ความสว่างเฉลี่ยในกล่องสี่เหลี่ยมจัตุรัสรอบจุด (พิกเซล) */
function meanBox(rect: GrayImage, cx: number, cy: number, half: number): number {
    let sum = 0;
    let n = 0;
    for (let y = Math.max(0, cy - half); y <= Math.min(rect.height - 1, cy + half); y++) {
        for (let x = Math.max(0, cx - half); x <= Math.min(rect.width - 1, cx + half); x++) {
            sum += rect.data[y * rect.width + x];
            n++;
        }
    }
    return n ? sum / n : 255;
}

export function refineCorners(rect: GrayImage, pxPerMm: number): Point[] | null {
    const out: Point[] = [];
    for (const f of FIDUCIALS) {
        const r = Math.round(FIDUCIAL_SIZE * pxPerMm);
        const cx0 = Math.round(f.x * pxPerMm);
        const cy0 = Math.round(f.y * pxPerMm);
        let sx = 0;
        let sy = 0;
        let n = 0;
        // เกณฑ์ดำ = กึ่งกลางระหว่าง "ด้านในสี่เหลี่ยม" กับ "กระดาษรอบๆ" ของมุมนั้นเอง
        // เดิมใช้ 55% ของกระดาษขาวที่สว่างที่สุดในกล่อง — มุมที่อยู่ในเงามือ (ขอบเงาคม) กระดาษฝั่งที่โดนเงาเข้มกว่าเกณฑ์
        // ถูกนับเป็นสี่เหลี่ยม มุมถูกดึงเข้าไปในเงา แล้วทั้งแผ่นโดนปฏิเสธ (เจอจากรูปกระดาษจริง 2026-09-28)
        const white = localWhite(rect, cx0, cy0, r);
        const core = meanBox(rect, cx0, cy0, Math.round(r * 0.3));
        if (white - core < 25) return null; // มองไม่เห็นสี่เหลี่ยมชัดพอ — ไม่ปรับดีกว่าปรับผิด
        const dark = (white + core) / 2;
        for (let y = cy0 - r; y <= cy0 + r; y++) {
            for (let x = cx0 - r; x <= cx0 + r; x++) {
                if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) continue;
                if (rect.data[y * rect.width + x] < dark) {
                    sx += x;
                    sy += y;
                    n++;
                }
            }
        }
        // ต้องเจอพิกเซลดำอย่างน้อยครึ่งหนึ่งของสี่เหลี่ยม ไม่งั้นแปลว่ารอบแรกผิดไปไกล ไม่ปรับดีกว่า
        // และต้องไม่มากเกิน 1.6 เท่า (เงา/ของดำอื่นติดเข้ามาในกล่อง) · จุดใหม่ต้องห่างจุดเดิมไม่เกิน 2 มม.
        const area = (FIDUCIAL_SIZE * pxPerMm) ** 2;
        if (n < area * 0.5 || n > area * 1.6) return null;
        const p = { x: (sx / n + 0.5) / pxPerMm, y: (sy / n + 0.5) / pxPerMm };
        if (Math.hypot(p.x - f.x, p.y - f.y) > 2) return null;
        out.push(p);
    }
    return out;
}

// ── อ่านวง ─────────────────────────────────────────────────────────────────────────────────────────

export type Reading =
    | { kind: "answer"; choice: number } // ฝนชัดวงเดียว
    | { kind: "blank" } // ไม่ได้ฝน
    | { kind: "unclear"; reason: "multiple" | "faint" | "erased"; candidates: number[] }; // ให้ลูกค้ายืนยัน

/** shift = ระยะที่จัดตำแหน่งเฉพาะที่เลื่อนวงของข้อนี้ไป (มม.) — ใช้ตัดภาพแถวให้ตรงกับที่อ่านจริง */
export type QuestionReading = { number: number; fills: number[]; reading: Reading; shift?: Point };

// เกณฑ์ตัดสิน — คิดเป็นสัดส่วนของ "รอยฝนปกติของแผ่นนี้" (1 = เข้มเท่ารอยฝนทั่วไปบนแผ่นเดียวกัน, 0 = เหมือนวงเปล่า)
// เดิม (เฟส 0) เทียบกับ "ดำสนิท" — รอยจำลองกับจอ iPad เข้มเกือบดำจึงผ่าน แต่ดินสอ 2B บนกระดาษจริงถ่ายออกมาเป็นเทา
// ได้แค่ 0.20-0.36 ของดำสนิท ตกเกณฑ์ "ฝน" ทุกข้อ (เจอจากรูปกระดาษจริงรอบแรก 2026-09-28) · เทียบกับรอยของแผ่นเอง
// จึงใช้ได้ทั้งดินสอ/ปากกา/แสงมาก-น้อย — ดู markLevel ใน readSheet
export const THRESHOLDS = {
    filled: 0.55, // เข้มเกินครึ่งหนึ่งของรอยฝนปกติ = ฝน
    blank: 0.3, // ต่ำกว่านี้ = ว่าง
    secondFilled: 0.35, // วงที่สองเข้มเกินนี้ ขณะที่วงแรกฝนชัด = ลบไม่หมด/ฝนสองวง → ให้ยืนยัน
    /** ค่าดิบ (เทียบดำสนิท) ที่ต่ำกว่านี้ = ฝุ่น/เงาจางๆ ไม่นับเลย — กันแผ่นที่แทบไม่ได้ฝนถูกขยายสัญญาณรบกวนจนเป็นคำตอบ */
    noiseFloor: 0.07,
};
/**
 * ครึ่งกว้างของกล่องที่ใช้หา "สีกระดาษ" รอบแต่ละวง (มม.) — เดิม 6 มม. (กล่อง 12 มม.) แต่ขอบเงามือที่พาดผ่านกล่อง
 * ทำให้ได้สีกระดาษจากฝั่งที่สว่าง วงเปล่าในเงาเลยดูเหมือนฝน (รูปจริง 2026-09-28 ถามยืนยัน 11-16 ข้อตามแนวเงา)
 * 3.2 มม. ยังครอบช่องว่างระหว่างวง (กระดาษแน่นอน >50% ของกล่อง) แต่แคบพอจะอยู่ฝั่งเดียวกับวงเกือบเสมอ
 */
const WHITE_BOX_MM = Number(globalThis.process?.env?.OMR_WHITE_BOX) || 3.2;
/** รอยฝนปกติ: ค่ากลางของวงที่เข้มสุดในแต่ละข้อ (เฉพาะข้อที่มีรอยชัด) — ข้อที่มีรอยน้อยกว่านี้ใช้ค่าตั้งต้นแทน */
const MARK_LEVEL = { minMark: 0.1, minQuestions: 5, fallback: 0.6, min: 0.18, max: 0.9 };

/** ความเข้มเฉลี่ยในวงรัศมี r (พิกเซล) เทียบกับกระดาษขาวรอบๆ — 0 = ขาวเท่ากระดาษ, 1 = ดำสนิท */
function darknessAt(rect: GrayImage, cx: number, cy: number, r: number, white: number): number {
    let sum = 0;
    let n = 0;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 > r2 || x < 0 || y < 0 || x >= rect.width || y >= rect.height) continue;
            sum += rect.data[y * rect.width + x];
            n++;
        }
    }
    const mean = n ? sum / n : 255;
    return Math.max(0, Math.min(1, (white - mean) / Math.max(40, white)));
}

/** ความขาวของกระดาษรอบจุด — percentile 90 ของกล่องรอบๆ (ทนเงา/แสงไม่เท่ากันทั้งแผ่น) */
function localWhite(rect: GrayImage, cx: number, cy: number, half: number): number {
    const hist = new Uint32Array(256);
    let n = 0;
    for (let y = Math.max(0, Math.floor(cy - half)); y < Math.min(rect.height, cy + half); y += 2) {
        for (let x = Math.max(0, Math.floor(cx - half)); x < Math.min(rect.width, cx + half); x += 2) {
            hist[rect.data[y * rect.width + x]]++;
            n++;
        }
    }
    let acc = 0;
    for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= n * 0.9) return v;
    }
    return 255;
}

// ── จัดตำแหน่งเฉพาะที่ (กระดาษไม่เรียบ) ────────────────────────────────────────────────────────────────
//
// การดึงภาพจาก 4 มุม (homography) ถูกต้องเฉพาะกระดาษที่เรียบสนิท — กระดาษจริงบนโต๊ะมักโค้ง (ขอบบนงอขึ้น)
// เจอจริงจากรูปถ่ายกระดาษพิมพ์รอบแรก (2026-09-28): แถวล่างตรงเป๊ะ แต่แถวบนเลื่อนไป ~3 มม. = อ่านพลาดวงไปทั้งวง
// ทุกข้อในแถวบนกลายเป็น "ไม่ได้ตอบ" (ผิดโดยไม่เตือน) · รูปจำลอง/จอ iPad เรียบสนิทจึงไม่เคยเห็นปัญหานี้
//
// วิธีแก้: แบ่งเป็นก้อน (1 คอลัมน์ × 5 แถว = 20 วง) แต่ละก้อนหาระยะเลื่อนที่ทำให้ "เส้นขอบวงที่พิมพ์ไว้" ตรงที่สุด
// (วงแหวนมืดกว่ากระดาษรอบนอก — ใช้ได้ทั้งวงว่างและวงที่ฝน) ในกรอบ ±3 มม. แล้วบังคับให้ก้อนติดกันเลื่อนไปทางเดียวกัน
// ⚠ กรอบค้นหาต้องไม่ถึงครึ่งระยะห่างระหว่างวง (6.7 มม. แนวนอน / 8 มม. แนวตั้ง) ไม่งั้นอาจไปตรงกับวงข้างๆ แทน
//   = คำตอบเลื่อนไปทั้งแถว · กระดาษโค้งจนต้องเลื่อนถึงขอบกรอบ = ปฏิเสธให้ถ่ายใหม่ ไม่เดา
export const ALIGN = { searchX: 3, searchY: 3.5, neighborTolerance: 1.5 };

type BlockShift = { dx: number; dy: number };

/** คะแนนความตรงของก้อนที่ระยะเลื่อน (dx,dy) พิกเซล = กระดาษรอบนอกวงสว่างกว่าเส้นขอบวงแค่ไหน (เฉลี่ยทุกวงในก้อน) */
function ringScore(rect: GrayImage, centers: Point[], ring: Point[], outside: Point[], dx: number, dy: number): number {
    let ringSum = 0;
    let outSum = 0;
    let n = 0;
    const at = (x: number, y: number) => {
        const xi = Math.round(x);
        const yi = Math.round(y);
        return xi < 0 || yi < 0 || xi >= rect.width || yi >= rect.height ? 255 : rect.data[yi * rect.width + xi];
    };
    for (const c of centers) {
        for (const p of ring) ringSum += at(c.x + p.x + dx, c.y + p.y + dy);
        for (const p of outside) outSum += at(c.x + p.x + dx, c.y + p.y + dy);
        n++;
    }
    return (outSum / outside.length - ringSum / ring.length) / Math.max(1, n);
}

/** ระยะเลื่อนของแต่ละวง (มม.) + ปัญหา (null = จัดได้) — ก้อน = คอลัมน์ × กลุ่ม 5 แถวบนหน้าเดียว */
export function alignSlots(rect: GrayImage, pxPerMm: number, slots: QuestionSlot[]): { shifts: Point[]; problem: string | null } {
    const R = GRID.bubbleRadius * pxPerMm;
    const circle = (radius: number, step: number) => Array.from({ length: Math.round(360 / step) }, (_, k) => ({ x: radius * Math.cos((k * step * Math.PI) / 180), y: radius * Math.sin((k * step * Math.PI) / 180) }));
    const ring = [...circle(R * 0.93, 10), ...circle(R, 10)];
    const outside = circle(R * 1.3, 15);
    const groupsPerCol = GRID.rowsPerCol / GRID.groupEvery;
    const keyOf = (i: number) => Math.floor(i / GRID.rowsPerCol) * groupsPerCol + Math.floor((i % GRID.rowsPerCol) / GRID.groupEvery);
    const blocks = new Map<number, Point[]>();
    slots.forEach((slot, i) => {
        const list = blocks.get(keyOf(i)) ?? [];
        for (const b of slot.bubbles) list.push({ x: b.x * pxPerMm, y: b.y * pxPerMm });
        blocks.set(keyOf(i), list);
    });

    const sx = Math.round(ALIGN.searchX * pxPerMm);
    const sy = Math.round(ALIGN.searchY * pxPerMm);
    const best = new Map<number, BlockShift>();
    for (const [key, centers] of blocks) {
        // หยาบก่อน (ทีละ 2 พิกเซล) แล้วละเอียดรอบจุดที่ดีที่สุด
        let top = { dx: 0, dy: 0, s: -Infinity };
        for (let dy = -sy; dy <= sy; dy += 2)
            for (let dx = -sx; dx <= sx; dx += 2) {
                const s = ringScore(rect, centers, ring, outside, dx, dy);
                if (s > top.s) top = { dx, dy, s };
            }
        const coarse = top;
        for (let dy = coarse.dy - 2; dy <= coarse.dy + 2; dy++)
            for (let dx = coarse.dx - 2; dx <= coarse.dx + 2; dx++) {
                if (Math.abs(dx) > sx || Math.abs(dy) > sy) continue;
                const s = ringScore(rect, centers, ring, outside, dx, dy);
                if (s > top.s) top = { dx, dy, s };
            }
        best.set(key, { dx: top.dx, dy: top.dy });
    }

    // ก้อนติดกันต้องเลื่อนไปทางเดียวกัน (กระดาษโค้งเป็นเนื้อเดียว) — ก้อนที่ต่างจากเพื่อนบ้านเกินเกณฑ์ = ไปจับวงข้างๆ
    // ใช้ค่ากลางของเพื่อนบ้านแทน
    const tol = ALIGN.neighborTolerance * pxPerMm;
    const cols = GRID.cols;
    const final = new Map<number, BlockShift>();
    let outliers = 0;
    for (const [key, v] of best) {
        const col = Math.floor(key / groupsPerCol);
        const g = key % groupsPerCol;
        const neighbors = [
            [col - 1, g],
            [col + 1, g],
            [col, g - 1],
            [col, g + 1],
        ]
            .filter(([c, gg]) => c >= 0 && c < cols && gg >= 0 && gg < groupsPerCol)
            .map(([c, gg]) => best.get(c * groupsPerCol + gg))
            .filter((n): n is BlockShift => !!n);
        if (!neighbors.length) {
            final.set(key, v);
            continue;
        }
        const med = (a: number[]) => [...a].sort((p, q) => p - q)[Math.floor((a.length - 1) / 2)];
        const m = { dx: med(neighbors.map((n) => n.dx)), dy: med(neighbors.map((n) => n.dy)) };
        if (Math.abs(v.dx - m.dx) > tol || Math.abs(v.dy - m.dy) > tol) {
            outliers++;
            final.set(key, m);
        } else final.set(key, v);
    }

    let problem: string | null = null;
    const edge = (d: number, limit: number) => Math.abs(d) >= limit - 1;
    if (outliers > blocks.size / 4) problem = `จัดตำแหน่งไม่ลงตัว ${outliers}/${blocks.size} ก้อน`;
    else if ([...final.values()].some((v) => edge(v.dx, sx) || edge(v.dy, sy))) problem = "กระดาษโค้งจนเลื่อนเกินกรอบค้นหา";

    const shifts = slots.map((_, i) => {
        const v = final.get(keyOf(i)) ?? { dx: 0, dy: 0 };
        return { x: v.dx / pxPerMm, y: v.dy / pxPerMm };
    });
    return { shifts, problem };
}

/**
 * อ่านทุกวงของหน้า — จัดตำแหน่งเฉพาะที่ก่อน (alignSlots) · problem ไม่ใช่ null = กระดาษโค้ง/ยับเกินจัดได้ ต้องให้ถ่ายใหม่
 * (ผู้เรียกต้องปฏิเสธทั้งแผ่น ห้ามใช้ readings ต่อ)
 */
export function readSheet(rect: GrayImage, pxPerMm: number, slots: QuestionSlot[]): { readings: QuestionReading[]; problem: string | null } {
    const { shifts, problem } = alignSlots(rect, pxPerMm, slots);
    const r = GRID.bubbleRadius * 0.72 * pxPerMm; // ดูเฉพาะด้านในวง ไม่เอาเส้นขอบวงที่พิมพ์มา
    const raw = slots.map((slot, i) =>
        slot.bubbles.map((b) => {
            const x = (b.x + shifts[i].x) * pxPerMm;
            const y = (b.y + shifts[i].y) * pxPerMm;
            return darknessAt(rect, x, y, r, localWhite(rect, x, y, WHITE_BOX_MM * pxPerMm));
        })
    );
    // "วงเปล่า" ของแผ่นนี้ = ค่ากลางของทุกวง (วงส่วนใหญ่ไม่ได้ฝน) — ตัวอักษร ก ข ค ง ในวงและหมึกพิมพ์แต่ละเครื่อง
    // ทำให้วงเปล่าไม่ได้เป็น 0 จึงวัดเทียบกับค่านี้แทนค่าตายตัว
    const all = raw.flat().sort((a, b) => a - b);
    const empty = all.length ? all[Math.floor(all.length * 0.5)] : 0;
    const absolute = raw.map((row) => row.map((d) => Math.max(0, (d - empty) / Math.max(0.2, 1 - empty))));
    // ความเข้มของรอยฝนปกติบนแผ่นนี้ — ตัวหารของเกณฑ์ทั้งหมด (ดู THRESHOLDS)
    const marks = absolute.map((row) => Math.max(0, ...row)).filter((v) => v >= MARK_LEVEL.minMark).sort((a, b) => a - b);
    const level =
        marks.length >= MARK_LEVEL.minQuestions
            ? Math.min(MARK_LEVEL.max, Math.max(MARK_LEVEL.min, marks[Math.floor(marks.length / 2)]))
            : MARK_LEVEL.fallback;
    const readings = slots.map((slot, i) => {
        const fills = absolute[i].map((f) => (f < THRESHOLDS.noiseFloor ? 0 : f / level));
        return { number: slot.number, fills, reading: decide(fills), shift: shifts[i] };
    });
    return { readings, problem };
}

/** เหมือน readSheet แต่คืนแค่ผลอ่าน — สำหรับสคริปต์วัดผล (หน้าเว็บต้องใช้ readSheet เพื่อรู้ว่าต้องปฏิเสธแผ่นไหม) */
export function readBubbles(rect: GrayImage, pxPerMm: number, slots: QuestionSlot[]): QuestionReading[] {
    return readSheet(rect, pxPerMm, slots).readings;
}

export function decide(fills: number[]): Reading {
    const order = fills.map((f, i) => ({ f, i })).sort((a, b) => b.f - a.f);
    const [first, second] = order;
    if (!first || first.f < THRESHOLDS.blank) return { kind: "blank" };
    if (first.f < THRESHOLDS.filled) return { kind: "unclear", reason: "faint", candidates: [first.i] };
    if (second && second.f >= THRESHOLDS.filled) {
        return { kind: "unclear", reason: "multiple", candidates: order.filter((o) => o.f >= THRESHOLDS.filled).map((o) => o.i) };
    }
    if (second && second.f >= THRESHOLDS.secondFilled) return { kind: "unclear", reason: "erased", candidates: [first.i, second.i] };
    return { kind: "answer", choice: first.i };
}

// ── ตรวจว่าดึงภาพถูกที่ ──────────────────────────────────────────────────────────────────────────────

/**
 * หลังดึงภาพตรงแล้ว สี่เหลี่ยมมุมทั้ง 4 ต้องอยู่ตรงตำแหน่งในผังเป๊ะ (ด้านในดำ รอบนอกเป็นกระดาษขาว)
 * ถ้าไม่ใช่ = หยิบของดำๆ ผิดชิ้นมาเป็นมุม → วงทุกวงจะถูกอ่านผิดที่ทั้งแผ่น ต้องปฏิเสธแล้วให้ถ่ายใหม่
 * (เจอจริงตอนทดสอบ: จับมุมผิดแล้วอ่านทุกข้อเป็น "ไม่ได้ตอบ" — ผิดโดยไม่เตือนทั้งแผ่น)
 */
/** เกณฑ์ตรวจตำแหน่ง (สัดส่วนเทียบความสว่างที่กระดาษควรเป็น) — ปรับจากผลวัด ดู _perf-tmp/paper-omr-harness.mjs */
// ring 0.6 (เดิม 0.72): รูปถ่ายจริงที่มุมภาพมืดกว่ากลางภาพ (vignette) ติดเกณฑ์เดิม — วัดแล้วผ่านตั้งแต่ 0.65 ลงมา
// ส่วนตัวล่อบนพื้นหลังยังโดนปฏิเสธครบแม้ลดถึง 0.5 (ดู _perf-tmp/paper-sweep.mjs)
// inner 0.65 (เดิม 0.45): สี่เหลี่ยมมุมที่พิมพ์จริงออกมาเป็นเทาเข้ม ไม่ดำสนิท — วัดจากกระดาษพิมพ์จริง 0.37-0.54 ของกระดาษ
// (มุมล่างซ้ายซีดสุดทุกรูป = หมึกเครื่องพิมพ์ไม่สม่ำเสมอ) จอ/รูปจำลองดำสนิทจึงไม่เคยเห็นปัญหานี้ (2026-09-28)
export const REGISTRATION = { inner: 0.65, ring: 0.6, margin: 0.72, shadowEdge: 0.88 };

/** null = ตำแหน่งถูก · ข้อความ = ติดที่ข้อไหน (ใช้ไล่สาเหตุในหน้าแล็บ/สคริปต์ ลูกค้าเห็นแค่ "ให้ถ่ายใหม่") */
export function registrationProblem(rect: GrayImage, pxPerMm: number): string | null {
    // ความสว่างที่ "กระดาษควรเป็น" ณ แต่ละจุด — เงามือ/แสงเอียงทำให้ทั้งแผ่นสว่างไม่เท่ากัน (ขอบในเงาอาจมืดกว่า
    // กลางแผ่นเกิน 30%) จึงประมาณเป็นระนาบลาดจากพื้นที่กระดาษกลางแผ่นหลายจุด แล้วเทียบกับค่าที่ควรเป็นตรงนั้น
    // ห้ามใช้ความขาวเฉพาะจุด: ถ้าจับมุมผิดไปที่พื้นหลัง ความขาวเฉพาะจุดตรงนั้นก็มืดด้วย พื้นหลังจะผ่านการตรวจไปได้
    // (เจอจริงจากการทดสอบวางตัวล่อ) · ระนาบเรียบจับเงาที่ไล่ระดับได้ แต่พื้นหลังมืดต่างไปทันทีจึงยังโดนปฏิเสธ
    const plane = paperPlane(rect, pxPerMm);
    const expect = (x: number, y: number) => plane[0] + plane[1] * x + plane[2] * y;
    const half = FIDUCIAL_SIZE / 2;
    const meanIn = (x0: number, y0: number, x1: number, y1: number) => {
        let sum = 0;
        let n = 0;
        for (let y = Math.max(0, Math.round(y0 * pxPerMm)); y < Math.min(rect.height, Math.round(y1 * pxPerMm)); y++) {
            for (let x = Math.max(0, Math.round(x0 * pxPerMm)); x < Math.min(rect.width, Math.round(x1 * pxPerMm)); x++) {
                sum += rect.data[y * rect.width + x];
                n++;
            }
        }
        return n ? sum / n : 0;
    };
    const whiteEnough = (x0: number, y0: number, x1: number, y1: number, factor: number) =>
        meanIn(x0, y0, x1, y1) > expect((x0 + x1) / 2, (y0 + y1) / 2) * factor;
    for (const f of FIDUCIALS) {
        // ด้านในสี่เหลี่ยมมุมต้องดำ
        const s = half * 0.7;
        const inner = meanIn(f.x - s, f.y - s, f.x + s, f.y + s);
        if (inner > expect(f.x, f.y) * REGISTRATION.inner) return `มุม (${f.x},${f.y}) ด้านในไม่ดำพอ: ${inner.toFixed(0)} เทียบกระดาษ ${expect(f.x, f.y).toFixed(0)}`;
        // แถบกระดาษรอบนอกสี่เหลี่ยม (ห่าง 1.5-3 มม.) ทั้ง 4 ด้านต้องขาว
        const a = half + 1.5;
        const b = half + 3;
        if (
            !whiteEnough(f.x - b, f.y - b, f.x + b, f.y - a, REGISTRATION.ring) ||
            !whiteEnough(f.x - b, f.y + a, f.x + b, f.y + b, REGISTRATION.ring) ||
            !whiteEnough(f.x - b, f.y - a, f.x - a, f.y + a, REGISTRATION.ring) ||
            !whiteEnough(f.x + a, f.y - a, f.x + b, f.y + a, REGISTRATION.ring)
        ) {
            return `รอบมุม (${f.x},${f.y}) ไม่ขาวพอ`;
        }
    }
    // ขอบกระดาษระหว่างมุม (ห่างขอบ 4-6 มม.) ต้องขาวตลอดแนว ตรวจเป็นช่วงๆ — ถ้าดึงภาพผิด บางช่วงจะมาจากพื้นหลัง
    // ผ่านถ้าขาวเทียบระนาบของทั้งแผ่น **หรือ** สว่างพอๆ กับกระดาษที่ลึกเข้าไปอีก 4 มม. (ช่วงเดียวกัน)
    // เงามือขอบคมทับขอบกระดาษ (เจอจากรูปจริง 2026-09-28) ทำให้ระนาบคาดผิด แต่เงาทำให้สองแถบมืดเท่ากัน จึงยังผ่าน ·
    // ส่วนดึงภาพผิดจนแถบขอบไปอยู่บนพื้นหลัง แถบข้างในยังเป็นกระดาษที่สว่างกว่า จึงยังโดนปฏิเสธ
    // (และมีการจัดตำแหน่งเฉพาะที่ใน readSheet ตรวจซ้ำอีกชั้น — วงที่พิมพ์ไว้ต้องหาเจอในระยะใกล้ๆ)
    const edgeOk = (x0: number, y0: number, x1: number, y1: number, ix0: number, iy0: number, ix1: number, iy1: number) =>
        whiteEnough(x0, y0, x1, y1, REGISTRATION.margin) || meanIn(x0, y0, x1, y1) >= meanIn(ix0, iy0, ix1, iy1) * REGISTRATION.shadowEdge;
    for (let t = 0; t < 6; t++) {
        const x0 = 25 + ((PAPER.width - 50) * t) / 6;
        const x1 = 25 + ((PAPER.width - 50) * (t + 1)) / 6;
        const y0 = 25 + ((PAPER.height - 50) * t) / 6;
        const y1 = 25 + ((PAPER.height - 50) * (t + 1)) / 6;
        const W = PAPER.width;
        const Hh = PAPER.height;
        if (
            !edgeOk(x0, 4, x1, 6, x0, 8, x1, 10) ||
            !edgeOk(x0, Hh - 6, x1, Hh - 4, x0, Hh - 10, x1, Hh - 8) ||
            !edgeOk(4, y0, 6, y1, 8, y0, 10, y1) ||
            !edgeOk(W - 6, y0, W - 4, y1, W - 10, y0, W - 8, y1)
        ) {
            return `ขอบกระดาษช่วงที่ ${t + 1}/6 ไม่ขาวพอ`;
        }
    }
    return null;
}

/** ระนาบความสว่างของกระดาษ z = a + b·x + c·y (x, y เป็นมม.) — fit จากความขาวของกล่องกลางแผ่น 5 × 7 กล่อง */
function paperPlane(rect: GrayImage, pxPerMm: number): [number, number, number] {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 7; j++) {
            const x = 35 + i * 35;
            const y = 40 + j * 36;
            pts.push([x, y, localWhite(rect, x * pxPerMm, y * pxPerMm, 7 * pxPerMm)]);
        }
    }
    // least squares 3 ตัวแปร (normal equations)
    const m = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
    for (const [x, y, z] of pts) {
        const row = [1, x, y];
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) m[r][c] += row[r] * row[c];
            m[r][3] += row[r] * z;
        }
    }
    for (let col = 0; col < 3; col++) {
        for (let r = 0; r < 3; r++) {
            if (r === col) continue;
            const f = m[r][col] / m[col][col];
            for (let c = col; c < 4; c++) m[r][c] -= f * m[col][c];
        }
    }
    return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

// ── รวมทุกขั้น ─────────────────────────────────────────────────────────────────────────────────────

export const RECTIFY_PX_PER_MM = 5;

export type ScanResult =
    | { ok: true; rect: GrayImage; qrImage: GrayImage; corners: Point[]; sheetToImage: number[] }
    // detail = สาเหตุทางเทคนิค (แสดงในหน้าแล็บ) — reason คือข้อความที่ลูกค้าเห็น
    | { ok: false; reason: string; detail?: string };

/**
 * รูปถ่าย → ภาพกระดาษที่ดึงตรงแล้ว + ภาพส่วน QR (ให้ผู้เรียกอ่าน QR เอง เพราะไลบรารีอ่าน QR ต้องการ RGBA)
 * แยกขั้นอ่านวงออกไป เพราะต้องรู้ผังของใบสอบก่อน (ได้จาก QR)
 */
export function locateSheet(img: GrayImage): ScanResult {
    const found = findFiducials(img);
    if (!found.ok) return found;
    const pxPerMm = RECTIFY_PX_PER_MM;
    let lastProblem = "";
    // ลองชุดมุมที่เข้าเค้าที่สุดก่อน ไม่ผ่านการตรวจตำแหน่งค่อยลองชุดถัดไป (สูงสุด 4 ชุด)
    for (const corners of [found.corners, ...found.alternatives]) {
        let sheetToImage = homography(FIDUCIALS, corners);
        let rect = rectify(img, sheetToImage, pxPerMm);
        // รอบสอง: ปรับมุมจากภาพที่ดึงตรงแล้ว (แม่นกว่าภาพย่อ)
        const refined = refineCorners(rect, pxPerMm);
        if (refined) {
            const precise = refined.map((p) => applyH(sheetToImage, p));
            sheetToImage = homography(FIDUCIALS, precise);
            rect = rectify(img, sheetToImage, pxPerMm);
        }
        const problem = registrationProblem(rect, pxPerMm);
        if (!problem) {
            return { ok: true, rect, qrImage: cropMm(rect, pxPerMm, QR_BOX.x - 3, QR_BOX.y - 3, QR_BOX.size + 6, QR_BOX.size + 6), corners, sheetToImage };
        }
        lastProblem = problem;
    }
    return { ok: false, reason: "จับมุมกระดาษไม่ได้แน่ชัด — ถ่ายใหม่ให้เห็นกระดาษทั้งแผ่น ไม่มีเงาบังมุม", detail: lastProblem };
}

export function cropMm(img: GrayImage, pxPerMm: number, xMm: number, yMm: number, wMm: number, hMm: number): GrayImage {
    const x0 = Math.max(0, Math.round(xMm * pxPerMm));
    const y0 = Math.max(0, Math.round(yMm * pxPerMm));
    const w = Math.min(img.width - x0, Math.round(wMm * pxPerMm));
    const h = Math.min(img.height - y0, Math.round(hMm * pxPerMm));
    const data = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) data.set(img.data.subarray((y0 + y) * img.width + x0, (y0 + y) * img.width + x0 + w), y * w);
    return { width: w, height: h, data };
}

/** ภาพขาวดำ → RGBA (ไลบรารีอ่าน QR และ canvas ต้องการแบบนี้) */
export function grayToRgba(img: GrayImage): Uint8ClampedArray<ArrayBuffer> {
    const out = new Uint8ClampedArray(img.width * img.height * 4);
    for (let i = 0; i < img.data.length; i++) {
        const v = img.data[i];
        out[i * 4] = v;
        out[i * 4 + 1] = v;
        out[i * 4 + 2] = v;
        out[i * 4 + 3] = 255;
    }
    return out;
}
