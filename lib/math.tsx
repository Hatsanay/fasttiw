import "server-only";
import katex from "katex";
import { Fragment } from "react";
import { splitMath, katexSource } from "./mathParse";
import "katex/dist/katex.min.css";

// ตัวเรนเดอร์สูตรบนหน้าเว็บ — ตรรกะการแยกสูตรอยู่ที่ lib/mathParse.ts (ไม่มี JSX จึงเทสต์ได้ตรงๆ)
//
// **ใช้ได้เฉพาะ server component** (มี server-only กันไว้ — import จาก client component แล้ว build ล้มทันที)
// เพราะ import KaTeX ตรงๆ: ฝั่ง server ไม่มีต้นทุนกับลูกค้าเลย แต่ถ้าหลุดเข้า client bundle ทุกหน้าข้อสอบต้องโหลด
// ~74KB เพิ่ม · client component ให้ใช้ `MathText` จาก lib/mathClient.tsx (โหลด KaTeX เฉพาะตอนเจอสูตรจริง)
// CSS ของ KaTeX import ที่นี่และที่ lib/mathClient.tsx แทนที่ root layout — หน้าที่ไม่มีทางมีสูตร
// (หน้าแรก แคตตาล็อก แพ็กเกจ) จึงไม่ต้องโหลด CSS ก้อนนี้ก่อนแสดงผล
// ระบุชื่อที่ re-export ทีละตัวแทน `export *` เพราะ `export *` ไม่รอดตัวแปลงที่ไม่ได้ bundle ทั้งกราฟ
// (tsx/esbuild ได้ module ที่ไม่มี export เหล่านี้เลย) — ตัวที่ import ผ่าน `@/lib/math` จะพังเงียบๆ
export { splitMath, hasMath, stripMathDelimiters } from "./mathParse";
export type { MathSegment } from "./mathParse";

export function MathText({ text, className }: { text: string | null | undefined; className?: string }) {
    if (!text) return null;

    const segments = splitMath(text);
    return (
        <span className={className}>
            {segments.map((seg, i) =>
                seg.type === "math" ? (
                    <span
                        key={i}
                        // KaTeX คืน HTML ที่ sanitize มาแล้วในโหมด trust: false — ดูเหตุผลด้านบนของไฟล์
                        dangerouslySetInnerHTML={{
                            __html: katex.renderToString(katexSource(seg.value), { throwOnError: false, output: "html" }),
                        }}
                    />
                ) : (
                    // ปล่อยให้ React escape เอง และคง `\$` ที่แอดมินตั้งใจพิมพ์เป็นดอลลาร์จริงไว้
                    <Fragment key={i}>{seg.value.replace(/\\\$/g, "$")}</Fragment>
                )
            )}
        </span>
    );
}
