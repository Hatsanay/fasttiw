"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { productCoverUrl, formatBaht, type StorePackage } from "@/lib/api";

// รายการชุดข้อสอบในแพ็กเกจ — หน้าละ 4 ชุด (2×2) เกินกว่านั้นกดลูกศรดูต่อ (ผู้ใช้ขอ 2026-10-03)
// แพ็กเกจที่มีหลายชุดจะได้ไม่ยืดการ์ดยาวจนดันราคา/ปุ่มซื้อหลุดจอ
// หน้าสุดท้ายที่ชุดไม่ครบ 4 เว้นช่องไว้ (invisible) + ทุกช่องสูงอย่างน้อย 84px (= ชื่อ 2 บรรทัด) — กดลูกศรแล้วการ์ดไม่หด/ยืดจนหน้ากระตุก

const PAGE_SIZE = 4;

type PackageProduct = StorePackage["products"][number];

export default function PackageProductList({ products }: { products: PackageProduct[] }) {
    const pages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
    const [page, setPage] = useState(0);
    const shown = products.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    const fillers = pages > 1 ? PAGE_SIZE - shown.length : 0;

    return (
        <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-slate-800">
                    <FileText size={17} className="text-brand-600" />
                    ชุดข้อสอบในแพ็กเกจ
                    <span className="text-sm font-normal text-slate-400">({products.length} ชุด)</span>
                </h3>
                {pages > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-slate-500" aria-live="polite">
                            {page + 1}/{pages}
                        </span>
                        <ArrowButton label="ชุดก่อนหน้า" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft size={17} />
                        </ArrowButton>
                        <ArrowButton label="ชุดถัดไป" disabled={page === pages - 1} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight size={17} />
                        </ArrowButton>
                    </div>
                )}
            </div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {shown.map((p) => {
                    const cover = productCoverUrl(p.prod_cover_url);
                    return (
                        <li key={p.prod_id}>
                            <Link
                                href={`/products/${p.prod_id}`}
                                title={p.prod_name}
                                className="group flex h-full min-h-[84px] items-center gap-3 rounded-xl border border-slate-100 p-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                            >
                                <div className="relative aspect-210/297 w-11 shrink-0 overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-200/70">
                                    {cover && <Image src={cover} alt="" fill className="object-cover" sizes="44px" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800 group-hover:text-brand-700">{p.prod_name}</p>
                                    <p className="mt-1 text-xs text-slate-400">{p.prod_is_free ? "ชุดฟรี" : `ซื้อแยก ${formatBaht(p.prod_price)}`}</p>
                                </div>
                            </Link>
                        </li>
                    );
                })}
                {Array.from({ length: fillers }, (_, i) => (
                    // ช่องว่างกันการ์ดหดตอนหน้าสุดท้ายมีไม่ครบ 4 ชุด · บนมือถือ (คอลัมน์เดียว) ไม่ต้องเว้น — แค่เลื่อนหน้าจอ
                    <li key={`filler-${i}`} aria-hidden className="invisible hidden min-h-[84px] sm:block" />
                ))}
            </ul>
        </div>
    );
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors",
                disabled ? "cursor-not-allowed opacity-40" : "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            )}
        >
            {children}
        </button>
    );
}
