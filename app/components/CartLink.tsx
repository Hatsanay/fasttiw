"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCart } from "@/lib/cart";

export default function CartLink() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        function sync() {
            setCount(getCart().length);
        }
        sync();
        window.addEventListener("cart-updated", sync);
        return () => window.removeEventListener("cart-updated", sync);
    }, []);

    return (
        <Link href="/cart" className="relative text-slate-600 hover:text-brand-600 transition-colors">
            <ShoppingCart size={20} />
            {count > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-medium text-white">
                    {count}
                </span>
            )}
        </Link>
    );
}
