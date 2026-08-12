import Link from "next/link";
import { ListChecks, Timer, Bookmark, PenLine, SquareLibrary, PencilLine, CheckCheck, ArrowRight, Check, X } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ProductCard from "@/app/components/ProductCard";
import Hero from "@/app/components/Hero";
import Reveal from "@/app/components/Reveal";
import CategoryShowcase from "@/app/components/CategoryShowcase";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import NewsFeedCard from "@/app/news/NewsFeedCard";
import { getPublicProducts, getPublicCategories, getPopularProducts, getLandingNewsBlocks } from "@/lib/api";

const HIGHLIGHTS = [
    {
        icon: PenLine,
        title: "เฉลยละเอียดทีละขั้นตอน",
        description: "ไม่ใช่แค่บอกว่าข้อไหนถูก แต่อธิบายวิธีคิดและเหตุผลว่าทำไมตัวเลือกอื่นผิด",
    },
    {
        icon: ListChecks,
        title: "ทำข้อสอบได้จริงบนเว็บ",
        description: "ไม่ใช่ไฟล์ PDF ทำโจทย์ ส่งคำตอบ ดูผลได้ทันทีบนเว็บไซต์",
    },
    {
        icon: Timer,
        title: "โหมดฝึก และโหมดจับเวลา",
        description: "เลือกฝึกแบบเห็นเฉลยทันที หรือจำลองสถานการณ์สอบจริงแบบจับเวลา",
    },
    {
        icon: Bookmark,
        title: "บันทึกข้อที่ทำผิดไว้ทบทวน",
        description: "กลับมาดูเฉพาะข้อที่เคยพลาดได้ง่ายๆ ไม่ต้องไล่ทำใหม่ทั้งชุด",
    },
];

const STEPS = [
    { icon: SquareLibrary, title: "เลือกแนวข้อสอบ", description: "เลือกชุดข้อสอบที่ตรงกับสนามสอบที่กำลังเตรียมตัว" },
    { icon: PencilLine, title: "ลงมือทำจริง", description: "ทำโจทย์บนเว็บ เลือกโหมดฝึกหรือจับเวลาตามที่ต้องการ" },
    { icon: CheckCheck, title: "ดูเฉลยทุกข้อ", description: "เข้าใจวิธีคิดและจุดผิดพลาดของตัวเองก่อนสอบจริง" },
];

export default async function HomePage() {
    const [{ data: products }, categories, popularProducts, landingNews] = await Promise.all([
        getPublicProducts({ limit: 100 }),
        getPublicCategories(),
        getPopularProducts(),
        getLandingNewsBlocks(),
    ]);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
                <Hero />

                {/* How it works */}
                <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-20">
                    <Reveal className="text-center mb-12">
                        <p className="text-sm font-medium text-brand-600 mb-2">ใช้งานง่ายใน 3 ขั้นตอน</p>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">เริ่มเตรียมสอบได้ทันที</h2>
                    </Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
                        {STEPS.map((s, i) => (
                            <Reveal key={s.title} delay={i * 120} className="relative text-center flex flex-col items-center">
                                {i < STEPS.length - 1 && (
                                    <div className="hidden sm:block absolute top-8 left-1/2 w-full h-px bg-linear-to-r from-brand-200 to-transparent" />
                                )}
                                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-brand-100 shadow-sm shadow-brand-100 text-brand-600 mb-4">
                                    <s.icon size={26} />
                                </div>
                                <h3 className="font-medium text-slate-800 mb-1.5">
                                    <span className="text-brand-500 mr-1.5">{i + 1}.</span>
                                    {s.title}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-[16rem]">{s.description}</p>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* Highlights */}
                <section className="relative overflow-hidden bg-slate-50/70 border-y border-slate-100">
                    <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-100/40 blur-3xl" />

                    <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-20">
                        <Reveal className="text-center mb-12">
                            <p className="text-sm font-medium text-brand-600 mb-2">ทำไมต้องเลือกเรา</p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">ลาก่อนการติวแบบเดิมๆ</h2>
                        </Reveal>

                        {/* จุดขายเบอร์ 1 (เฉลยละเอียด) โชว์เด่นแยกจากอันอื่น พร้อมภาพตัวอย่างประกอบ
                            แทนคำบรรยายเฉยๆ ให้เห็นภาพว่า "อธิบายทำไมตัวเลือกอื่นผิด" หมายถึงอะไรจริงๆ */}
                        <Reveal className="mb-4 sm:mb-5">
                            <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-linear-to-br from-brand-50 to-white p-6 sm:p-8 grid sm:grid-cols-2 gap-6 sm:gap-8 items-center">
                                <div>
                                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white mb-4 shadow-lg shadow-brand-200">
                                        <PenLine size={20} />
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">{HIGHLIGHTS[0].title}</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed max-w-sm">{HIGHLIGHTS[0].description}</p>
                                </div>

                                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm shadow-slate-200/70 p-4">
                                    <div className="flex items-center justify-between rounded-lg border-2 border-green-300 bg-green-50 px-3 py-2 text-xs mb-2">
                                        <span className="text-slate-700">32</span>
                                        <Check size={14} className="text-green-600" />
                                    </div>
                                    <div className="mb-2">
                                        <div className="flex items-center justify-between rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-xs">
                                            <span className="text-slate-700">24</span>
                                            <X size={14} className="text-red-500" />
                                        </div>
                                        <p className="text-[11px] text-red-500 mt-1 px-1">ลบทีละ 8 ไปเรื่อยๆ ไม่ใช่คูณ 2 — ทำให้ตอบผิด</p>
                                    </div>
                                    <div className="rounded-lg bg-brand-50/70 border border-brand-100 p-2.5">
                                        <p className="text-[10px] font-medium text-brand-700 mb-0.5">วิธีคิด</p>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">แต่ละพจน์คูณด้วย 2 เสมอ (2×2=4, 4×2=8, 8×2=16) ดังนั้น 16×2 = 32</p>
                                    </div>
                                </div>
                            </div>
                        </Reveal>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            {HIGHLIGHTS.slice(1).map((h, i) => (
                                <Reveal key={h.title} delay={i * 100}>
                                    <Card className="p-3.5 h-full transition-all hover:shadow-md hover:shadow-slate-200 hover:-translate-y-0.5">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 mb-3">
                                            <h.icon size={16} />
                                        </span>
                                        <h3 className="text-sm font-medium text-slate-800 mb-1">{h.title}</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">{h.description}</p>
                                    </Card>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Categories */}
                {categories.length > 0 && (
                    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-20">
                        <Reveal className="text-center mb-10">
                            <p className="text-sm font-medium text-brand-600 mb-2">เลือกสนามสอบที่ใช่</p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">เตรียมสอบตรงหมวดหมู่</h2>
                        </Reveal>
                        <Reveal>
                            <CategoryShowcase categories={categories} products={products} />
                        </Reveal>
                    </section>
                )}

                {/* Popular products — เรียงตามยอดซื้อจริง (เติมสุ่มถ้ายังขายไม่ครบ limit ฝั่ง backend) */}
                {popularProducts.length > 0 && (
                    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-20">
                        <Reveal className="flex items-end justify-between mb-8">
                            <div>
                                <p className="text-sm font-medium text-brand-600 mb-1.5">เลือกแล้วเริ่มได้เลย</p>
                                <h2 className="text-2xl font-semibold text-slate-900">แนวข้อสอบยอดนิยม</h2>
                            </div>
                            <Link href="/products" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                                ดูทั้งหมด <ArrowRight size={16} />
                            </Link>
                        </Reveal>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                            {popularProducts.map((p, i) => (
                                <Reveal key={p.prod_id} delay={(i % 6) * 80}>
                                    <ProductCard product={p} />
                                </Reveal>
                            ))}
                        </div>
                        <Link href="/products" className="sm:hidden mt-6 flex items-center justify-center gap-1 text-sm font-medium text-brand-600">
                            ดูทั้งหมด <ArrowRight size={16} />
                        </Link>
                    </section>
                )}

                {/* ข่าวสาร — เฉพาะ widget ที่แอดมินติ๊ก "เผยแพร่ใน landing page" ไว้ (เป็นอิสระจากสถานะเผยแพร่
                    ของฟีดเต็มที่ /news โดยตั้งใจ ติ๊กไว้ตอนยังร่างก็ขึ้นหน้าแรกได้) ใช้การ์ดตัวเดียวกับหน้า /news
                    เป๊ะ (NewsFeedCard) ให้หน้าตาตรงกันไม่ว่าดูจากที่ไหน */}
                {landingNews.length > 0 && (
                    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-20">
                        <Reveal className="flex items-end justify-between mb-8">
                            <div>
                                <p className="text-sm font-medium text-brand-600 mb-1.5">อัปเดตล่าสุดจากทีมงาน</p>
                                <h2 className="text-2xl font-semibold text-slate-900">ข่าวสาร</h2>
                            </div>
                            <Link href="/news" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                                ดูทั้งหมด <ArrowRight size={16} />
                            </Link>
                        </Reveal>
                        <div className="flex flex-col gap-5">
                            {landingNews.map((block, i) => (
                                <Reveal key={block.blk_id} delay={(i % 6) * 80}>
                                    <NewsFeedCard block={block} />
                                </Reveal>
                            ))}
                        </div>
                        <Link href="/news" className="sm:hidden mt-6 flex items-center justify-center gap-1 text-sm font-medium text-brand-600">
                            ดูทั้งหมด <ArrowRight size={16} />
                        </Link>
                    </section>
                )}

                {/* Closing CTA */}
                <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-20">
                    <Reveal className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-600 to-brand-700 px-8 py-14 sm:py-16 text-center">
                        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                        <h2 className="relative text-2xl sm:text-3xl font-semibold text-white mb-3">พร้อมเริ่มเตรียมสอบหรือยัง?</h2>
                        <p className="relative text-brand-50/90 mb-8 max-w-md mx-auto">
                            สมัครสมาชิกวันนี้ เลือกแนวข้อสอบที่ใช่ แล้วเริ่มฝึกได้ทันที
                        </p>
                        <Link href="/register" className="relative inline-block">
                            <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50 shadow-none">
                                สมัครสมาชิกฟรี
                            </Button>
                        </Link>
                    </Reveal>
                </section>
            </main>
            <Footer />
        </div>
    );
}
