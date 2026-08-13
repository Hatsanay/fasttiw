"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Sparkles, ArrowRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { cn } from "@/lib/cn";
import type { Product, StoreCategory } from "@/lib/api";

const LATEST = null;

// คลิกหมวดหมู่แล้วโชว์การ์ดสินค้าของหมวดนั้นทันทีตรงนี้เลย (ไม่ต้องเด้งไปหน้า /products) —
// ค่าเริ่มต้นไม่เลือกหมวดไหนก่อน โชว์ข้อสอบล่าสุดของทุกหมวดรวมกันไปก่อน (selected = LATEST)
export default function CategoryShowcase({ categories, products }: { categories: StoreCategory[]; products: Product[] }) {
    const [selected, setSelected] = useState<string | null>(LATEST);
    const items = selected === LATEST ? products : products.filter((p) => p.prod_category_id === selected);

    return (
        <div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8">
                <CategoryTile
                    active={selected === LATEST}
                    icon={Sparkles}
                    label="ล่าสุด"
                    onClick={() => setSelected(LATEST)}
                />
                {categories.map((c) => (
                    <CategoryTile
                        key={c.cat_id}
                        active={c.cat_id === selected}
                        icon={LayoutGrid}
                        label={c.cat_name}
                        onClick={() => setSelected(c.cat_id)}
                    />
                ))}
            </div>

            {items.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {items.slice(0, 12).map((p) => (
                            <ProductCard key={p.prod_id} product={p} hideCategoryBadge={selected !== LATEST} />
                        ))}
                    </div>
                    <div className="flex justify-center mt-6">
                        <Link
                            href={selected === LATEST ? "/products" : `/products?category=${selected}`}
                            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                        >
                            {selected === LATEST ? "ดูแนวข้อสอบทั้งหมด" : "ดูทั้งหมดในหมวดนี้"} <ArrowRight size={16} />
                        </Link>
                    </div>
                </>
            ) : (
                <p className="text-center text-sm text-slate-400">ยังไม่มีชุดข้อสอบในหมวดนี้</p>
            )}
        </div>
    );
}

function CategoryTile({
    active,
    icon: Icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border transition-all",
                active
                    ? "border-brand-300 bg-brand-50 shadow-sm shadow-brand-100"
                    : "border-slate-100 bg-white hover:shadow-md hover:shadow-slate-200 hover:-translate-y-0.5"
            )}
        >
            <span
                className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600"
                )}
            >
                <Icon size={15} />
            </span>
            <span className="text-sm font-medium text-slate-800">{label}</span>
        </button>
    );
}
