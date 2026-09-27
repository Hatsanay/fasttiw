"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import {
    ArrowRight,
    BookOpen,
    Bookmark,
    BookmarkCheck,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    Download,
    FileQuestion,
    Flag,
    ListChecks,
    LogOut,
    Menu,
    PanelRightOpen,
    RotateCcw,
    ShoppingCart,
    Sparkles,
    Tag,
    Target,
    Timer,
    Trash2,
    Users,
    X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import ProductCard from "@/app/components/ProductCard";
import ReadinessCard from "@/app/exam/attempts/[id]/review/ReadinessCard";
import { compareAtPrice, effectivePrice, formatBaht, productCoverUrl, type Product } from "@/lib/api";
import { cn } from "@/lib/cn";

// ฉากของ FlowDemo — แต่ละฉากคือฟังก์ชันของเวลา t (ms นับจากต้นฉาก) คืนหน้าจอ ณ เวลานั้น
//
// ⚠ **หน้าจอทุกหน้าในนี้ต้องตรงกับหน้าจริงฝั่งมือถือ** — แก้หน้าจริงเมื่อไหร่ (ข้อความปุ่ม, layout) ให้แก้ที่นี่ตาม
// จุดที่ต้องตามให้ตรง: Navbar, app/page.tsx (แนวข้อสอบยอดนิยม), app/products/[id]/page.tsx, app/cart/CartClient.tsx,
// app/login/*, app/orders/[id]/page.tsx · component แสดงผลล้วนใช้ตัวจริงอยู่แล้ว (ProductCard/Button/Card/Input/Badge)
// ⚠ ห้ามใช้ class ที่มี breakpoint (sm:/md:/lg:) — หน้าจอนี้กว้าง 375px เสมอ แต่ breakpoint อ่านจอจริง
//
// เวลาในฉาก: `waypoints` = จุดที่นิ้วกด (at = ms ที่กด, target = ค่า data-demo ของปุ่ม) — นิ้วเลื่อนไปหาเอง
// ส่วนหน้าตาที่เปลี่ยน (พิมพ์ กดแล้วปุ่มเปลี่ยน เปลี่ยนหน้า) คำนวณจาก t ในแต่ละฉาก ให้ตรงกับเวลาใน waypoints

export type DemoData = {
    product: Product;
    // การ์ดในหน้าแรก (ตัวแรก = ชุดที่เลือกในฉาก)
    shelf: Product[];
};

export type Waypoint = { at: number; target: string; x?: number; y?: number };

export type Scene = {
    key: string;
    title: string;
    caption: string;
    duration: number;
    waypoints: Waypoint[];
    render: (props: { t: number; demo: DemoData }) => ReactNode;
};

// ชุดสำรองตอนร้านยังไม่มีชุดที่ขาย (ฐานข้อมูลเปล่า) — ฉากต้องยังเล่นได้
const FALLBACK_PRODUCT: Product = {
    prod_id: "demo",
    prod_name: "แนวข้อสอบ ก.พ. ภาค ก",
    prod_price: "199",
    prod_compare_price: "299",
    prod_is_free: false,
    prod_cover_url: null,
    prod_category_id: null,
    prod_category_name: "สอบราชการ",
    question_count: 300,
};

/** ชุดที่ใช้เล่าเรื่อง = ชุดยอดนิยมตัวแรกที่ต้องจ่ายเงิน (ฉากชำระเงินต้องมียอด) */
export function pickDemoProducts(products: Product[]): DemoData {
    const paid = products.filter((p) => !p.prod_is_free && effectivePrice(p) > 0);
    const product = paid[0] ?? FALLBACK_PRODUCT;
    const shelf = [product, ...products.filter((p) => p.prod_id !== product.prod_id)].slice(0, 4);
    return { product, shelf };
}

const DEMO_USERNAME = "somchai.p";
const DEMO_COUPON = "TIW20";
const DEMO_DISCOUNT_RATE = 0.2;
const DEMO_ORDER_ID = "ORD202609270000128";

// ── ตัวช่วย ──────────────────────────────────────────────────────────────────────────────────────

/** ข้อความที่พิมพ์ไปแล้ว ณ เวลา t (เริ่มพิมพ์ที่ start ตัวละ perChar ms) */
function typed(text: string, t: number, start: number, perChar = 90) {
    if (t < start) return "";
    return text.slice(0, Math.floor((t - start) / perChar) + 1);
}

/**
 * หน้าจอ 1 หน้า: navbar ติดบน (sticky เหมือนจริง) + เนื้อหาที่เลื่อนได้
 * scrollTo = data-demo-anchor ของจุดที่อยากให้เลื่อนไปอยู่บนสุด — วัดตำแหน่งจริงจาก DOM ไม่ hardcode px
 * (ข้อความไทยตัดบรรทัดไม่เท่ากันในแต่ละชุด ถ้า hardcode ชุดชื่อยาวจะเลื่อนผิดที่)
 */
function Page({
    nav,
    scrollTo,
    children,
    pageKey,
    overlay,
    className,
}: {
    // หน้าทำข้อสอบจริงไม่มี navbar (โหมดโฟกัส) — ไม่ส่งมา = ไม่มี
    nav?: ReactNode;
    className?: string;
    scrollTo?: string;
    children: ReactNode;
    pageKey: string;
    // ลอยทับหน้าจอ ไม่เลื่อนตามเนื้อหา (toast)
    overlay?: ReactNode;
}) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;
        const anchor = scrollTo ? content.querySelector<HTMLElement>(`[data-demo-anchor="${scrollTo}"]`) : null;
        const max = Math.max(0, content.scrollHeight - viewport.clientHeight);
        const y = anchor ? Math.min(max, Math.max(0, anchor.offsetTop - 16)) : 0;
        content.style.transform = `translateY(${-y}px)`;
    }, [scrollTo]);

    return (
        <div key={pageKey} className={cn("flow-page-in absolute inset-0 flex flex-col bg-white", className)}>
            {nav}
            <div ref={viewportRef} className="relative flex-1 overflow-hidden">
                <div ref={contentRef} className="relative transition-transform duration-700 ease-in-out">
                    {children}
                </div>
            </div>
            {overlay}
        </div>
    );
}

/** Navbar ฝั่งมือถือ (ตาม NavbarView ใน app/components/Navbar.tsx) */
function DemoNavbar({ cartCount = 0 }: { cartCount?: number }) {
    return (
        <header className="relative z-10 shrink-0 bg-white/90 border-b border-slate-100">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center text-slate-600">
                        <Menu size={22} />
                    </span>
                    <Image src="/logo/fasttiw-logo.svg" alt="" width={145} height={40} className="h-auto w-[106px] shrink-0" />
                </div>
                <span data-demo="nav-cart" className="relative text-slate-600">
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                        <span className="flow-pop absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-medium text-white">
                            {cartCount}
                        </span>
                    )}
                </span>
            </div>
        </header>
    );
}

/** toast แบบ sonner (richColors, success) ที่หน้าเว็บใช้ */
function DemoToast({ show, children }: { show: boolean; children: ReactNode }) {
    return (
        <div
            className={cn(
                "absolute inset-x-4 top-3 z-20 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-medium text-green-700 shadow-lg transition-all duration-300",
                show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
            )}
        >
            <CheckCircle2 size={16} className="shrink-0" />
            {children}
        </div>
    );
}

function Price({ product, className }: { product: Product; className?: string }) {
    const compare = compareAtPrice(product);
    return (
        <span className={cn("flex items-baseline gap-2 flex-wrap", className)}>
            {compare != null && <span className="text-sm text-slate-400 line-through whitespace-nowrap">{formatBaht(compare)}</span>}
            <span className="text-2xl font-semibold text-brand-600 whitespace-nowrap">{formatBaht(product.prod_price)}</span>
        </span>
    );
}

function Cover({ product, sizes, className }: { product: Product; sizes: string; className?: string }) {
    const cover = productCoverUrl(product.prod_cover_url);
    return (
        <div className={cn("relative overflow-hidden bg-slate-50", className)}>
            {cover ? (
                <Image src={cover} alt="" fill className="object-cover" sizes={sizes} />
            ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                    <FileQuestion size={28} />
                </div>
            )}
        </div>
    );
}

// QR จำลอง (ไม่ใช่รหัสชำระเงินจริง สแกนแล้วไม่ได้อะไร) — ลายสุ่มแบบคงที่ + มุมจับตำแหน่ง 3 มุมให้ดูเป็น QR
// คำนวณครั้งเดียวตอนโหลดไฟล์ (ฉากเรนเดอร์ใหม่ ~12 ครั้ง/วิ ไม่ต้องสุ่มใหม่ทุกครั้ง)
const QR_SIZE = 25;
const QR_CELLS: [number, number][] = (() => {
    const cells: [number, number][] = [];
    let seed = 7;
    const inFinder = (x: number, y: number) =>
        (x < 8 && y < 8) || (x >= QR_SIZE - 8 && y < 8) || (x < 8 && y >= QR_SIZE - 8);
    for (let y = 0; y < QR_SIZE; y++) {
        for (let x = 0; x < QR_SIZE; x++) {
            seed = (seed * 9301 + 49297) % 233280;
            if (!inFinder(x, y) && seed / 233280 > 0.52) cells.push([x, y]);
        }
    }
    return cells;
})();

function FakeQr() {
    const n = QR_SIZE;
    const finder = (x: number, y: number) => (
        <g key={`f${x}-${y}`}>
            <rect x={x} y={y} width="7" height="7" />
            <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
            <rect x={x + 2} y={y + 2} width="3" height="3" />
        </g>
    );
    return (
        <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="h-full w-full" shapeRendering="crispEdges" fill="#0f172a">
            <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
            {QR_CELLS.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
            ))}
            {finder(0, 0)}
            {finder(n - 7, 0)}
            {finder(0, n - 7)}
        </svg>
    );
}

// ── ฉาก 1: เลือกชุดข้อสอบ ─────────────────────────────────────────────────────────────────────────
// หน้าแรก → เลื่อนลงไปแนวข้อสอบยอดนิยม → กดการ์ด → หน้ารายละเอียด → เพิ่มลงตะกร้า → กดไอคอนตะกร้า

const S1 = { tapCard: 3200, detail: 3700, scrollDetail: 4700, tapAdd: 6300, tapCart: 8600, end: 9400 };

function SceneChoose({ t, demo }: { t: number; demo: DemoData }) {
    const { product, shelf } = demo;
    if (t < S1.detail) {
        return (
            <Page pageKey="landing" nav={<DemoNavbar />} scrollTo={t >= 900 ? "popular" : undefined}>
                <section className="px-4 pt-16 pb-24 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-6">
                        <Sparkles size={14} />
                        เตรียมสอบด้วยเฉลยที่อธิบายวิธีคิดจริง
                    </span>
                    <p className="text-4xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
                        ทำแนวข้อสอบออนไลน์
                        <br />
                        <span className="bg-linear-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">พร้อมเฉลยละเอียด</span>
                    </p>
                    <p className="mt-6 text-slate-500 text-base leading-relaxed">
                        เตรียมสอบได้จริง ไม่ใช่แค่อ่าน PDF — ทำโจทย์ ดูผล และเข้าใจวิธีคิดทุกข้อ
                    </p>
                    <div className="mt-9 flex flex-col items-center gap-3">
                        <Button size="lg" className="w-full">
                            ดูแนวข้อสอบทั้งหมด
                            <ArrowRight size={18} />
                        </Button>
                        <Button size="lg" variant="secondary" className="w-full">
                            <Target size={18} className="text-brand-600" />
                            วัดระดับฟรี 10 นาที
                        </Button>
                    </div>
                </section>

                <section className="px-4 py-20" data-demo-anchor="popular">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <p className="text-sm font-medium text-brand-600 mb-1.5">เลือกแล้วเริ่มได้เลย</p>
                            <h3 className="text-2xl font-semibold text-slate-900">แนวข้อสอบยอดนิยม</h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {shelf.map((p, i) => (
                            <div
                                key={p.prod_id}
                                data-demo={i === 0 ? "product-card" : undefined}
                                className={cn("transition-transform duration-150", i === 0 && t >= S1.tapCard && "scale-[0.98]")}
                            >
                                <ProductCard product={p} />
                            </div>
                        ))}
                    </div>
                </section>
            </Page>
        );
    }

    const added = t >= S1.tapAdd + 100;
    return (
        <Page
            pageKey="detail"
            nav={<DemoNavbar cartCount={added ? 1 : 0} />}
            scrollTo={t >= S1.scrollDetail ? "buy" : undefined}
            overlay={<DemoToast show={added && t < S1.tapCart - 300}>เพิ่มลงตะกร้าแล้ว</DemoToast>}
        >
            <main className="px-4 py-10">
                <Cover product={product} sizes="343px" className="aspect-[210/297] w-full rounded-2xl border border-slate-100" />
                <div className="mt-8 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        {product.prod_category_name && <Badge tone="brand" className="w-fit">{product.prod_category_name}</Badge>}
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-900 mb-2">{product.prod_name}</h3>
                    <p className="text-sm text-slate-400 mb-6">{product.question_count.toLocaleString("th-TH")} ข้อ พร้อมเฉลยละเอียด</p>
                    <div className="flex flex-col gap-3 pt-6 border-t border-slate-100" data-demo-anchor="buy">
                        <Price product={product} />
                        <span data-demo="add-to-cart" className="block">
                            <Button size="lg" className="w-full">
                                {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                                {added ? "อยู่ในตะกร้าแล้ว — ไปที่ตะกร้า" : "เพิ่มลงตะกร้า"}
                            </Button>
                        </span>
                    </div>
                    <p className="mt-3 text-center text-sm font-medium text-brand-600">ลองทำตัวอย่างฟรี 10 ข้อก่อนตัดสินใจซื้อ</p>
                </div>
            </main>
        </Page>
    );
}

// ── หน้าตะกร้า (ใช้ทั้งฉาก 2 ตอนยังไม่ล็อกอิน และฉาก 3 ตอนล็อกอินแล้ว) ──────────────────────────────────

function CartPage({
    product,
    loggedIn,
    coupon = "",
    pending = false,
}: {
    product: Product;
    loggedIn: boolean;
    coupon?: string;
    pending?: boolean;
}) {
    return (
        <Page pageKey={loggedIn ? "cart-user" : "cart-guest"} nav={<DemoNavbar cartCount={1} />}>
            <main className="px-4 py-10">
                <h3 className="text-2xl font-semibold text-slate-800 mb-8">ตะกร้าของฉัน</h3>
                <div className="flex flex-col gap-3 mb-8">
                    <Card className="flex items-center gap-4 p-4">
                        <Cover product={product} sizes="80px" className="h-16 w-20 shrink-0 rounded-lg" />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">{product.prod_name}</p>
                            <p className="text-sm text-brand-600 font-semibold">{formatBaht(product.prod_price)}</p>
                        </div>
                        <span className="text-slate-400 p-2">
                            <Trash2 size={18} />
                        </span>
                    </Card>
                </div>
                <Card className="p-5">
                    {loggedIn && (
                        <div className="flex items-center gap-2 mb-4">
                            <Tag size={16} className="text-slate-400 shrink-0" />
                            <span data-demo="coupon" className="block w-full">
                                <Input
                                    value={coupon}
                                    readOnly
                                    placeholder="โค้ดส่วนลด (ไม่บังคับ)"
                                    className={cn(coupon && "border-brand-500 ring-2 ring-brand-500/20")}
                                />
                            </span>
                        </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500">ยอดรวม</span>
                        <span className="text-xl font-semibold text-slate-800">{formatBaht(effectivePrice(product))}</span>
                    </div>
                    <span data-demo={loggedIn ? "checkout" : "login-to-pay"} className="block">
                        <Button size="lg" className="w-full">
                            {loggedIn ? (pending ? "กำลังดำเนินการ..." : "ดำเนินการชำระเงิน") : "เข้าสู่ระบบเพื่อชำระเงิน"}
                        </Button>
                    </span>
                </Card>
            </main>
        </Page>
    );
}

// ── ฉาก 2: เข้าสู่ระบบ ───────────────────────────────────────────────────────────────────────────
// ตะกร้า (ยังไม่ล็อกอิน) → "เข้าสู่ระบบเพื่อชำระเงิน" → หน้าเข้าสู่ระบบ → พิมพ์ → กดเข้าสู่ระบบ

const S2 = { tapLogin: 1700, login: 2200, tapUser: 2800, typeUser: 3000, tapPass: 4000, typePass: 4200, tapSubmit: 5400, end: 6600 };

function SceneLogin({ t, demo }: { t: number; demo: DemoData }) {
    if (t < S2.login) return <CartPage product={demo.product} loggedIn={false} />;

    const username = typed(DEMO_USERNAME, t, S2.typeUser);
    const password = "•".repeat(typed("12345678", t, S2.typePass).length);
    const focus = t >= S2.tapPass ? "pass" : t >= S2.tapUser ? "user" : null;
    const pending = t >= S2.tapSubmit + 50;
    const focusClass = "border-brand-500 ring-2 ring-brand-500/20";
    return (
        <Page pageKey="login" nav={<DemoNavbar cartCount={1} />}>
            <main className="px-4 py-12">
                <Card className="w-full p-6">
                    <h3 className="text-xl font-semibold text-slate-900 mb-6 text-center">เข้าสู่ระบบ</h3>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้หรืออีเมล</label>
                            <span data-demo="login-user" className="block">
                                <Input value={username} readOnly className={cn(focus === "user" && focusClass)} />
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
                            <span data-demo="login-pass" className="block">
                                <Input value={password} readOnly className={cn(focus === "pass" && !pending && focusClass)} />
                            </span>
                        </div>
                        <span data-demo="login-submit" className="mt-2 block">
                            <Button size="lg" className="w-full" disabled={pending}>
                                {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                            </Button>
                        </span>
                        <p className="text-center text-sm text-slate-500">ลืมรหัสผ่าน?</p>
                        <p className="text-center text-sm text-slate-500">
                            ยังไม่มีบัญชี? <span className="font-medium text-brand-600">สมัครสมาชิก</span>
                        </p>
                    </div>
                </Card>
            </main>
        </Page>
    );
}

// ── ฉาก 3: ชำระเงิน ──────────────────────────────────────────────────────────────────────────────
// ตะกร้า (ล็อกอินแล้ว) → ใส่โค้ดส่วนลด → ดำเนินการชำระเงิน → QR พร้อมเพย์ → สแกนจ่าย → ชำระเงินสำเร็จ

const S3 = { tapCoupon: 800, typeCoupon: 1000, tapCheckout: 2700, order: 3400, scan: 5200, paid: 8000, end: 11000 };

function OrderSummary({ product }: { product: Product }) {
    const subtotal = effectivePrice(product);
    const discount = Math.round(subtotal * DEMO_DISCOUNT_RATE);
    return (
        <Card className="p-5 mb-6">
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{product.prod_name}</span>
                <span className="font-medium text-slate-800">{formatBaht(subtotal)}</span>
            </div>
            <div className="border-t border-slate-100 mt-4 pt-4 flex flex-col gap-1.5 text-sm">
                <div className="flex items-center justify-between text-slate-500">
                    <span>ยอดรวม</span>
                    <span>{formatBaht(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                    <span>ส่วนลด</span>
                    <span>-{formatBaht(discount)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-slate-900 mt-1">
                    <span>ยอดชำระ</span>
                    <span>{formatBaht(subtotal - discount)}</span>
                </div>
            </div>
        </Card>
    );
}

function ScenePay({ t, demo }: { t: number; demo: DemoData }) {
    const { product } = demo;
    if (t < S3.order) {
        return (
            <CartPage
                product={product}
                loggedIn
                coupon={typed(DEMO_COUPON, t, S3.typeCoupon, 120)}
                pending={t >= S3.tapCheckout + 50}
            />
        );
    }

    if (t < S3.paid) {
        const scanning = t >= S3.scan;
        return (
            <Page pageKey="order-pending" nav={<DemoNavbar />}>
                <main className="px-4 py-10">
                    <div className="flex flex-col items-center text-center mb-8">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3">
                            <Clock size={28} />
                        </span>
                        <h3 className="text-xl font-semibold text-slate-900">สแกน QR เพื่อชำระเงิน</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-4">
                            เลขที่คำสั่งซื้อ {DEMO_ORDER_ID} — สิทธิ์จะเข้าบัญชีอัตโนมัติทันทีที่ยืนยันการชำระเงินสำเร็จ
                        </p>
                        <div className="relative w-56 h-56 rounded-lg border border-slate-100 overflow-hidden">
                            <FakeQr />
                            {/* แอปธนาคารกำลังสแกน — เส้นสแกนวิ่ง + ป้ายบอก */}
                            {scanning && <span className="flow-scan-line absolute inset-x-2 h-0.5 rounded-full bg-brand-500 shadow-[0_0_12px_2px] shadow-brand-400" />}
                        </div>
                        <p
                            className={cn(
                                "mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity duration-300",
                                scanning ? "opacity-100" : "opacity-0"
                            )}
                        >
                            สแกนจ่ายด้วยแอปธนาคาร
                        </p>
                        <div className="mt-3">
                            <Button variant="ghost" size="sm" className="text-red-500">
                                ยกเลิกคำสั่งซื้อ
                            </Button>
                        </div>
                    </div>
                    <OrderSummary product={product} />
                </main>
            </Page>
        );
    }

    return (
        <Page pageKey="order-paid" nav={<DemoNavbar />}>
            <main className="px-4 py-10">
                <div className="flex flex-col items-center text-center mb-8">
                    <span className="flow-pop flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 mb-3">
                        <CheckCircle2 size={28} />
                    </span>
                    <h3 className="text-xl font-semibold text-slate-900">ชำระเงินสำเร็จ</h3>
                    <p className="text-sm text-slate-500 mt-1">เลขที่คำสั่งซื้อ {DEMO_ORDER_ID}</p>
                </div>
                <OrderSummary product={product} />
                <Button variant="secondary" className="w-full">
                    เลือกดูแนวข้อสอบเพิ่มเติม
                </Button>
            </main>
        </Page>
    );
}

// ── ข้อมูลตัวอย่างของฉาก 4-7 (โจทย์แต่งเอง ไม่ใช่ของชุดที่ขายจริง — ห้ามเอาเนื้อหาที่ต้องซื้อมาโชว์หน้าแรก) ──────

type DemoQuestion = { text: string; choices: string[]; answer: number; pick: number };

// ข้อที่โชว์ตอนทำข้อสอบ: 3 ข้อแรก + ข้อสุดท้ายของชุด (ช่วงกลางข้ามด้วยป้าย "ผ่านไป 45 นาที")
const EXAM_QUESTIONS: DemoQuestion[] = [
    { text: "อนุกรมต่อไปนี้ 3, 6, 12, 24, ... ตัวเลขถัดไปคือข้อใด?", choices: ["36", "42", "48", "52"], answer: 2, pick: 2 },
    { text: "หนังสือ : ห้องสมุด :: ยา : ?", choices: ["โรงพยาบาล", "ร้านขายยา", "แพทย์", "คนไข้"], answer: 1, pick: 1 },
    { text: "ซื้อสินค้าราคา 250 บาท ได้ส่วนลด 20% ต้องจ่ายเงินเท่าใด?", choices: ["180 บาท", "200 บาท", "210 บาท", "230 บาท"], answer: 1, pick: 1 },
    { text: "ข้อใดสะกดถูกต้องทุกคำ?", choices: ["กะเพรา, ผัดไทย", "กระเพรา, ผัดไท", "กะเพา, ผัดไทย", "กระเพา, ผัดไท"], answer: 0, pick: 0 },
];

// ข้อที่โชว์ในฉากทบทวน — ตอบผิด เพื่อให้เห็นครบ 4 อย่างของหน้าทบทวน (CLAUDE.md ข้อ 4)
const REVIEW_QUESTION = {
    number: 17,
    text: "อนุกรมต่อไปนี้ 2, 6, 12, 20, 30, ... ตัวเลขถัดไปคือข้อใด?",
    choices: [
        { text: "40", correct: false, picked: true, reason: "บวกเพิ่มทีละ 10 เท่าเดิม แต่ผลต่างต้องเพิ่มขึ้นทีละ 2 (4, 6, 8, 10 → 12)" },
        { text: "42", correct: true, picked: false, reason: "" },
        { text: "44", correct: false, picked: false, reason: "ผลต่างเพิ่มทีละ 2 ไม่ใช่ 4" },
        { text: "36", correct: false, picked: false, reason: "ผลต่างลดลง ซึ่งขัดกับรูปแบบของโจทย์" },
    ],
    explanation: "1. หาผลต่างทีละคู่: 6−2=4, 12−6=6, 20−12=8, 30−20=10\n2. ผลต่างเพิ่มขึ้นทีละ 2 เสมอ → ผลต่างถัดไป = 12\n3. ตัวถัดไป = 30 + 12 = 42",
};

const TOPICS = [
    { name: "อนุกรม", accuracy: 45 },
    { name: "ภาษาไทย", accuracy: 72 },
    { name: "อุปมาอุปไมย", accuracy: 88 },
    { name: "คณิตศาสตร์พื้นฐาน", accuracy: 96 },
];

const EXAM_MINUTES = 60;
const PASS_PERCENT = 60;

/** ตัวเลขผลสอบที่สอดคล้องกันทั้งหน้า คิดจากจำนวนข้อจริงของชุด */
function demoResult(total: number) {
    const skipped = Math.max(1, Math.round(total * 0.03));
    const correct = Math.round(total * 0.8);
    const wrong = total - correct - skipped;
    const percent = Math.round((correct / total) * 100);
    return { total, correct, wrong, skipped, percent, required: Math.ceil((total * PASS_PERCENT) / 100), usedSeconds: 52 * 60 };
}

const clock = (seconds: number) =>
    `${String(Math.max(0, Math.floor(seconds / 60))).padStart(2, "0")}:${String(Math.max(0, Math.floor(seconds % 60))).padStart(2, "0")}`;

// ── ฉาก 4: เลือกชุดในคลัง + เลือกโหมด ────────────────────────────────────────────────────────────────

const S4 = { scrollOwned: 700, tapStart: 1800, mode: 2300, tapTimed: 3500, tapBegin: 4900, end: 6200 };

function ModeCard({
    icon: Icon,
    title,
    description,
    selected,
    demo,
}: {
    icon: typeof BookOpen;
    title: string;
    description: string;
    selected: boolean;
    demo: string;
}) {
    return (
        <span
            data-demo={demo}
            className={cn(
                "relative block text-left p-5 rounded-2xl border-2 transition-all",
                selected ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-white"
            )}
        >
            {selected && (
                <span className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check size={12} />
                </span>
            )}
            <span
                className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3",
                    selected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                )}
            >
                <Icon size={18} />
            </span>
            <span className="block font-medium text-slate-800 mb-1">{title}</span>
            <span className="block text-sm text-slate-500 leading-relaxed">{description}</span>
        </span>
    );
}

const LIBRARY_SHORTCUTS = [
    {
        icon: Timer,
        tone: "bg-brand-50 text-brand-600",
        title: "สนามสอบเสมือนจริง",
        desc: "ซ้อมทั้งสนามในรอบเดียว จับเวลา ตัดผ่านรายวิชา — ข้อสุ่มใหม่ทุกครั้งจากทุกชุดที่คุณมี",
    },
    {
        icon: ClipboardList,
        tone: "bg-amber-50 text-amber-600",
        title: "แผนทบทวนวันนี้",
        desc: "ทบทวนข้อที่เคยพลาดวันละนิด ระบบนัดทวนซ้ำให้เองจนกว่าจะจำได้จริง",
    },
];

function SceneStart({ t, demo }: { t: number; demo: DemoData }) {
    const { product } = demo;
    if (t < S4.mode) {
        return (
            <Page pageKey="library" nav={<DemoNavbar />} scrollTo={t >= S4.scrollOwned ? "owned" : undefined}>
                <main className="px-4 py-10">
                    <h3 className="text-2xl font-semibold text-slate-800 mb-6">คลังข้อสอบของฉัน</h3>
                    {LIBRARY_SHORTCUTS.map((c) => (
                        <Card key={c.title} className="mb-4 flex items-center gap-4 p-5">
                            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", c.tone)}>
                                <c.icon size={20} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-medium text-slate-800">{c.title}</span>
                                <span className="mt-0.5 block text-xs text-slate-400">{c.desc}</span>
                            </span>
                            <ChevronRight size={18} className="shrink-0 text-slate-300" />
                        </Card>
                    ))}
                    <div className="mt-8 grid grid-cols-2 gap-3" data-demo-anchor="owned">
                        <Card className="overflow-hidden flex flex-col">
                            <div className="relative">
                                <Cover product={product} sizes="170px" className="aspect-[210/297]" />
                                <Badge tone="success" className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px]">
                                    ใช้งานได้
                                </Badge>
                            </div>
                            <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                                <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">{product.prod_name}</p>
                                <div className="mt-auto pt-1 flex flex-col gap-1.5">
                                    <span data-demo="start-exam" className="block">
                                        <Button size="sm" className="w-full">
                                            ทำข้อสอบ
                                        </Button>
                                    </span>
                                    <span className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-[11px] text-slate-500">
                                        <Download size={12} />
                                        ดาวน์โหลด PDF
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </main>
            </Page>
        );
    }

    const timed = t >= S4.tapTimed;
    return (
        <Page pageKey="mode" nav={<DemoNavbar />}>
            <main className="px-4 py-12">
                <div className="text-center mb-10">
                    <p className="text-sm font-medium text-brand-600 mb-1.5">{product.prod_name}</p>
                    <h3 className="text-2xl font-semibold text-slate-900">เลือกโหมดทำข้อสอบ</h3>
                </div>
                <div className="flex flex-col gap-4">
                    <ModeCard
                        demo="mode-practice"
                        icon={BookOpen}
                        title="โหมดฝึก"
                        description="ตอบแล้วเห็นเฉลยทันที เข้าใจวิธีคิดทีละข้อ"
                        selected={!timed}
                    />
                    <ModeCard
                        demo="mode-timed"
                        icon={Timer}
                        title="โหมดจับเวลา"
                        description={`จำลองสอบจริง เฉลยตอนจบ (${EXAM_MINUTES} นาที)`}
                        selected={timed}
                    />
                    <span data-demo="begin" className="block">
                        <Button size="lg" className="w-full">
                            {t >= S4.tapBegin + 50 ? "กำลังเริ่ม..." : "เริ่มทำข้อสอบ"}
                        </Button>
                    </span>
                </div>
            </main>
        </Page>
    );
}

// ── ฉาก 5: ทำข้อสอบ (โหมดจับเวลา) ────────────────────────────────────────────────────────────────
// ตอบข้อ 1-3 → ป้าย "ผ่านไป 45 นาที" → ข้อสุดท้าย → ส่งคำตอบ

const S5 = {
    q: [
        { show: 0, pick: 1300, next: 2300 },
        { show: 2400, pick: 3300, next: 4200 },
        { show: 4300, pick: 5100, next: 6000 },
    ],
    skip: 6100,
    last: 7300,
    lastPick: 8400,
    submit: 9500,
    end: 10800,
};
const SKIPPED_MINUTES = 45;

function SceneExam({ t, demo }: { t: number; demo: DemoData }) {
    const total = demo.product.question_count;
    // ข้อไหน / เลือกแล้วหรือยัง / ตอบไปกี่ข้อ ณ เวลา t
    let index = 0;
    let picked = false;
    let answered = 0;
    let q = EXAM_QUESTIONS[0];
    if (t >= S5.last) {
        index = total - 1;
        q = EXAM_QUESTIONS[3];
        picked = t >= S5.lastPick;
        // มีข้อที่ข้ามไว้ระหว่างทาง (ไม่ได้ตอบ) ให้ตรงกับ "ไม่ได้ตอบ" ในหน้าผลสอบฉากถัดไป
        answered = total - demoResult(total).skipped - 1 + (picked ? 1 : 0);
    } else {
        for (let i = S5.q.length - 1; i >= 0; i--) {
            if (t >= S5.q[i].show) {
                index = i;
                q = EXAM_QUESTIONS[i];
                picked = t >= S5.q[i].pick;
                answered = i + (picked ? 1 : 0);
                break;
            }
        }
    }
    const elapsed = t / 1000 + (t >= S5.last ? SKIPPED_MINUTES * 60 : 0);
    const isLast = index === total - 1;
    const submitting = t >= S5.submit + 50;

    return (
        <Page
            pageKey="exam"
            className="bg-slate-50"
            overlay={
                <>
                    {/* แถบนำทางข้อ (ย่ออยู่) มุมขวาบน — ตาม ExamRunner */}
                    <div className="absolute top-6 right-3 z-10">
                        <Card className="p-2 flex items-center justify-center shadow-xl shadow-slate-900/10">
                            <span className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-slate-500">
                                <PanelRightOpen size={20} />
                                <span className="text-[11px] font-medium tabular-nums">
                                    {answered}/{total}
                                </span>
                            </span>
                        </Card>
                    </div>
                    {/* ตัดข้ามช่วงกลางของการสอบแบบตัดต่อวิดีโอ ให้คนดูรู้ว่าเวลาผ่านไป */}
                    <div
                        className={cn(
                            "absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300",
                            t >= S5.skip && t < S5.last ? "opacity-100" : "opacity-0"
                        )}
                    >
                        <span className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-lg">
                            ⏩ ผ่านไป {SKIPPED_MINUTES} นาที
                        </span>
                    </div>
                </>
            }
        >
            <div className="px-4 py-8 flex flex-col">
                {/* เว้นขวาไว้ให้แถบนำทางข้อที่ลอยอยู่ (ของจริงลอยทับเหมือนกัน แต่จอจริงกว้างกว่า) */}
                <div className="flex items-center justify-between mb-2 text-sm text-slate-500 pr-20">
                    <span className="flex items-center gap-1.5 text-slate-400">
                        <LogOut size={16} />
                    </span>
                    <span>
                        ข้อ {index + 1} จาก {total}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-600">
                        <Clock size={16} />
                        {clock(EXAM_MINUTES * 60 - elapsed)}
                    </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
                </div>
                <div className="flex items-center justify-center gap-1 rounded-full bg-slate-100 p-1 text-sm mb-8">
                    <span className="rounded-full px-3.5 py-1.5 font-medium bg-white text-brand-600 shadow-sm">ทีละข้อ</span>
                    <span className="rounded-full px-3.5 py-1.5 font-medium text-slate-500">แสดงทุกข้อ</span>
                </div>

                <Card key={index} className="flow-page-in p-6 flex flex-col">
                    <div className="flex items-center justify-end mb-2">
                        <span className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-300">
                            <Flag size={15} />
                        </span>
                    </div>
                    <p className="text-lg font-medium text-slate-900 mb-6 leading-relaxed">{q.text}</p>
                    <div className="flex flex-col gap-3">
                        {q.choices.map((c, i) => (
                            <span
                                key={c}
                                data-demo={`choice-${i}`}
                                className={cn(
                                    "w-full text-left px-4 py-3 rounded-xl border-2 transition-all",
                                    picked && i === q.pick ? "border-brand-500 bg-brand-50/50" : "border-slate-200"
                                )}
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </Card>

                <div className="flex items-center justify-between mt-6">
                    <Button variant="secondary" disabled={index === 0}>
                        <ChevronLeft size={18} />
                        ข้อก่อนหน้า
                    </Button>
                    <span data-demo="exam-next">
                        <Button disabled={submitting}>
                            {isLast ? (submitting ? "กำลังส่ง..." : "ส่งคำตอบ") : "ข้อถัดไป"}
                            {!isLast && <ChevronRight size={18} />}
                        </Button>
                    </span>
                </div>
            </div>
        </Page>
    );
}

// ── ฉาก 6: ดูผลสอบ ───────────────────────────────────────────────────────────────────────────────
// คะแนนนับขึ้น → "ถ้าสอบวันนี้ ผ่านไหม" (ReadinessCard ตัวจริง) → เทียบกับคนอื่น → สรุป → ผลรายหมวด

const S6 = { countFrom: 400, countTo: 1600, scrollPeer: 3600, scrollTopics: 6200, end: 9400 };

function SceneResult({ t, demo }: { t: number; demo: DemoData }) {
    const r = demoResult(demo.product.question_count);
    const progress = Math.min(1, Math.max(0, (t - S6.countFrom) / (S6.countTo - S6.countFrom)));
    const shown = Math.round(r.percent * (1 - Math.pow(1 - progress, 3)));
    const shownCorrect = Math.round((shown / 100) * r.total);
    const shownPassed = shownCorrect >= r.required;
    const barsIn = t >= S6.scrollTopics - 200;
    const scrollTo = t >= S6.scrollTopics ? "topics" : t >= S6.scrollPeer ? "peer" : undefined;
    return (
        <Page pageKey="result" nav={<DemoNavbar />} scrollTo={scrollTo}>
            <main className="px-4 py-10">
                <div className="text-center mb-10">
                    <p className="text-sm text-slate-400 mb-1">{demo.product.prod_name}</p>
                    <h3 className="text-2xl font-semibold text-slate-900 mb-3">เฉลยข้อสอบ</h3>
                    <p className="text-4xl font-semibold text-brand-600 tabular-nums">{shown}%</p>
                </div>

                {/* คำนวณตามคะแนนที่กำลังนับขึ้น — การ์ดเป็นแดง "ยังไม่ผ่าน" แล้วพลิกเป็นเขียวตอนแถบข้ามเส้นเกณฑ์
                    (ถ้าส่งผลจบไปตั้งแต่ต้น จะขึ้น "ผ่านเกณฑ์แล้ว" ทั้งที่ตัวเลขยัง 0%) */}
                <ReadinessCard
                    readiness={{
                        passed: shownPassed,
                        overall: {
                            mode: "percent",
                            pass_percent: PASS_PERCENT,
                            passed: shownPassed,
                            unit: "questions",
                            required: r.required,
                            have: shownCorrect,
                            out_of: r.total,
                            gap: Math.max(0, r.required - shownCorrect),
                        },
                        subjects: [],
                    }}
                    pace={{
                        used_seconds: r.usedSeconds,
                        limit_seconds: EXAM_MINUTES * 60,
                        avg_seconds_per_question: r.usedSeconds / r.total,
                        target_seconds_per_question: (EXAM_MINUTES * 60) / r.total,
                    }}
                    scorePercent={shown}
                    skippedCount={r.skipped}
                />

                <div data-demo-anchor="peer">
                    <Card className="mb-4 flex items-center gap-4 p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <Users size={20} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm text-slate-700">
                                คะแนนครั้งนี้สูงกว่า <span className="text-lg font-semibold text-brand-600 tabular-nums">74%</span> ของคนที่ทำชุดนี้
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                                เทียบกับ 148 คน · คะแนนเฉลี่ยของคนอื่น 63% · นับคนละครั้งที่ดีที่สุด ไม่มีการเปิดเผยว่าใครได้เท่าไหร่
                            </p>
                        </div>
                    </Card>
                    <Card className="mb-4 grid grid-cols-3 divide-x divide-slate-100 p-5">
                        {[
                            { n: r.correct, label: "ตอบถูก", c: "text-green-600" },
                            { n: r.wrong, label: "ตอบผิด", c: "text-red-500" },
                            { n: r.skipped, label: "ไม่ได้ตอบ", c: "text-slate-400" },
                        ].map((x) => (
                            <div key={x.label} className="text-center">
                                <p className={cn("text-xl font-semibold", x.c)}>{x.n}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{x.label}</p>
                            </div>
                        ))}
                    </Card>
                    <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                            ตอบถูก {r.correct} จาก {r.total} ข้อ
                        </span>
                        <span>ใช้เวลา 52 นาที</span>
                    </div>
                </div>

                <div data-demo-anchor="topics">
                    <Card className="mb-4 p-5">
                        <p className="mb-3 text-sm font-medium text-slate-600">ผลรายหมวดของครั้งนี้</p>
                        <div className="flex flex-col gap-2.5">
                            {TOPICS.map((tp) => (
                                <div key={tp.name}>
                                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                                        <span className="min-w-0 text-slate-600">{tp.name}</span>
                                        <span className={cn("shrink-0 font-medium", tp.accuracy < 50 ? "text-red-500" : "text-slate-600")}>
                                            {tp.accuracy}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-[width] duration-700 ease-out",
                                                tp.accuracy < 50 ? "bg-red-400" : "bg-brand-500"
                                            )}
                                            style={{ width: barsIn ? `${tp.accuracy}%` : "0%" }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="flex items-center gap-4 p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <ListChecks size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-medium text-slate-800">ทบทวน {r.wrong} ข้อที่ยังตอบผิดในชุดนี้</span>
                            <span className="mt-0.5 block text-xs text-slate-400">
                                รวมทุกครั้งที่ทำชุดนี้ ไม่ใช่เฉพาะรอบนี้ — ดูเฉลยพร้อมวิธีคิดทีละข้อ
                            </span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-slate-300" />
                    </Card>
                </div>
            </main>
        </Page>
    );
}

// ── ฉาก 7: ทบทวนรายข้อ ───────────────────────────────────────────────────────────────────────────
// ข้อที่ตอบผิด: คำตอบที่เลือก / คำตอบที่ถูก / เหตุผลว่าทำไมข้อที่เลือกผิด / วิธีคิดทีละขั้น → บันทึกไว้ทบทวน

const S7 = { spotWrong: 1400, spotReason: 2600, spotExplain: 3800, tapBookmark: 5400, scrollEnd: 6600, end: 8600 };

function SceneReview({ t }: { t: number; demo: DemoData }) {
    const q = REVIEW_QUESTION;
    const bookmarked = t >= S7.tapBookmark + 50;
    // ไฮไลต์ทีละจุดตามลำดับที่อยากให้คนดูมอง
    const spot =
        t >= S7.tapBookmark ? null
        : t >= S7.spotExplain ? "explain"
        : t >= S7.spotReason ? "reason"
        : t >= S7.spotWrong ? "wrong"
        : null;
    const ring = "ring-4 ring-amber-300/70 ring-offset-2 transition-shadow duration-300";
    return (
        <Page pageKey="review" nav={<DemoNavbar />} scrollTo={t >= S7.scrollEnd ? "review-end" : undefined}>
            <main className="px-4 py-8">
                <Card className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <p className="font-medium text-slate-900 leading-relaxed">
                            <span className="text-slate-400 mr-1.5">ข้อ {q.number}.</span>
                            {q.text}
                        </p>
                        <span className="shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">
                            <X size={13} />
                            ผิด
                        </span>
                    </div>
                    <div className="flex flex-col gap-2 mb-4">
                        {q.choices.map((c) => (
                            <div key={c.text}>
                                <div
                                    className={cn(
                                        "px-3.5 py-2.5 rounded-lg border text-sm flex items-start justify-between gap-2",
                                        c.correct ? "border-green-300 bg-green-50" : c.picked ? "border-red-200 bg-red-50" : "border-slate-100 text-slate-500",
                                        spot === "wrong" && (c.correct || c.picked) && ring
                                    )}
                                >
                                    <span className="flex-1">{c.text}</span>
                                    {c.correct && <Check size={15} className="text-green-600 shrink-0" />}
                                    {c.picked && <X size={15} className="text-red-500 shrink-0" />}
                                </div>
                                {c.reason && (
                                    <p className={cn("text-xs mt-1 px-1 rounded", c.picked ? "text-red-500" : "text-slate-400", spot === "reason" && c.picked && ring)}>
                                        {c.reason}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className={cn("p-3.5 rounded-lg bg-brand-50/60 border border-brand-100 mb-3", spot === "explain" && ring)}>
                        <p className="text-xs font-medium text-brand-700 mb-1">วิธีคิด</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{q.explanation}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <span data-demo="bookmark" className="-m-2 flex items-center gap-1.5 rounded-lg p-2 text-sm text-slate-400">
                            {bookmarked ? <BookmarkCheck size={16} className="text-brand-600" /> : <Bookmark size={16} />}
                            {bookmarked ? "บันทึกไว้ทบทวนแล้ว" : "บันทึกไว้ทบทวน"}
                        </span>
                        <span className="-m-2 flex items-center gap-1.5 rounded-lg p-2 text-sm text-slate-400">
                            <Flag size={16} />
                            แจ้งปัญหาข้อนี้
                        </span>
                    </div>
                </Card>
                <div className="mt-10 flex flex-wrap justify-center gap-3" data-demo-anchor="review-end">
                    <Button className="inline-flex items-center gap-1.5">
                        <RotateCcw size={15} />
                        ทำชุดนี้อีกครั้ง
                    </Button>
                    <Button variant="secondary">กลับไปคลังข้อสอบ</Button>
                </div>
                <div className="h-64" />
            </main>
        </Page>
    );
}

// ── รายการฉาก ────────────────────────────────────────────────────────────────────────────────────

export const SCENES: Scene[] = [
    {
        key: "choose",
        title: "เลือกชุดข้อสอบ",
        caption: "เลือกชุดจากหน้าแรกหรือหน้ารวมชุด ดูรายละเอียดแล้วเพิ่มลงตะกร้า — ยังไม่ต้องสมัครสมาชิก",
        duration: S1.end,
        waypoints: [
            { at: S1.tapCard, target: "product-card", y: 0.35 },
            { at: S1.tapAdd, target: "add-to-cart" },
            { at: S1.tapCart, target: "nav-cart" },
        ],
        render: SceneChoose,
    },
    {
        key: "login",
        title: "เข้าสู่ระบบ",
        caption: "จะชำระเงินเมื่อไหร่ค่อยเข้าสู่ระบบ ของในตะกร้ายังอยู่ครบ",
        duration: S2.end,
        waypoints: [
            { at: S2.tapLogin, target: "login-to-pay" },
            { at: S2.tapUser, target: "login-user" },
            { at: S2.tapPass, target: "login-pass" },
            { at: S2.tapSubmit, target: "login-submit" },
        ],
        render: SceneLogin,
    },
    {
        key: "pay",
        title: "ชำระเงินด้วย QR พร้อมเพย์",
        caption: "ใส่โค้ดส่วนลดได้ สแกนจ่ายด้วยแอปธนาคาร สิทธิ์เข้าบัญชีอัตโนมัติทันทีที่จ่ายสำเร็จ ไม่ต้องรอแอดมิน",
        duration: S3.end,
        waypoints: [
            { at: S3.tapCoupon, target: "coupon" },
            { at: S3.tapCheckout, target: "checkout" },
        ],
        render: ScenePay,
    },
    {
        key: "start",
        title: "เลือกโหมด เริ่มทำข้อสอบ",
        caption: "ชุดที่ซื้อเข้าคลังทันที เลือกได้ทั้งโหมดฝึก (เห็นเฉลยทันที) และโหมดจับเวลาเหมือนสอบจริง",
        duration: S4.end,
        waypoints: [
            { at: S4.tapStart, target: "start-exam" },
            { at: S4.tapTimed, target: "mode-timed" },
            { at: S4.tapBegin, target: "begin" },
        ],
        render: SceneStart,
    },
    {
        key: "exam",
        title: "ทำข้อสอบ",
        caption: "ทำบนเว็บได้จริง มีตัวจับเวลา บันทึกคำตอบให้อัตโนมัติ ปิดแล้วกลับมาทำต่อได้",
        duration: S5.end,
        waypoints: [
            ...S5.q.flatMap((q, i) => [
                { at: q.pick, target: `choice-${EXAM_QUESTIONS[i].pick}` },
                { at: q.next, target: "exam-next" },
            ]),
            { at: S5.lastPick, target: `choice-${EXAM_QUESTIONS[3].pick}` },
            { at: S5.submit, target: "exam-next" },
        ],
        render: SceneExam,
    },
    {
        key: "result",
        title: "ดูผลสอบ",
        caption: "รู้ทันทีว่าถ้าสอบวันนี้ผ่านไหม คะแนนเทียบกับคนอื่นเป็นอย่างไร และหมวดไหนที่ต้องเร่ง",
        duration: S6.end,
        waypoints: [],
        render: SceneResult,
    },
    {
        key: "review",
        title: "ทบทวนรายข้อ",
        caption: "ทุกข้อบอกคำตอบที่เลือก คำตอบที่ถูก เหตุผลว่าทำไมข้อที่เลือกผิด และวิธีคิดทีละขั้น",
        duration: S7.end,
        waypoints: [{ at: S7.tapBookmark, target: "bookmark", x: 0.2 }],
        render: SceneReview,
    },
];
