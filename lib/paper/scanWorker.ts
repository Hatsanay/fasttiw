import type { Point } from "./layout";
import { FIDUCIALS } from "./layout";
import { RECTIFY_PX_PER_MM, findFiducials, homography, lightingScore, rectify, type GrayImage, type QuestionReading } from "./omr";
import { loadGray, locateGray, readPage, type LocatedPage } from "./scan";

// ตัวเรียกตัวอ่านกระดาษคำตอบจากหน้าเว็บ — ส่งงานหนักไปทำใน Web Worker (scan.worker.ts) จอจึงไม่ค้างระหว่างอ่าน
// ทุกฟังก์ชันคืน Promise และให้ผลเหมือนเรียก scan.ts/omr.ts บนเธรดหลักทุกประการ (worker ใช้โค้ดชุดเดียวกัน)
//
// ถอยไปทำบนเธรดหลัก (แบบเดิม — ช้ากว่าแต่ถูกเหมือนกัน) เมื่อ:
//   - เบราว์เซอร์ไม่มี Worker / สร้าง worker ไม่ได้ / worker พังกลางทาง → เลิกใช้ worker ทั้งหน้า
//   - งานนั้นต้องใช้ OffscreenCanvas ที่เครื่องนี้ไม่มี (Safari เก่า) → ถอดรูปบนเธรดหลัก แล้วส่งภาพขาวดำให้ worker ต่อ
// ⚠ error ปกติของตัวอ่าน (เช่น รูปเสีย) ส่งกลับเป็น error เหมือนเดิม ไม่ถอยไปทำซ้ำบนเธรดหลัก

type Job =
    | { op: "locateFile"; file: Blob }
    | { op: "locateGray"; img: GrayImage }
    | { op: "analyze"; rect: GrayImage; choiceCounts: number[]; page: number }
    | { op: "detect"; img: GrayImage; withLighting: boolean };
export type ScanRequest = Job & { id: number };
export type ScanResponse = { id: number; ok: true; result: unknown } | { id: number; ok: false; unsupported: boolean; message: string };

type PageRead = { readings: QuestionReading[]; problem: string | null } | null;
/** jpeg = ภาพที่ดึงตรงแล้วสำหรับส่งเก็บ (null = ต้องแปลงบนเธรดหลักเอง หรือหน้านี้อ่านไม่ผ่าน) */
export type PageAnalysis = { read: PageRead; shadow: number; jpeg: Blob | null };
export type FrameDetection = { corners: Point[] | null; lighting: number | null };

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let broken = false;
let nextId = 1;
const pending = new Map<number, Pending>();

/** เกิดตอนเรียกครั้งแรก (ไม่โหลดตัวอ่านจนกว่าจะมีคนสแกนจริง) · null = ใช้ worker ไม่ได้ */
function getWorker(): Worker | null {
    if (broken || typeof window === "undefined" || typeof Worker === "undefined") return null;
    // สำหรับสคริปต์ทดสอบ: บังคับทางถอยบนเธรดหลัก (วัดเทียบ + ตรวจว่าทางถอยยังอ่านถูก)
    if ((window as { __paperScanNoWorker?: boolean }).__paperScanNoWorker) return null;
    if (worker) return worker;
    try {
        worker = new Worker(new URL("./scan.worker.ts", import.meta.url), { type: "module" });
    } catch {
        broken = true;
        return null;
    }
    worker.onmessage = (event: MessageEvent<ScanResponse>) => {
        const res = event.data;
        const job = pending.get(res.id);
        if (!job) return;
        pending.delete(res.id);
        if (res.ok) job.resolve(res.result);
        else job.reject(Object.assign(new Error(res.message), { unsupported: res.unsupported }));
    };
    // worker โหลดไม่ขึ้น/พัง — งานที่ค้างอยู่ทั้งหมดถอยไปทำบนเธรดหลัก และไม่ใช้ worker อีกในหน้านี้
    worker.onerror = (event) => {
        event.preventDefault();
        broken = true;
        worker?.terminate();
        worker = null;
        for (const job of pending.values()) job.reject(Object.assign(new Error("WORKER_FAILED"), { workerFailed: true }));
        pending.clear();
    };
    return worker;
}

/** ส่งงานให้ worker · คืน undefined ถ้าต้องทำบนเธรดหลักแทน (ไม่มี worker / worker พัง / เครื่องไม่รองรับงานนี้) */
async function runInWorker<T>(job: Job, transfer: Transferable[] = []): Promise<{ value: T } | undefined> {
    const w = getWorker();
    if (!w) return undefined;
    const id = nextId++;
    try {
        const value = await new Promise<unknown>((resolve, reject) => {
            pending.set(id, { resolve, reject });
            w.postMessage({ ...job, id }, transfer);
        });
        return { value: value as T };
    } catch (err) {
        const e = err as Error & { unsupported?: boolean; workerFailed?: boolean };
        if (e.unsupported || e.workerFailed) return undefined;
        throw err;
    }
}

/** หาแผ่น + อ่าน QR จากไฟล์รูป */
export async function locateFile(file: Blob): Promise<LocatedPage> {
    const done = await runInWorker<LocatedPage>({ op: "locateFile", file });
    if (done) return done.value;
    // ถอดรูปบนเธรดหลัก (เครื่องไม่มี OffscreenCanvas) แล้วยังให้ worker หาแผ่นต่อได้ถ้ามี
    return locateImage(await loadGray(file));
}

/** หาแผ่น + อ่าน QR จากภาพขาวดำที่มีอยู่แล้ว (เฟรมกล้องสด / รูปที่ถอดบนเธรดหลัก) */
export async function locateImage(img: GrayImage): Promise<LocatedPage> {
    if (getWorker()) {
        // ส่งสำเนาแบบ transfer — ต้นฉบับเก็บไว้เผื่อ worker พังกลางทางแล้วต้องทำบนเธรดหลัก
        const copy = { width: img.width, height: img.height, data: img.data.slice() };
        const done = await runInWorker<LocatedPage>({ op: "locateGray", img: copy }, [copy.data.buffer]);
        if (done) return done.value;
    }
    return locateGray(img);
}

/** อ่านวงทั้งหน้า + วัดเงา + แปลงเป็น JPEG — rect ถูกคัดลอกไป (ผู้เรียกยังใช้ต่อ: ภาพแถวตอนยืนยัน / ส่งเก็บ) */
export async function analyzePage(rect: GrayImage, choiceCounts: number[], page: number): Promise<PageAnalysis> {
    const done = await runInWorker<PageAnalysis>({ op: "analyze", rect, choiceCounts, page });
    if (done) return done.value;
    return { read: readPage(rect, choiceCounts, page), shadow: lightingScore(rect, RECTIFY_PX_PER_MM), jpeg: null };
}

/** หากระดาษในเฟรมกล้อง (ภาพย่อ) + วัดเงาถ้าขอ · ภาพถูก transfer ไป (เฟรมใหม่ทุกครั้งอยู่แล้ว) */
export async function detectFrame(img: GrayImage, withLighting: boolean): Promise<FrameDetection> {
    if (!broken && getWorker()) {
        const done = await runInWorker<FrameDetection>({ op: "detect", img, withLighting }, [img.data.buffer]);
        if (done) return done.value;
        if (img.data.byteLength === 0) return { corners: null, lighting: null }; // worker พังหลังรับภาพไปแล้ว — เฟรมถัดไปทำบนเธรดหลัก
    }
    const found = findFiducials(img);
    if (!found.ok) return { corners: null, lighting: null };
    const lighting = withLighting ? lightingScore(rectify(img, homography(FIDUCIALS, found.corners), 2), 2) : null;
    return { corners: found.corners, lighting };
}
