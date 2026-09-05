import Image from "next/image";
import { Layers, Check } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import ShareButton from "@/app/components/ShareButton";
import { getPublicPackages, productCoverUrl, formatBaht } from "@/lib/api";
import { getSession } from "@/lib/session";
import BuyPackageButton from "./BuyPackageButton";

export const metadata = {
    title: "แพ็กเกจสุดคุ้ม",
    description: "ซื้อแนวข้อสอบรวมชุดในราคาพิเศษ ประหยัดกว่าซื้อแยก พร้อมเฉลยละเอียดทีละขั้นตอนทุกชุด",
    alternates: { canonical: "/packages" },
};

export default async function PackagesPage() {
    const [packages, session] = await Promise.all([getPublicPackages(), getSession()]);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-2">แพ็กเกจสุดคุ้ม</h1>
                <p className="text-sm text-slate-500 mb-8">ซื้อรวมหลายชุดในราคาพิเศษ ประหยัดกว่าซื้อแยก</p>

                {packages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Layers size={40} className="mb-3" />
                        <p>ยังไม่มีแพ็กเกจให้เลือกตอนนี้</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                        {/* คอลัมน์ถี่ขึ้นหลังเปลี่ยนปกเป็นสัดส่วน A4 แนวตั้ง — เดิม 2 คอลัมน์ทำให้การ์ดกว้างราว 620px
                            รูปจึงสูงเกิน 870px บังเนื้อหาข้างล่าง (ชื่อ/ราคา/รายการชุดที่รวมอยู่) จนต้องเลื่อนจอเยอะ
                            คงไว้ 1 คอลัมน์บนมือถือเพราะการ์ดนี้มีรายการชุดข้อสอบพร้อมรูปย่ออยู่ข้างใน ถ้าบีบแคบกว่านี้ชื่อชุดจะโดนตัดทิ้งเกือบหมด */}
                        {packages.map((pkg) => {
                            const pkgCover = productCoverUrl(pkg.pkg_cover_url);
                            return (
                                <Card key={pkg.pkg_id} id={pkg.pkg_id} className="overflow-hidden flex flex-col">
                                    {/* สัดส่วน A4 แนวตั้ง (210:297) เหมือนปกชุดข้อสอบทุกจุดในเว็บ (เดิมเป็น 16:9 แนวนอน) */}
                                    <div className="relative aspect-[210/297] bg-slate-50">
                                        {pkgCover ? (
                                            <Image src={pkgCover} alt={pkg.pkg_name} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-slate-300">
                                                <Layers size={32} />
                                            </div>
                                        )}
                                        <ShareButton
                                            url={`/packages#${pkg.pkg_id}`}
                                            title={`แพ็กเกจ ${pkg.pkg_name} | Fasttiw`}
                                            className="absolute bottom-1.5 right-1.5 h-7 w-7"
                                        />
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <h2 className="font-semibold text-slate-900 mb-1">{pkg.pkg_name}</h2>
                                        {pkg.pkg_description && <p className="text-sm text-slate-500 mb-3">{pkg.pkg_description}</p>}

                                        <div className="flex flex-col gap-2 mb-4">
                                            {pkg.products.map((p) => {
                                                const prodCover = productCoverUrl(p.prod_cover_url);
                                                return (
                                                    <div key={p.prod_id} className="flex items-center gap-2.5">
                                                        <div className="relative h-10 w-14 shrink-0 rounded-lg overflow-hidden bg-slate-50">
                                                            {prodCover && <Image src={prodCover} alt={p.prod_name} fill className="object-cover" sizes="56px" />}
                                                        </div>
                                                        <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.prod_name}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-auto border-t border-slate-100 pt-4">
                                            <div className="mb-1 flex items-end justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-400 line-through">{formatBaht(pkg.individual_total)}</p>
                                                    <p className="text-2xl font-semibold text-brand-600">{formatBaht(pkg.pkg_price)}</p>
                                                </div>
                                                {pkg.savings > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                                        <Check size={12} />
                                                        ประหยัด {formatBaht(pkg.savings)}
                                                    </span>
                                                )}
                                            </div>
                                            <BuyPackageButton packageId={pkg.pkg_id} isLoggedIn={!!session} />
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
