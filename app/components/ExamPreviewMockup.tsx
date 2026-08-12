import {
    Check,
    X,
    BookOpenCheck,
    Signal,
    Wifi,
    BatteryFull,
    Timer,
    BookOpen,
    BookmarkCheck,
    History,
    BadgePercent,
    LayoutGrid,
    GraduationCap,
    NotebookPen,
    QrCode,
    Download,
} from "lucide-react";

// mockup หน้าจอทำข้อสอบ/เฉลย ใช้แทนรูปภาพจริงในหน้า landing — โชว์จุดขายหลัก (เฉลยละเอียด
// ทีละขั้นตอน) ให้เห็นภาพจริงแทนการบรรยายด้วยตัวหนังสือเฉยๆ
// การสลับ/rotate อยู่ที่ Hero.tsx (ต้องสลับคู่กับข้อความหัวเรื่องด้วย ไม่ใช่แค่รูป)
export function DesktopMockup() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                {/* การ์ดหลัก */}
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <BookOpenCheck size={12} />
                            แนวข้อสอบ ก.พ.
                        </span>
                    </div>

                    <div className="p-5">
                        <p className="text-xs text-slate-400 mb-2">ข้อ 12 จาก 30</p>
                        <p className="font-medium text-slate-800 mb-4 leading-relaxed">อนุกรมต่อไปนี้ 2, 4, 8, 16, ... ตัวเลขถัดไปคือข้อใด?</p>

                        <div className="flex flex-col gap-2 mb-4">
                            <div className="flex items-center justify-between rounded-lg border-2 border-green-300 bg-green-50 px-3 py-2 text-sm">
                                <span className="text-slate-700">32</span>
                                <Check size={15} className="text-green-600" />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-sm">
                                <span className="text-slate-700">24</span>
                                <X size={15} className="text-red-500" />
                            </div>
                            <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-400">28</div>
                            <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-400">30</div>
                        </div>

                        <div className="rounded-lg bg-brand-50/70 border border-brand-100 p-3">
                            <p className="text-[11px] font-medium text-brand-700 mb-1">วิธีคิด</p>
                            <p className="text-xs text-slate-600 leading-relaxed">แต่ละพจน์คูณด้วย 2 เสมอ (2×2=4, 4×2=8, 8×2=16) ดังนั้น 16×2 = 32</p>
                        </div>
                    </div>
                </div>

                {/* badge ลอย */}
                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">คะแนนล่าสุด</p>
                    <p className="text-lg font-semibold text-brand-600">92%</p>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Check size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">เฉลยละเอียดทุกข้อ</span>
                </div>
            </div>
        </div>
    );
}

export function MobileMockup() {
    return (
        <div className="flex items-center justify-center py-6">
            <div className="relative">
                {/* กรอบมือถือ */}
                <div className="relative -rotate-2 w-57.5 sm:w-62.5 rounded-[2.5rem] border-10 border-slate-900 bg-slate-900 shadow-xl shadow-slate-300/70 overflow-hidden">
                    <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900" />

                    <div className="rounded-3xl overflow-hidden bg-white">
                        {/* status bar */}
                        <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[10px] text-slate-500">
                            <span>9:41</span>
                            <div className="flex items-center gap-1">
                                <Signal size={11} />
                                <Wifi size={11} />
                                <BatteryFull size={13} />
                            </div>
                        </div>

                        {/* app header */}
                        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-600 text-white">
                                <BookOpenCheck size={11} />
                            </span>
                            <span className="text-xs font-medium text-slate-700">แนวข้อสอบ ก.พ.</span>
                        </div>

                        {/* เนื้อหา (โจทย์เดียวกัน ย่อให้พอดีจอมือถือ) */}
                        <div className="p-4">
                            <p className="text-[10px] text-slate-400 mb-1.5">ข้อ 12 จาก 30</p>
                            <p className="text-xs font-medium text-slate-800 mb-3 leading-relaxed">
                                อนุกรมต่อไปนี้ 2, 4, 8, 16, ... ตัวเลขถัดไปคือข้อใด?
                            </p>

                            <div className="flex flex-col gap-1.5 mb-3">
                                <div className="flex items-center justify-between rounded-lg border-2 border-green-300 bg-green-50 px-2.5 py-1.5 text-xs">
                                    <span className="text-slate-700">32</span>
                                    <Check size={12} className="text-green-600" />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border-2 border-red-200 bg-red-50 px-2.5 py-1.5 text-xs">
                                    <span className="text-slate-700">24</span>
                                    <X size={12} className="text-red-500" />
                                </div>
                                <div className="rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs text-slate-400">28</div>
                            </div>

                            <div className="rounded-lg bg-brand-50/70 border border-brand-100 p-2.5">
                                <p className="text-[9px] font-medium text-brand-700 mb-0.5">วิธีคิด</p>
                                <p className="text-[10px] text-slate-600 leading-relaxed">แต่ละพจน์คูณด้วย 2 เสมอ ดังนั้น 16×2 = 32</p>
                            </div>
                        </div>

                        {/* home indicator */}
                        <div className="flex justify-center pb-2 pt-1">
                            <div className="h-1 w-24 rounded-full bg-slate-200" />
                        </div>
                    </div>
                </div>

                {/* badge ลอย เน้นข้อความใช้งานผ่านมือถือ */}
                <div className="absolute -right-4 sm:-right-10 top-14 rotate-6 max-w-34 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[11px] font-medium text-brand-700 leading-snug">ใช้ง่าย มือถือเครื่องเดียวก็ติวได้</p>
                </div>
                <div className="absolute -left-4 sm:-left-8 bottom-16 -rotate-3 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Check size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">ทำได้ทุกที่ทุกเวลา</span>
                </div>
            </div>
        </div>
    );
}

export function ResultsMockup() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <BookOpenCheck size={12} />
                            ผลสอบ
                        </span>
                    </div>

                    <div className="p-5 text-center">
                        <p className="text-xs text-slate-400 mb-1">แนวข้อสอบ ก.พ. — โหมดฝึก</p>
                        <p className="text-5xl font-semibold text-brand-600 mb-1">88%</p>
                        <p className="text-sm text-slate-400 mb-5">ตอบถูก 26 จาก 30 ข้อ</p>

                        <div className="rounded-lg border border-slate-100 p-3 text-left mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-slate-400">ข้อ 12</span>
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                    <Check size={10} />
                                    ถูก
                                </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">อนุกรมต่อไปนี้ 2, 4, 8, 16, ...</p>
                        </div>

                        <div className="rounded-full bg-brand-600 py-2.5 text-sm font-medium text-white">ดูเฉลยรายข้อ</div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Check size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">ดูผลได้ทันที</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">ไม่ใช่ไฟล์</p>
                    <p className="text-sm font-semibold text-brand-600">PDF</p>
                </div>
            </div>
        </div>
    );
}

export function ModeSelectMockup() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <BookOpenCheck size={12} />
                            เลือกโหมดทำข้อสอบ
                        </span>
                    </div>

                    <div className="p-5">
                        <div className="flex flex-col gap-3 mb-4">
                            <div className="relative rounded-xl border-2 border-brand-500 bg-brand-50/50 p-3.5">
                                <span className="absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                                    <Check size={10} />
                                </span>
                                <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                                    <BookOpen size={14} />
                                </span>
                                <p className="text-sm font-medium text-slate-800">โหมดฝึก</p>
                                <p className="text-xs text-slate-500">ตอบแล้วเห็นเฉลยทันที</p>
                            </div>
                            <div className="rounded-xl border-2 border-slate-200 p-3.5">
                                <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <Timer size={14} />
                                </span>
                                <p className="text-sm font-medium text-slate-800">โหมดจับเวลา</p>
                                <p className="text-xs text-slate-500">จำลองสอบจริง 60 นาที</p>
                            </div>
                        </div>

                        <div className="rounded-full bg-brand-600 py-2.5 text-center text-sm font-medium text-white">เริ่มทำข้อสอบ</div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                        <Timer size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">เลือกได้ 2 โหมด</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">จับเวลา</p>
                    <p className="text-sm font-semibold text-brand-600">60 นาที</p>
                </div>
            </div>
        </div>
    );
}

export function BookmarkMockup() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <BookOpenCheck size={12} />
                            ข้อที่บันทึกไว้
                        </span>
                    </div>

                    <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <p className="text-sm font-medium text-slate-800 leading-relaxed">อนุกรมต่อไปนี้ 2, 4, 8, 16, ... ตัวเลขถัดไปคือข้อใด?</p>
                            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                                <BookmarkCheck size={13} />
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 mb-3">
                            <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm">
                                <span className="text-slate-700">32</span>
                                <Check size={14} className="text-green-600" />
                            </div>
                            <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-400">24</div>
                        </div>

                        <div className="rounded-lg bg-brand-50/70 border border-brand-100 p-3">
                            <p className="text-[11px] font-medium text-brand-700 mb-1">วิธีคิด</p>
                            <p className="text-xs text-slate-600 leading-relaxed">แต่ละพจน์คูณด้วย 2 เสมอ ดังนั้น 16×2 = 32</p>
                        </div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <BookmarkCheck size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">บันทึกแล้ว 14 ข้อ</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">ทบทวนเฉพาะ</p>
                    <p className="text-sm font-semibold text-brand-600">ข้อที่พลาด</p>
                </div>
            </div>
        </div>
    );
}

export function HistoryMockup() {
    const rows = [
        { icon: BookOpen, label: "โหมดฝึก", name: "แนวข้อสอบ ก.พ.", date: "2 ก.ค. 68", score: "88%" },
        { icon: Timer, label: "โหมดจับเวลา", name: "แนวข้อสอบ ครูผู้ช่วย", date: "28 มิ.ย. 68", score: "76%" },
        { icon: BookOpen, label: "โหมดฝึก", name: "แนวข้อสอบ นายสิบตำรวจ", date: "24 มิ.ย. 68", score: "95%" },
    ];

    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <BookOpenCheck size={12} />
                            ประวัติการทำข้อสอบ
                        </span>
                    </div>

                    <div className="p-4 flex flex-col gap-2.5">
                        {rows.map((r) => (
                            <div key={r.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                    <r.icon size={14} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                                    <p className="text-[11px] text-slate-400">{r.label} • {r.date}</p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-brand-600">{r.score}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <History size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">ย้อนดูได้ทุกครั้ง</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">ทำไปแล้ว</p>
                    <p className="text-sm font-semibold text-brand-600">3 ชุด</p>
                </div>
            </div>
        </div>
    );
}

export function PricingMockup() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <BookOpenCheck size={12} />
                            แนวข้อสอบ ก.พ.
                        </span>
                    </div>

                    <div className="p-5">
                        <p className="text-xs text-slate-400 mb-1">ใช้งานได้จนหมดอายุ 6 เดือน</p>
                        <div className="flex items-end gap-1.5 mb-4">
                            <p className="text-4xl font-semibold text-brand-600">99</p>
                            <p className="mb-1 text-sm text-slate-400">บาท</p>
                        </div>

                        <div className="flex flex-col gap-2 mb-4">
                            {["โจทย์ 30 ข้อ พร้อมเฉลยละเอียด", "ทำได้ไม่จำกัดจำนวนครั้ง", "ทบทวนข้อที่เคยพลาดได้ตลอด"].map((t) => (
                                <div key={t} className="flex items-center gap-2 text-sm text-slate-600">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                                        <Check size={10} />
                                    </span>
                                    {t}
                                </div>
                            ))}
                        </div>

                        <div className="rounded-full bg-brand-600 py-2.5 text-center text-sm font-medium text-white">เริ่มทำข้อสอบ</div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <BadgePercent size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">มีโค้ดส่วนลด</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">ถูกกว่า</p>
                    <p className="text-sm font-semibold text-brand-600">หนังสือ 1 เล่ม</p>
                </div>
            </div>
        </div>
    );
}

export function CatalogMockup() {
    const items = [
        { badge: "ก.พ.", name: "แนวข้อสอบ ก.พ. ภาค ก", price: "99 บาท" },
        { badge: "ครู", name: "แนวข้อสอบ ครูผู้ช่วย", price: "129 บาท" },
        { badge: "ตำรวจ", name: "แนวข้อสอบ นายสิบตำรวจ", price: "99 บาท" },
        { badge: "ท้องถิ่น", name: "แนวข้อสอบ ท้องถิ่น", price: "119 บาท" },
    ];

    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <LayoutGrid size={12} />
                            แนวข้อสอบทั้งหมด
                        </span>
                    </div>

                    <div className="p-4">
                        <div className="grid grid-cols-2 gap-2.5">
                            {items.map((it) => (
                                <div key={it.name} className="rounded-xl border border-slate-100 p-2.5">
                                    <span className="mb-1.5 inline-block rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-medium text-brand-600">
                                        {it.badge}
                                    </span>
                                    <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">{it.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-brand-600">{it.price}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">มีให้เลือก</p>
                    <p className="text-lg font-semibold text-brand-600">20+ ชุด</p>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <LayoutGrid size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">หลายสนามสอบ</span>
                </div>
            </div>
        </div>
    );
}

export function UniversityMockup() {
    const items = [
        { badge: "TGAT", name: "แนวข้อสอบ TGAT ความถนัดทั่วไป", price: "129 บาท" },
        { badge: "PAT 1", name: "แนวข้อสอบ PAT 1 คณิตศาสตร์", price: "149 บาท" },
        { badge: "วิชาสามัญ", name: "แนวข้อสอบ วิชาสามัญ ภาษาไทย", price: "99 บาท" },
        { badge: "GAT", name: "แนวข้อสอบ GAT เชื่อมโยง", price: "129 บาท" },
    ];

    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <GraduationCap size={12} />
                            เตรียมสอบเข้ามหาวิทยาลัย
                        </span>
                    </div>

                    <div className="p-4">
                        <div className="grid grid-cols-2 gap-2.5">
                            {items.map((it) => (
                                <div key={it.name} className="rounded-xl border border-slate-100 p-2.5">
                                    <span className="mb-1.5 inline-block rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-medium text-brand-600">
                                        {it.badge}
                                    </span>
                                    <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">{it.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-brand-600">{it.price}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <GraduationCap size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">สอบเข้ามหาวิทยาลัย</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">ครอบคลุม</p>
                    <p className="text-sm font-semibold text-brand-600">TCAS ทุกรอบ</p>
                </div>
            </div>
        </div>
    );
}

export function CourseworkMockup() {
    const items = [
        { badge: "ACC1101", name: "การบัญชีขั้นต้น 1 (เตรียมสอบ ม.ราม)", price: "89 บาท" },
        { badge: "ECO1101", name: "เศรษฐศาสตร์เบื้องต้น (เตรียมสอบ ม.ราม)", price: "89 บาท" },
        { badge: "LAW1001", name: "ความรู้เบื้องต้นเกี่ยวกับกฎหมาย", price: "99 บาท" },
        { badge: "MGT1000", name: "องค์การและการจัดการ", price: "89 บาท" },
    ];

    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <NotebookPen size={12} />
                            สอบประจำภาคเรียน
                        </span>
                    </div>

                    <div className="p-4">
                        <div className="grid grid-cols-2 gap-2.5">
                            {items.map((it) => (
                                <div key={it.name} className="rounded-xl border border-slate-100 p-2.5">
                                    <span className="mb-1.5 inline-block rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-medium text-brand-600">
                                        {it.badge}
                                    </span>
                                    <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">{it.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-brand-600">{it.price}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <NotebookPen size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">รายวิชามหาวิทยาลัย</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">กลางภาค</p>
                    <p className="text-sm font-semibold text-brand-600">ปลายภาค</p>
                </div>
            </div>
        </div>
    );
}

export function QrPaymentMockup() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                        <span className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                            <QrCode size={12} />
                            ชำระเงิน
                        </span>
                    </div>

                    <div className="p-5 text-center">
                        <p className="text-xs text-slate-400 mb-1">แนวข้อสอบ ก.พ. — ยอดชำระ</p>
                        <p className="text-2xl font-semibold text-brand-600 mb-4">99 บาท</p>

                        <div className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-xl border-2 border-slate-100 bg-white">
                            <QrCode size={88} className="text-slate-800" />
                        </div>

                        <p className="text-xs text-slate-400 mb-4">สแกนด้วยแอปธนาคารเพื่อชำระผ่านพร้อมเพย์</p>

                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-green-600">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100">
                                <Check size={10} />
                            </span>
                            รอการยืนยันอัตโนมัติ
                        </div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <QrCode size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">จ่ายผ่าน QR</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">ไม่ต้อง</p>
                    <p className="text-sm font-semibold text-brand-600">กรอกบัตร</p>
                </div>
            </div>
        </div>
    );
}

// สไตล์ต่างจากมุมมองอื่น (ไม่ใช้ browser chrome/มือถือ) เพราะสื่อว่านี่คือ "ไฟล์" ที่ดาวน์โหลดออกไปได้
// จริงๆ ไม่ใช่แค่หน้าจอในแอป — ใส่ลายน้ำจางๆ ทะแยงมุมเลียนแบบของจริงในไฟล์ PDF ที่ export ออกไปด้วย
export function PdfDownloadMockup() {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-none">
                <div className="relative rotate-1 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                            <Download size={12} className="shrink-0" />
                            fasttiw-แนวข้อสอบ-ก.พ.pdf
                        </span>
                        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-500">PDF</span>
                    </div>

                    <div className="relative overflow-hidden p-5">
                        <p className="pointer-events-none absolute inset-0 flex -rotate-12 items-center justify-center text-4xl font-bold text-slate-100 select-none">
                            FASTTIW
                        </p>

                        <div className="relative">
                            <p className="text-xs text-slate-400 mb-2">ข้อ 12.</p>
                            <p className="font-medium text-slate-800 mb-4 leading-relaxed">อนุกรมต่อไปนี้ 2, 4, 8, 16, ... ตัวเลขถัดไปคือข้อใด?</p>

                            <div className="flex flex-col gap-2 mb-4">
                                <div className="flex items-center justify-between rounded-lg border-2 border-green-300 bg-green-50 px-3 py-2 text-sm">
                                    <span className="text-slate-700">ก. 32</span>
                                    <Check size={15} className="text-green-600" />
                                </div>
                                <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-400">ข. 24</div>
                            </div>

                            <div className="rounded-lg bg-brand-50/70 border border-brand-100 p-3">
                                <p className="text-[11px] font-medium text-brand-700 mb-1">วิธีคิด</p>
                                <p className="text-xs text-slate-600 leading-relaxed">แต่ละพจน์คูณด้วย 2 เสมอ ดังนั้น 16×2 = 32</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute -top-4 -right-3 sm:-right-6 rotate-6 flex items-center gap-1.5 rounded-full bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <Download size={12} />
                    </span>
                    <span className="text-xs font-medium text-slate-600">โหลดเก็บไว้ฝึกได้</span>
                </div>
                <div className="absolute -bottom-4 -left-3 sm:-left-6 -rotate-3 rounded-xl bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] text-slate-400">พร้อมพิมพ์</p>
                    <p className="text-sm font-semibold text-brand-600">กระดาษ A4</p>
                </div>
            </div>
        </div>
    );
}
