import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileQuestion, CheckCircle2 } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import AddToCartButton from "@/app/components/AddToCartButton";
import RealSamplePreview from "@/app/components/RealSamplePreview";
import ShareButton from "@/app/components/ShareButton";
import { getPublicProduct, getSampleQuestions, productCoverUrl, formatBaht } from "@/lib/api";
import { getOwnedProductIds } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

// อธิบายสั้นสำหรับ meta description/OG — ตัดจาก prod_description จริงถ้ามี ไม่งั้น fallback เป็นประโยค
// มาตรฐานที่ยังใส่ชื่อ+จำนวนข้อจริงของ product นั้นๆ (ไม่ใช้ข้อความเดียวกันซ้ำทุกหน้าเหมือนก่อนแก้)
function buildDescription(name: string, description: string | null, questionCount: number): string {
    if (description) {
        const flat = description.replace(/\s+/g, " ").trim();
        return flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
    }
    return `ทำแนวข้อสอบ ${name} ออนไลน์ ${questionCount.toLocaleString("th-TH")} ข้อ พร้อมเฉลยละเอียดทีละขั้นตอน`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const product = await getPublicProduct(id);
    if (!product) return { title: "ไม่พบชุดข้อสอบ" };

    const description = buildDescription(product.prod_name, product.prod_description, product.question_count);
    const image = productCoverUrl(product.prod_cover_url);
    const path = `/products/${id}`;

    return {
        title: product.prod_name,
        description,
        alternates: { canonical: path },
        openGraph: {
            title: product.prod_name,
            description,
            url: path,
            images: image ? [{ url: image, width: 1200, height: 900 }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: product.prod_name,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [product, ownedProductIds, sampleQuestions] = await Promise.all([
        getPublicProduct(id),
        getOwnedProductIds(),
        getSampleQuestions(id),
    ]);
    if (!product) notFound();

    const owned = ownedProductIds.has(id);
    const cover = productCoverUrl(product.prod_cover_url);
    // เลือกข้อที่มีตัวเลือกผิดพร้อม wrong_reason ให้โชว์ครบทั้ง 2 จุดขาย (วิธีคิด + เหตุผลตัวเลือกผิด)
    const demoQuestion = sampleQuestions.find((q) =>
        q.reveal.choice_reasons.some((r) => !r.is_correct && r.wrong_reason)
    );

    // structured data (schema.org Product) ให้ Google เอาไปแสดงราคา/สถานะพร้อมขายเป็น rich snippet ได้ —
    // escape "<" กันกรณีชื่อ/คำอธิบายมีสตริง "</script>" หลุดมาปนแล้วตัด tag script ก่อนเวลา
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.prod_name,
        description: buildDescription(product.prod_name, product.prod_description, product.question_count),
        ...(cover ? { image: cover } : {}),
        offers: {
            "@type": "Offer",
            price: product.prod_is_free ? "0" : product.prod_price,
            priceCurrency: "THB",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/products/${product.prod_id}`,
        },
    };

    return (
        <div className="flex flex-col min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
            />
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
                    <div className="relative aspect-4/3 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                        {cover ? (
                            <Image src={cover} alt={product.prod_name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" priority />
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-300">
                                <FileQuestion size={56} />
                            </div>
                        )}
                        <ShareButton
                            url={`/products/${product.prod_id}`}
                            title={`แนวข้อสอบ ${product.prod_name} | Fasttiw`}
                            className="absolute bottom-2 right-2 h-8 w-8"
                        />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            {product.prod_category_name && <Badge tone="brand" className="w-fit">{product.prod_category_name}</Badge>}
                            {owned && (
                                <Badge tone="success" className="w-fit flex items-center gap-1">
                                    <CheckCircle2 size={13} />
                                    ซื้อแล้ว
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">{product.prod_name}</h1>
                        <p className="text-sm text-slate-400 mb-6">{product.question_count.toLocaleString("th-TH")} ข้อ พร้อมเฉลยละเอียด</p>

                        {product.prod_description && (
                            <p className="text-slate-600 leading-relaxed mb-8 whitespace-pre-line">{product.prod_description}</p>
                        )}

                        <div className="mt-auto flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
                            {product.prod_is_free ? (
                                <span className="flex items-baseline gap-2">
                                    {Number(product.prod_price) > 0 && (
                                        <span className="text-sm text-slate-400 line-through">{formatBaht(product.prod_price)}</span>
                                    )}
                                    <span className="text-2xl font-semibold text-green-600">ฟรี</span>
                                </span>
                            ) : (
                                <span className="text-2xl font-semibold text-brand-600">{formatBaht(product.prod_price)}</span>
                            )}
                            {owned ? (
                                <Link href={`/exam/${product.prod_id}`}>
                                    <Button size="lg">ไปทำข้อสอบ</Button>
                                </Link>
                            ) : (
                                <AddToCartButton
                                    product={{
                                        prod_id: product.prod_id,
                                        prod_name: product.prod_name,
                                        prod_price: product.prod_price,
                                        prod_is_free: product.prod_is_free,
                                        prod_cover_url: product.prod_cover_url,
                                    }}
                                />
                            )}
                        </div>

                        {!owned && (
                            <Link
                                href={`/products/${product.prod_id}/sample`}
                                className="mt-3 text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                            >
                                ลองทำตัวอย่างฟรี 10 ข้อก่อนตัดสินใจซื้อ
                            </Link>
                        )}
                    </div>
                </div>

                {!owned && demoQuestion && (
                    <div className="mt-12 sm:mt-16 max-w-xl mx-auto sm:mx-0">
                        <p className="text-sm font-medium text-slate-800 mb-3">เฉลยจริงหน้าตาเป็นแบบนี้ ลองดูก่อนตัดสินใจ</p>
                        <RealSamplePreview question={demoQuestion} productId={product.prod_id} />
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
