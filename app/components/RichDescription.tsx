import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

// คำอธิบายสินค้า/แพ็กเกจที่แอดมินพิมพ์เป็นข้อความธรรมดา → ย่อหน้า + หัวข้อย่อย + รายการติ๊กถูก
// แอดมินพิมพ์แบบที่คนทั่วไปพิมพ์อยู่แล้ว ไม่ต้องรู้ markdown:
//   - ขึ้นบรรทัดใหม่ = ย่อหน้าใหม่
//   - บรรทัดที่ขึ้นต้นด้วย "- " / "• " / "* " = รายการ
//   - บรรทัดสั้นๆ ที่อยู่ก่อนรายการทันที (เช่น "ภายในแพ็กเกจ") = หัวข้อของรายการนั้น
// ข้อความเก่าที่ไม่มีรายการแสดงเป็นย่อหน้าเหมือนเดิม (เดิม whitespace-pre-line) · ไม่ฝัง HTML ดิบ — React escape ให้เอง

type Block = { kind: "p"; text: string } | { kind: "heading"; text: string } | { kind: "list"; items: string[] };

const BULLET = /^[-•*]\s+/;
/** บรรทัดก่อนรายการที่ยาวไม่เกินนี้และไม่จบด้วยจุด/ทวิภาคยาวๆ = หัวข้อ (ยาวกว่านี้คือย่อหน้าที่บังเอิญอยู่ก่อนรายการ) */
const HEADING_MAX = 40;

export function parseDescription(text: string): Block[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const blocks: Block[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (BULLET.test(line)) {
            const last = blocks[blocks.length - 1];
            const item = line.replace(BULLET, "");
            if (last?.kind === "list") last.items.push(item);
            else blocks.push({ kind: "list", items: [item] });
            continue;
        }
        const next = lines.slice(i + 1).find(Boolean);
        const isHeading = !!next && BULLET.test(next) && line.length <= HEADING_MAX && !/[.]$/.test(line);
        blocks.push(isHeading ? { kind: "heading", text: line.replace(/[:：]$/, "") } : { kind: "p", text: line });
    }
    return blocks;
}

export default function RichDescription({ text, className }: { text: string; className?: string }) {
    const blocks = parseDescription(text);
    return (
        <div className={cn("space-y-3 text-slate-600 leading-relaxed", className)}>
            {blocks.map((b, i) => {
                if (b.kind === "heading") return <p key={i} className="pt-1 font-semibold text-slate-800">{b.text}</p>;
                if (b.kind === "list")
                    return (
                        <ul key={i} className="grid gap-2 sm:grid-cols-2">
                            {b.items.map((item, j) => (
                                <li key={j} className="flex items-start gap-2">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                                        <Check size={13} strokeWidth={2.5} />
                                    </span>
                                    <span className="text-slate-700">{item}</span>
                                </li>
                            ))}
                        </ul>
                    );
                return <p key={i}>{b.text}</p>;
            })}
        </div>
    );
}
