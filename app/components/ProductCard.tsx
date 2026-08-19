import Image from "next/image";
import Link from "next/link";
import { FileQuestion, CheckCircle2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ShareButton from "@/app/components/ShareButton";
import { productCoverUrl, formatBaht, compareAtPrice, type Product } from "@/lib/api";

export default function ProductCard({
    product,
    owned = false,
    hideCategoryBadge = false,
}: {
    product: Product;
    owned?: boolean;
    hideCategoryBadge?: boolean;
}) {
    const cover = productCoverUrl(product.prod_cover_url);
    const comparePrice = compareAtPrice(product);

    return (
        <Link href={`/products/${product.prod_id}`}>
            <Card className="overflow-hidden h-full flex flex-col transition-all hover:shadow-md hover:shadow-slate-200 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]">
                <div className="relative aspect-4/3 bg-slate-50">
                    {cover ? (
                        <Image src={cover} alt={product.prod_name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 16vw" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                            <FileQuestion size={28} />
                        </div>
                    )}
                    {owned && (
                        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-600 text-white px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
                            <CheckCircle2 size={10} />
                            ซื้อแล้ว
                        </span>
                    )}
                    <ShareButton
                        url={`/products/${product.prod_id}`}
                        title={`แนวข้อสอบ ${product.prod_name} | Fasttiw`}
                        className="absolute bottom-1.5 right-1.5 h-7 w-7"
                    />
                </div>
                <div className="p-2.5 flex flex-col gap-1 flex-1">
                    {product.prod_category_name && !hideCategoryBadge && (
                        <Badge tone="brand" className="w-fit px-1.5 py-0.5 text-[10px]">
                            {product.prod_category_name}
                        </Badge>
                    )}
                    <h3 className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">{product.prod_name}</h3>
                    <div className="mt-auto flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">{product.question_count.toLocaleString("th-TH")} ข้อ</span>
                        {product.prod_is_free ? (
                            <span className="text-sm font-semibold text-green-600">ฟรี</span>
                        ) : (
                            <span className="flex items-baseline gap-1.5 flex-wrap justify-end">
                                {comparePrice != null && (
                                    <span className="text-[10px] text-slate-400 line-through whitespace-nowrap">{formatBaht(comparePrice)}</span>
                                )}
                                <span className="text-sm font-semibold text-brand-600 whitespace-nowrap">{formatBaht(product.prod_price)}</span>
                            </span>
                        )}
                    </div>
                </div>
            </Card>
        </Link>
    );
}
