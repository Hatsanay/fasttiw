import { AlertTriangle, ArrowRight, CalendarClock, Check, Flame, Shuffle, Target, Timer, X } from "lucide-react";
import Link from "next/link";
import Reveal from "@/app/components/Reveal";
import { cn } from "@/lib/cn";

// mockup 3 จุดที่เกิดขึ้น "หลังซื้อแล้ว" (2026-09-21) — คู่แข่งลอกหน้าขายได้ แต่ของพวกนี้ต้องมีข้อมูล
// การทำข้อสอบสะสมของลูกค้าถึงจะทำงาน ลอกหน้าจอไปเฉยๆ แล้วของเขาจะว่างเปล่า
//
// **จัดวางแบบไม่เท่ากันโดยตั้งใจ** (2+1 แล้วตามด้วยแถบเต็ม) — สามกล่องขนาดเท่ากันเรียงกันอ่านแล้วตาไหลผ่าน
// ไม่มีอะไรสะดุด การให้การ์ดแรกกว้างกว่าคือการบอกว่า "อันนี้สำคัญที่สุด" โดยไม่ต้องเขียนว่าสำคัญที่สุด
//
// **ทุกการ์ดกำกับว่า "ตัวอย่าง" + aria-hidden** — ตัวเลขในนี้เป็นภาพประกอบ ไม่ใช่ผลของผู้ใช้จริง
// (ของจริงอยู่ในบล็อก OutcomeProof ซึ่งมาจากแบบสอบถามและมีฐานผู้ตอบกำกับเสมอ)

// ตัวเลขอิงโครงสร้างจริงของ ก.พ. ภาค ก — คิดวิเคราะห์ 50 ข้อ 100 คะแนน · ข้าราชการที่ดี 25 ข้อ 50 คะแนน
// · ภาษาอังกฤษ 25 ข้อ 50 คะแนน (รวม 100 ข้อ 200 คะแนน) ตัวอย่างที่ยกมาจงใจให้เป็นเคส "คะแนนรวมผ่าน
// แต่ตกวิชาเดียว" ซึ่งเป็นเหตุผลทั้งหมดที่ระบบต้องตัดเกณฑ์รายวิชา ไม่ใช่ดูแค่คะแนนรวม
// ⚠ ตัวเลขเกณฑ์ในนี้เป็นภาพประกอบ — เกณฑ์ทางการต้องยึดตามประกาศรับสมัครของรอบนั้นเสมอ
const SUBJECTS = [
    { name: "คิดวิเคราะห์", have: "72/100", rule: "เกณฑ์ 60%", passed: true },
    { name: "ข้าราชการที่ดี", have: "34/50", rule: "เกณฑ์ 60%", passed: true },
    { name: "ภาษาอังกฤษ", have: "20/50", rule: "เกณฑ์ 50%", passed: false },
];

const MOCK_SECTIONS = [
    { name: "คิดวิเคราะห์", count: "50 ข้อ · 100 คะแนน", done: 5 },
    { name: "ข้าราชการที่ดี", count: "25 ข้อ · 50 คะแนน", done: 3 },
    { name: "ภาษาอังกฤษ", count: "25 ข้อ · 50 คะแนน", done: 0 },
];

export default function JourneyMockups() {
    return (
        <section className="max-w-360 mx-auto px-4 sm:px-6 pb-20">
            <Reveal className="text-center mb-10 sm:mb-12">
                <p className="text-sm font-medium text-brand-600 mb-2">หลังซื้อแล้วได้อะไรต่อ</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-balance">
                    ระบบอยู่กับคุณตั้งแต่วันนี้จนถึงวันสอบ
                </h2>
                <p className="mt-3 text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    ไม่ใช่แค่ชุดข้อสอบให้ทำจบแล้วจบกัน — ระบบจำได้ว่าคุณพลาดตรงไหน บอกว่าวันนี้ควรทำอะไร
                    และบอกตรงๆ ว่าถ้าสอบวันนี้จะผ่านหรือยัง
                </p>
            </Reveal>

            <div className="grid gap-5 lg:grid-cols-3">
                {/* ── 1. ถ้าสอบวันนี้ ผ่านไหม — การ์ดเด่น กินสองคอลัมน์ ── */}
                <Reveal className="lg:col-span-2">
                    <article className="group relative h-full overflow-hidden rounded-3xl bg-white p-6 sm:p-8 ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(16,24,40,.06),0_16px_40px_-20px_rgba(16,24,40,.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,40,.06),0_24px_48px_-20px_rgba(16,24,40,.3)]">
                        {/* แสงนุ่มมุมบน ให้การ์ดไม่แบน โดยไม่แย่งความสนใจจากเนื้อหา */}
                        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-brand-100/50 blur-3xl" />

                        {/* sm:h-full — การ์ดนี้สูงตามการ์ดข้างๆ ถ้าเนื้อหาไม่ยืดเต็ม ช่องว่างจะไปกองอยู่ด้านล่างข้างเดียว */}
                        <div className="relative grid gap-6 sm:h-full sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:items-center">
                            <div>
                                <Eyebrow icon={Target} tone="text-brand-600 bg-brand-50">หน้าผลสอบ</Eyebrow>
                                <h3 className="mt-3 text-xl sm:text-2xl font-semibold text-slate-900 text-balance">
                                    รู้ว่าพร้อมหรือยัง ไม่ต้องเดาเอง
                                </h3>
                                <p className="mt-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                                    ทุกครั้งที่ส่งข้อสอบ ระบบตัดเกณฑ์ให้ทั้งคะแนนรวมและรายวิชา —
                                    สนามที่ต้องผ่านทุกวิชาอย่าง ก.พ. ภาค ก จะรู้ทันทีว่าติดวิชาไหน และขาดอีกกี่ข้อ
                                </p>

                                <ul className="mt-4 flex flex-col gap-2">
                                    {[
                                        "ตัดเกณฑ์แยกรายวิชา ไม่ใช่ดูแค่คะแนนรวม",
                                        "บอกตรงๆ ว่าขาดอีกกี่ข้อ/กี่คะแนนถึงจะผ่าน",
                                        "โหมดจับเวลาบอกด้วยว่าทำทันเวลาไหม",
                                    ].map((t) => (
                                        <li key={t} className="flex items-start gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                                                <Check size={10} strokeWidth={3} />
                                            </span>
                                            {t}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* mockup: หน้าต่างแอปจำลอง สไตล์เดียวกับ mockup ใน hero */}
                            <div className="relative" aria-hidden>
                                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/70">
                                    <WindowBar label="ผลสอบ · ก.พ. ภาค ก" />
                                    <div className="p-4">
                                        <p className="text-[10px] text-slate-400 mb-2">ตัวอย่างหน้าผลสอบ</p>

                                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 ring-1 ring-amber-100 px-3 py-2 mb-3">
                                            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                                            <p className="text-xs text-amber-900">
                                                <span className="font-semibold">ยังไม่ผ่าน</span> — ติดภาษาอังกฤษ ขาดอีก 5 คะแนน
                                            </p>
                                        </div>

                                        <div className="mb-1 flex items-center justify-between text-[11px]">
                                            <span className="text-slate-500">คะแนนรวม</span>
                                            <span className="font-semibold text-slate-800 tabular-nums">126/200</span>
                                        </div>
                                        {/* เส้นทึบคือเกณฑ์ผ่าน — จุดที่ทำให้แถบนี้ต่างจาก progress bar ทั่วไป */}
                                        <div className="relative mb-4 h-2.5 rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-linear-to-r from-brand-400 to-brand-600" style={{ width: "63%" }} />
                                            <span className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-slate-900/70" style={{ left: "60%" }} />
                                        </div>

                                        <div className="flex flex-col">
                                            {SUBJECTS.map((s) => (
                                                <div
                                                    key={s.name}
                                                    className="flex items-center gap-2 border-t border-slate-50 py-1.5 text-xs first:border-t-0"
                                                >
                                                    <span
                                                        className={cn(
                                                            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full",
                                                            s.passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                                                        )}
                                                    >
                                                        {s.passed ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                                                    </span>
                                                    <span className="flex-1 truncate text-slate-600">{s.name}</span>
                                                    <span className="font-medium text-slate-800 tabular-nums">{s.have}</span>
                                                    <span className="w-16 text-right text-[10px] text-slate-400">{s.rule}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ป้ายลอย — สไตล์เดียวกับ mockup ใน hero ที่ใช้แล้วได้ผล
                                    วางมุมบนขวาเพราะตรงนั้นเป็นแถบหัวหน้าต่างที่ว่างอยู่ ถ้าวางมุมล่างจะไปบังแถวผลรายวิชา */}
                                <div className="absolute -top-3 -right-3 rotate-3 rounded-xl border border-slate-100 bg-white px-3 py-1.5 shadow-lg shadow-slate-200/80">
                                    <p className="text-[10px] text-slate-400">คะแนนรวมผ่าน แต่ยังติด</p>
                                    <p className="text-sm font-semibold text-amber-600 tabular-nums">1 วิชา</p>
                                </div>
                            </div>
                        </div>
                    </article>
                </Reveal>

                {/* ── 2. แผนทบทวนรายวัน ── */}
                <Reveal delay={100}>
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white p-6 sm:p-7 ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(16,24,40,.06),0_16px_40px_-20px_rgba(16,24,40,.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,40,.06),0_24px_48px_-20px_rgba(16,24,40,.3)]">
                        <div className="pointer-events-none absolute -top-24 -left-16 h-48 w-48 rounded-full bg-brand-100/50 blur-3xl" />

                        <div className="relative">
                            <Eyebrow icon={Flame} tone="text-brand-600 bg-brand-50">แผนรายวัน</Eyebrow>
                            <h3 className="mt-3 text-lg font-semibold text-slate-900">เปิดมาก็รู้ว่าวันนี้ทำอะไร</h3>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                                ตั้งวันสอบไว้ ระบบหารงานที่เหลือให้เป็นรายวัน และนัดถามซ้ำข้อที่เพิ่งแก้ได้โดยเว้นห่างขึ้นเรื่อยๆ
                            </p>
                        </div>

                        <div className="relative mt-5" aria-hidden>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-[10px] text-slate-400">ตัวอย่างแผนของวันนี้</p>
                                    <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-brand-700 ring-1 ring-brand-100">
                                        <CalendarClock size={10} />
                                        เหลือ 43 วัน
                                    </span>
                                </div>

                                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-900/5">
                                    <div className="flex items-end justify-between">
                                        <p className="text-xs text-slate-500">วันนี้ควรทำ</p>
                                        <p className="text-2xl font-semibold leading-none text-slate-900 tabular-nums">12</p>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-linear-to-r from-brand-400 to-brand-600" style={{ width: "58%" }} />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-400">ทำไปแล้ว 7 จาก 12 ข้อ</p>
                                </div>

                                <div className="mt-3 flex flex-col gap-1.5 text-[11px]">
                                    <MiniRow dot="bg-red-400" label="ยังตอบผิดอยู่" value="31 ข้อ" />
                                    <MiniRow dot="bg-amber-400" label="ถึงกำหนดทวนวันนี้" value="5 ข้อ" />
                                    <MiniRow dot="bg-green-500" label="แก้ได้แล้ว รอทวนรอบหน้า" value="47 ข้อ" />
                                </div>
                            </div>
                        </div>
                    </article>
                </Reveal>

                {/* ── 3. สนามสอบเสมือนจริง — การ์ดสีเข้มเต็มแถว ให้บรรยากาศ "ห้องสอบ" ── */}
                <Reveal delay={200} className="lg:col-span-3">
                    <article className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-600 to-brand-700 p-6 sm:p-8 shadow-[0_20px_50px_-24px_rgba(43,92,230,.55)]">
                        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

                        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center">
                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 ring-1 ring-white/15">
                                    <Timer size={12} />
                                    สนามสอบเสมือน
                                </span>
                                <h3 className="mt-3 text-xl sm:text-2xl font-semibold text-white text-balance">
                                    ซ้อมเหมือนวันจริงทั้งสนาม ไม่ใช่ทีละชุด
                                </h3>
                                <p className="mt-2.5 max-w-xl text-sm sm:text-[15px] leading-relaxed text-brand-50/90">
                                    ทำข้ามชุดตามโครงสร้างสนามจริง จับเวลาเต็มรูปแบบ ตัดผ่านรายวิชา
                                    และ<span className="text-white font-medium">สุ่มข้อใหม่ทุกครั้ง</span> — ยิ่งมีหลายชุด ข้อยิ่งไม่ซ้ำ
                                </p>
                                <Link
                                    href="/products"
                                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
                                >
                                    ดูแนวข้อสอบทั้งหมด
                                    <ArrowRight size={16} />
                                </Link>
                            </div>

                            <div aria-hidden className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-[10px] text-brand-50/70">ตัวอย่างสนามสอบเสมือน</p>
                                    <span className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 tabular-nums">
                                        <Timer size={11} />
                                        02:47:12
                                    </span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {MOCK_SECTIONS.map((s) => (
                                        <div key={s.name}>
                                            <div className="mb-1.5 flex items-center justify-between text-xs">
                                                <span className="text-white">{s.name}</span>
                                                <span className="text-brand-50/70 tabular-nums">{s.count}</span>
                                            </div>
                                            {/* ช่องแทนความคืบหน้าในวิชานั้น — สื่อว่า "ทำไปถึงไหน" โดยไม่ต้องใส่ตัวเลขซ้ำ */}
                                            <div className="flex gap-1">
                                                {Array.from({ length: 8 }).map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={cn(
                                                            "h-1.5 flex-1 rounded-full",
                                                            i < s.done ? "bg-white" : "bg-white/25"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-2 text-[11px] text-brand-50/90">
                                    <span className="flex items-center gap-1.5">
                                        <Shuffle size={12} className="shrink-0 text-white" />
                                        สุ่มข้อใหม่ทุกครั้งจากชุดที่คุณมีสิทธิ์
                                    </span>
                                    <span className="tabular-nums text-brand-50/70">รวม 100 ข้อ · 200 คะแนน</span>
                                </div>
                            </div>
                        </div>
                    </article>
                </Reveal>
            </div>
        </section>
    );
}

function Eyebrow({ icon: Icon, tone, children }: { icon: typeof Target; tone: string; children: React.ReactNode }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", tone)}>
            <Icon size={12} />
            {children}
        </span>
    );
}

// แถบหัวหน้าต่างแบบเดียวกับ mockup ใน hero — ทำให้ภาพในการ์ด "อ่านว่าเป็นหน้าจอ" ทันทีโดยไม่ต้องอธิบาย
function WindowBar({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-red-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-green-300" />
            <span className="ml-1.5 truncate text-[10px] text-slate-400">{label}</span>
        </div>
    );
}

function MiniRow({ dot, label, value }: { dot: string; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
            <span className="flex-1 truncate text-slate-500">{label}</span>
            <span className="font-medium text-slate-700 tabular-nums">{value}</span>
        </div>
    );
}
