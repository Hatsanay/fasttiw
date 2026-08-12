import { Suspense } from "react";
import Link from "next/link";
import { PackageSearch, X } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ProductCard from "@/app/components/ProductCard";
import SearchBox from "@/app/components/SearchBox";
import { getPublicProducts, type Product } from "@/lib/api";
import { getOwnedProductIds } from "@/lib/session";

export const metadata = {
    title: "แนวข้อสอบทั้งหมด",
    description: "รวมแนวข้อสอบออนไลน์ทุกหมวดหมู่ ทำได้จริงบนเว็บ พร้อมเฉลยละเอียดทีละขั้นตอน เลือกซื้อเป็นชุดตามที่ต้องการเตรียมสอบ",
};

// ไม่แบ่งหมวดหมู่ตอนค้นหา (ผลค้นหาที่กระจายเป็นหลายหมวดละ 1-2 รายการจะดูขาดๆ) โชว์เป็น grid เดียวแทน
function groupByCategory(products: Product[]): { category: string; items: Product[] }[] {
    const groups: { category: string; items: Product[] }[] = [];
    const indexByCategory = new Map<string, number>();
    for (const p of products) {
        const category = p.prod_category_name ?? "หมวดหมู่อื่นๆ";
        let i = indexByCategory.get(category);
        if (i === undefined) {
            i = groups.length;
            indexByCategory.set(category, i);
            groups.push({ category, items: [] });
        }
        groups[i].items.push(p);
    }
    return groups;
}

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; category?: string; free?: string }>;
}) {
    const { search, category, free } = await searchParams;
    const isFreeOnly = free === "1";
    const [{ data: products }, ownedProductIds] = await Promise.all([
        getPublicProducts({ search, category_id: category, is_free: isFreeOnly, limit: search || category || isFreeOnly ? 24 : 100 }),
        getOwnedProductIds(),
    ]);
    const categoryGroups = !search && !category && !isFreeOnly ? groupByCategory(products) : [];
    const categoryName = category ? products[0]?.prod_category_name : null;

    // สลับ "ฟรีเท่านั้น" แบบคง search/category เดิมไว้ (โมเดลเดียวกับ SearchBox/category filter — ทั้งหน้า
    // นี้เป็น Server Component ขับเคลื่อนด้วย URL search params ล้วนๆ ไม่ต้องใช้ client component)
    const freeToggleParams = new URLSearchParams();
    if (search) freeToggleParams.set("search", search);
    if (category) freeToggleParams.set("category", category);
    if (!isFreeOnly) freeToggleParams.set("free", "1");
    const freeToggleHref = `/products${freeToggleParams.toString() ? `?${freeToggleParams}` : ""}`;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-360 mx-auto w-full px-4 sm:px-6 py-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h1 className="text-2xl font-semibold text-slate-800">แนวข้อสอบทั้งหมด</h1>
                    <Suspense>
                        <SearchBox />
                    </Suspense>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <Link
                        href={freeToggleHref}
                        className={`inline-flex items-center gap-1.5 rounded-full text-sm font-medium px-3.5 py-1.5 transition-colors ${
                            isFreeOnly ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                    >
                        ฟรีเท่านั้น
                        {isFreeOnly && <X size={13} />}
                    </Link>
                    {category && (
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-medium px-3.5 py-1.5 hover:bg-brand-100 transition-colors"
                        >
                            {categoryName ?? "หมวดหมู่นี้"}
                            <X size={13} />
                        </Link>
                    )}
                </div>

                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <PackageSearch size={40} className="mb-3" />
                        <p>ไม่พบแนวข้อสอบที่ค้นหา</p>
                    </div>
                ) : search || category || isFreeOnly ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {products.map((p) => (
                            <ProductCard key={p.prod_id} product={p} owned={ownedProductIds.has(p.prod_id)} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-12">
                        {categoryGroups.map(({ category: groupCategory, items }) => (
                            <section key={groupCategory} id={encodeURIComponent(groupCategory)} className="scroll-mt-20">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">{groupCategory}</h2>
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                                    {items.map((p) => (
                                        <ProductCard
                                            key={p.prod_id}
                                            product={p}
                                            owned={ownedProductIds.has(p.prod_id)}
                                            hideCategoryBadge
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
