"use client";

import { Fragment, Suspense, use } from "react";
import type katexType from "katex";
import { splitMath, hasMath } from "./mathParse";
import "katex/dist/katex.min.css";

// MathText สำหรับ client component (หน้าทำข้อสอบ ตัวอย่างฟรี แบบทดสอบวัดระดับ ฯลฯ) — 2026-09-24
//
// **ทำไมแยกจาก lib/math.tsx**: KaTeX หนัก ~74KB (บีบอัดแล้ว) ถ้า import ตรงๆ ใน client component ทุกหน้าที่มี
// ข้อสอบต้องโหลดก้อนนี้ก่อนใช้งานได้ ทั้งที่โจทย์เกือบทั้งหมดไม่มีสูตรเลย · ตัวนี้โหลด KaTeX **เฉพาะตอนเจอข้อความ
// ที่มีสูตรจริง** ข้อความธรรมดาแสดงทันทีโดยไม่แตะ KaTeX เลย
//
// **ไม่มีจังหวะที่ลูกค้าเห็น LaTeX ดิบ**: ตอนเรนเดอร์ฝั่ง server (SSR) `import("katex")` เสร็จก่อนส่ง HTML ออกไป
// หน้าเว็บจึงมาพร้อมสูตรที่วาดเสร็จแล้ว ส่วนในเบราว์เซอร์ React คง HTML เดิมไว้ระหว่างรอ KaTeX โหลด (hydrate
// ทีหลังเงียบๆ) · กรณีที่สูตรโผล่ใหม่หลังโหลดหน้าแล้ว (กดไปข้อถัดไปครั้งแรก) ระหว่างรอเสี้ยววินาทีจะแสดงเนื้อสูตร
// แบบตัวอักษรธรรมดาแทน ไม่ใช่ช่องว่าง
//
// server component ให้ใช้ `MathText` จาก lib/math.tsx แทน — วาดสูตรเสร็จบน server ไม่ส่ง JavaScript ไปเลย

type Katex = typeof katexType;
let katexPromise: Promise<Katex> | null = null;
// promise ตัวเดียวทั้งแอป — `use()` จำได้ว่าตัวนี้เสร็จแล้ว ข้อถัดไปจึงไม่ต้องรออีก
const loadKatex = () => (katexPromise ??= import("katex").then((m) => m.default));

function MathSegment({ latex }: { latex: string }) {
    const katex = use(loadKatex());
    return (
        <span
            // KaTeX คืน HTML ที่ sanitize มาแล้วในโหมด trust: false (ค่าเริ่มต้น) — ดูเหตุผลที่ lib/mathParse.ts
            dangerouslySetInnerHTML={{ __html: katex.renderToString(latex, { throwOnError: false, output: "html" }) }}
        />
    );
}

export function MathText({ text, className }: { text: string | null | undefined; className?: string }) {
    if (!text) return null;
    // ทางลัดของข้อความส่วนใหญ่ — ไม่มีสูตร = ไม่โหลด KaTeX
    if (!hasMath(text)) return <span className={className}>{text.replace(/\\\$/g, "$")}</span>;

    return (
        <span className={className}>
            {splitMath(text).map((seg, i) =>
                seg.type === "math" ? (
                    <Suspense key={i} fallback={<span className="font-mono">{seg.value}</span>}>
                        <MathSegment latex={seg.value} />
                    </Suspense>
                ) : (
                    <Fragment key={i}>{seg.value.replace(/\\\$/g, "$")}</Fragment>
                )
            )}
        </span>
    );
}
