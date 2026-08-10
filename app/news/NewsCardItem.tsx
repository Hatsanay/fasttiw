import Link from "next/link";
import Image from "next/image";

// การ์ด 1 ใบ — ใช้ร่วมกันทั้ง widget "Card" เดี่ยว (เต็มความกว้าง) และแต่ละชิ้นในแถวเลื่อนของ "ชุด Card"
// (คนละขนาดจริงบนจอกันมาก จึงรับ sizes แยกจากผู้เรียกแทนที่จะเดาค่าเดียวตายตัว)
// fillHeight — ใช้ตอนอยู่ในช่องของ widget "สร้างเอง" บนเดสก์ท็อป (ช่องมีความสูงตายตัวจากกริดที่แอดมินจัดวางไว้
// แล้ว ผ่านมาจนถึงระดับนี้เป็น h-full จริงจาก CardRow) รูปจึงต้องยืด (flex-1) กินพื้นที่ที่เหลือหลังหักข้อความ
// แทนที่จะบังคับสัดส่วน 16:9 ของตัวเอง (ซึ่งจะสูงเกินช่องที่จัดไว้ ล้นทับ component ถัดไปข้างล่าง)
export default function NewsCardItem({ imageUrl, title, text, linkUrl, linkLabel, sizes = "(max-width: 640px) 100vw, 400px", fillHeight }: {
    imageUrl: string | null; title: string | null; text: string | null; linkUrl: string | null; linkLabel: string | null; sizes?: string; fillHeight?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white flex flex-col h-full">
            {imageUrl && (
                <div className="relative w-full bg-slate-100" style={fillHeight ? { flex: 1 } : { aspectRatio: "16 / 9" }}>
                    <Image src={imageUrl} alt="" fill className="object-cover" sizes={sizes} />
                </div>
            )}
            <div className="p-4 flex flex-col gap-1.5">
                {title && <h3 className="font-semibold text-slate-900">{title}</h3>}
                {text && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{text}</p>}
                {linkUrl && (
                    <Link
                        href={linkUrl}
                        target={linkUrl.startsWith("http") ? "_blank" : undefined}
                        rel={linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="mt-1 text-sm font-medium text-brand-600 hover:text-brand-700 self-start"
                    >
                        {linkLabel || "ดูเพิ่มเติม"} →
                    </Link>
                )}
            </div>
        </div>
    );
}
