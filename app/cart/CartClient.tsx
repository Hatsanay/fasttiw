"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ShoppingBag, Tag } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getCart, removeFromCart, clearCart, type CartItem } from "@/lib/cart";
import { productCoverUrl, formatBaht, effectivePrice } from "@/lib/api";
import { checkoutAction } from "@/app/actions/checkout";

export default function CartClient({ isLoggedIn }: { isLoggedIn: boolean }) {
    const router = useRouter();
    const [items, setItems] = useState<CartItem[] | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        function sync() {
            setItems(getCart());
        }
        sync();
        window.addEventListener("cart-updated", sync);
        return () => window.removeEventListener("cart-updated", sync);
    }, []);

    if (items === null) return null; // กันไม่ให้ SSR/CSR ไม่ตรงกัน (localStorage อ่านได้แค่ฝั่ง client)

    const total = items.reduce((sum, i) => sum + effectivePrice(i), 0);

    function handleCheckout() {
        if (!items) return;
        startTransition(async () => {
            const result = await checkoutAction(
                items.map((i) => i.prod_id),
                couponCode.trim() || undefined
            );
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            clearCart();
            router.push(`/orders/${result.ord_id}`);
        });
    }

    return (
        <>
            <h1 className="text-2xl font-semibold text-slate-800 mb-8">ตะกร้าของฉัน</h1>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <ShoppingBag size={40} className="mb-3" />
                    <p className="mb-4">ยังไม่มีชุดข้อสอบในตะกร้า</p>
                    <Link href="/products">
                        <Button variant="secondary">เลือกดูแนวข้อสอบ</Button>
                    </Link>
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-3 mb-8">
                        {items.map((item) => {
                            const cover = productCoverUrl(item.prod_cover_url);
                            return (
                                <Card key={item.prod_id} className="flex items-center gap-4 p-4">
                                    <div className="relative h-16 w-20 shrink-0 rounded-lg overflow-hidden bg-slate-50">
                                        {cover && <Image src={cover} alt={item.prod_name} fill className="object-cover" sizes="80px" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{item.prod_name}</p>
                                        {item.prod_is_free ? (
                                            <p className="text-sm text-green-600 font-semibold">ฟรี</p>
                                        ) : (
                                            <p className="text-sm text-brand-600 font-semibold">{formatBaht(item.prod_price)}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.prod_id)}
                                        disabled={isPending}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-2 disabled:opacity-40"
                                        aria-label="ลบออกจากตะกร้า"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </Card>
                            );
                        })}
                    </div>

                    <Card className="p-5">
                        {isLoggedIn && (
                            <div className="flex items-center gap-2 mb-4">
                                <Tag size={16} className="text-slate-400 shrink-0" />
                                <Input
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    placeholder="โค้ดส่วนลด (ไม่บังคับ)"
                                    disabled={isPending}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500">ยอดรวม</span>
                            <span className="text-xl font-semibold text-slate-800">{formatBaht(total)}</span>
                        </div>

                        {isLoggedIn ? (
                            <Button size="lg" className="w-full" onClick={handleCheckout} disabled={isPending}>
                                {isPending ? "กำลังดำเนินการ..." : "ดำเนินการชำระเงิน"}
                            </Button>
                        ) : (
                            <Link href="/login?next=/cart">
                                <Button size="lg" className="w-full">
                                    เข้าสู่ระบบเพื่อชำระเงิน
                                </Button>
                            </Link>
                        )}
                    </Card>
                </>
            )}
        </>
    );
}
