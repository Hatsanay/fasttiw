import Image from "next/image";
import { Layers, Check } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import ShareButton from "@/app/components/ShareButton";
import RichDescription from "@/app/components/RichDescription";
import { productCoverUrl, formatBaht, type StorePackage } from "@/lib/api";
import { getPublicPackages } from "@/lib/publicData";
import BuyPackageButton from "./BuyPackageButton";
import PackageProductList from "./PackageProductList";

export const metadata = {
    title: "แพ็กเกจสุดคุ้ม",
    description: "ซื้อแนวข้อสอบรวมชุดในราคาพิเศษ ประหยัดกว่าซื้อแยก พร้อมเฉลยละเอียดทีละขั้นตอนทุกชุด",
    alternates: { canonical: "/packages" },
};

export default async function PackagesPage() {
    const packages = await getPublicPackages();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-2">แพ็กเกจสุดคุ้ม</h1>
                <p className="text-sm text-slate-500 mb-8">ซื้อรวมหลายชุดในราคาพิเศษ ประหยัดกว่าซื้อแยก</p>

                {packages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Layers size={40} className="mb-3" />
                        <p>ยังไม่มีแพ็กเกจให้เลือกตอนนี้</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {packages.map((pkg, i) => (
                            <PackageCard key={pkg.pkg_id} pkg={pkg} eager={i === 0} />
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}

// แพ็กเกจ 1 อัน = การ์ดเต็มความกว้าง (เดิมเป็นกริด 4 คอลัมน์แบบการ์ดสินค้า — แพ็กเกจมีคำอธิบายยาว + รายการชุดข้างใน
// พอบีบเหลือ ~290px คำอธิบายกลายเป็นก้อนข้อความยาว ชื่อชุดโดนตัดหมดจนแยกไม่ออกว่าชุดไหน)
// ซ้าย: ปก + กล่องราคา/ปุ่มซื้อ · ขวา: ชื่อ คำอธิบาย รายการชุดที่ได้
// ไม่ทำให้ฝั่งซ้ายติดจอ (sticky) โดยตั้งใจ — ลองแล้ว ตอนเลื่อนปกค้างอยู่ขณะที่การ์ดเลื่อน ดูเหมือนรูปถูกดึงยืด (ผู้ใช้ทักมา 2026-10-03)
function PackageCard({ pkg, eager }: { pkg: StorePackage; eager: boolean }) {
    const cover = productCoverUrl(pkg.pkg_cover_url);
    const savingsPercent = pkg.savings > 0 && pkg.individual_total > 0 ? Math.round((pkg.savings / pkg.individual_total) * 100) : 0;

    return (
        <Card id={pkg.pkg_id} className="scroll-mt-24 overflow-hidden">
            <div className="grid md:grid-cols-[300px_minmax(0,1fr)]">
                <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6 md:flex md:flex-col md:justify-center md:border-b-0 md:border-r">
                    <div>
                        {/* สัดส่วน A4 แนวตั้ง (210:297) เหมือนปกชุดข้อสอบทุกจุดในเว็บ */}
                        <div className="relative mx-auto aspect-210/297 w-full max-w-[250px] overflow-hidden rounded-xl bg-white shadow-md shadow-slate-300/40 ring-1 ring-slate-200/70">
                            {cover ? (
                                <Image
                                    src={cover}
                                    alt={pkg.pkg_name}
                                    fill
                                    className="object-cover"
                                    sizes="250px"
                                    // ปกแพ็กเกจใบแรกคือสิ่งที่ใหญ่ที่สุดบนจอแรก — โหลดทันที (ดู eager ใน ProductCard)
                                    {...(eager ? { loading: "eager", fetchPriority: "high" } : {})}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-slate-300">
                                    <Layers size={32} />
                                </div>
                            )}
                            <ShareButton url={`/packages#${pkg.pkg_id}`} title={`แพ็กเกจ ${pkg.pkg_name} | Fasttiw`} className="absolute bottom-1.5 right-1.5 h-7 w-7" />
                        </div>

                        <div className="mx-auto mt-5 max-w-[250px] md:max-w-none">
                            <p className="text-xs text-slate-500">ราคาแพ็กเกจ</p>
                            <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="whitespace-nowrap text-3xl font-semibold text-brand-600">{formatBaht(pkg.pkg_price)}</span>
                                {pkg.savings > 0 && <span className="whitespace-nowrap text-sm text-slate-400 line-through">{formatBaht(pkg.individual_total)}</span>}
                            </div>
                            {pkg.savings > 0 && (
                                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                    <Check size={12} />
                                    ประหยัด {formatBaht(pkg.savings)} ({savingsPercent}%)
                                </p>
                            )}
                            <BuyPackageButton packageId={pkg.pkg_id} className="mt-4" />
                            <p className="mt-2 text-center text-xs text-slate-400">ชำระผ่าน PromptPay · ได้ทุกชุดในบัญชีเดียว</p>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 p-5 sm:p-8">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        <Layers size={13} />
                        รวม {pkg.products.length} ชุด
                    </span>
                    <h2 className="mt-3 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{pkg.pkg_name}</h2>

                    {pkg.pkg_description && <RichDescription text={pkg.pkg_description} className="mt-4 text-[15px]" />}

                    <PackageProductList products={pkg.products} />
                </div>
            </div>
        </Card>
    );
}
