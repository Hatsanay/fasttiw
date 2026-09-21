import { Quote, TrendingUp } from "lucide-react";
import Card from "@/components/ui/Card";
import Reveal from "@/app/components/Reveal";
import type { OutcomeStats } from "@/lib/api";

// ผลสอบจริงที่ลูกค้าแจ้งกลับมาหลังวันสอบ (2026-09-21) — ดู ../CLAUDE.md ข้อ 6.7
//
// นี่คือสิ่งเดียวบนหน้าแรกที่คู่แข่งลอกไม่ได้: ต้องมีลูกค้าที่ไปสอบจริงมาก่อนเป็นรอบๆ ถึงจะมีตัวเลขนี้
//
// **กฎที่ห้ามแก้**: ต้องเขียนกำกับเสมอว่าตัวเลขมาจาก "ผู้ตอบแบบสอบถาม N คน" ไม่ใช่ลูกค้าทั้งหมด —
// คนที่ไม่ผ่านมักไม่ตอบ (survivorship bias) ถ้าเขียนลอยๆ ว่า "ลูกค้าเราผ่าน X%" คือโฆษณาเกินจริง
// และวันที่มีคนจับได้ ความเสียหายมากกว่าที่ได้มาแน่นอน
export default function OutcomeProof({ stats }: { stats: OutcomeStats }) {
    // backend ซ่อนทั้งก้อนเองเมื่อผู้ตอบยังไม่ถึงเกณฑ์ — ฝั่งนี้แค่ไม่เรนเดอร์
    if (!stats.available || !stats.responses || stats.pass_rate === undefined) return null;

    const quotes = stats.testimonials.filter((t) => t.comment?.trim()).slice(0, 3);

    return (
        <section className="max-w-360 mx-auto px-4 sm:px-6 pb-20">
            <Reveal className="text-center mb-10">
                <p className="text-sm font-medium text-brand-600 mb-2">ผลจริงจากคนที่ไปสอบมาแล้ว</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">ตัวเลขจากผู้ใช้จริง ไม่ใช่คำโฆษณา</h2>
            </Reveal>

            <Reveal>
                <Card className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                        <div className="flex items-center gap-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                <TrendingUp size={20} />
                            </span>
                            <div>
                                {/* tabular-nums ให้ตัวเลขไม่ขยับเวลาอัปเดต */}
                                <p className="text-3xl font-semibold text-slate-900 tabular-nums">{stats.pass_rate}%</p>
                                <p className="text-sm text-slate-500">ของผู้ที่ตอบกลับมาว่าสอบผ่าน</p>
                            </div>
                        </div>

                        <div className="hidden sm:block h-12 w-px bg-slate-200" />

                        <div className="text-sm text-slate-600 leading-relaxed">
                            <p>
                                จากผู้ใช้ที่ตอบแบบสอบถามหลังวันสอบและทราบผลแล้ว{" "}
                                <span className="font-medium text-slate-900 tabular-nums">{stats.responses}</span> คน
                                — ผ่าน <span className="font-medium text-slate-900 tabular-nums">{stats.passed}</span> คน
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                เป็นตัวเลขจากผู้ที่ตอบแบบสอบถามเท่านั้น ไม่ใช่ผู้ใช้ทั้งหมดของเรา
                            </p>
                        </div>
                    </div>

                    {quotes.length > 0 && (
                        <div className="mt-6 grid gap-3 sm:grid-cols-3 border-t border-slate-100 pt-6">
                            {quotes.map((t, i) => (
                                <div key={`${t.name}-${i}`} className="rounded-xl bg-slate-50 p-4">
                                    <Quote size={14} className="text-brand-400 mb-2" />
                                    <p className="text-sm text-slate-700 leading-relaxed">{t.comment}</p>
                                    <p className="mt-2 text-xs text-slate-400">
                                        {t.name ?? "ผู้ใช้"} · {t.round_name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </Reveal>
        </section>
    );
}
