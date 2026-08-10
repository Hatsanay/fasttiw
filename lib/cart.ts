"use client";

const CART_KEY = "fasttiw_store_cart";

export type CartItem = {
    prod_id: string;
    prod_name: string;
    prod_price: string;
    prod_is_free: boolean;
    prod_cover_url: string | null;
};

function readCart(): CartItem[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    } catch {
        return [];
    }
}

function writeCart(items: CartItem[]) {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
}

export function getCart(): CartItem[] {
    return readCart();
}

export function addToCart(item: CartItem) {
    const items = readCart();
    if (items.some((i) => i.prod_id === item.prod_id)) return; // ซื้อได้ชุดละ 1 สิทธิ์ ไม่ต้องเพิ่มจำนวน
    writeCart([...items, item]);
}

export function removeFromCart(prod_id: string) {
    writeCart(readCart().filter((i) => i.prod_id !== prod_id));
}

export function clearCart() {
    writeCart([]);
}
