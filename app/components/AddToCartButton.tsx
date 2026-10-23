"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { addToCart, getCart, type CartItem } from "@/lib/cart";

// label/variant ไม่บังคับ — ใช้ตอนลูกค้าถือแบบมีวันหมดอายุแล้วซื้อซ้ำเพื่อ "ต่ออายุ" (กติกาซื้อซ้ำ 2026-10-23)
export default function AddToCartButton({
    product,
    label = "เพิ่มลงตะกร้า",
    variant = "primary",
}: {
    product: CartItem;
    label?: string;
    variant?: "primary" | "secondary";
}) {
    const router = useRouter();
    const [added, setAdded] = useState(false);

    useEffect(() => {
        // ต้องอ่านหลัง mount เท่านั้น (ผ่าน effect ไม่ใช่ lazy initializer) เพราะ getCart() อ่าน localStorage
        // ซึ่งไม่มีตอน SSR — ถ้าอ่านตอน initial render จะทำให้ hydration mismatch ระหว่าง server/client
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync จาก localStorage (external system) เข้า state ตามที่ effect มีไว้ทำ
        setAdded(getCart().some((i) => i.prod_id === product.prod_id));
    }, [product.prod_id]);

    function handleClick() {
        if (added) {
            router.push("/cart");
            return;
        }
        addToCart(product);
        setAdded(true);
        toast.success("เพิ่มลงตะกร้าแล้ว");
    }

    return (
        <Button size="lg" variant={variant} onClick={handleClick} className="w-full sm:w-auto">
            {added ? <Check size={18} /> : <ShoppingCart size={18} />}
            {added ? "อยู่ในตะกร้าแล้ว — ไปที่ตะกร้า" : label}
        </Button>
    );
}
