import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import { formatBaht } from "@/lib/api";
import OrderStatusPoller from "./OrderStatusPoller";
import CancelOrderButton from "./CancelOrderButton";

export const metadata = { title: "คำสั่งซื้อของฉัน" };

type OrderItem = { oi_product_id: string; prod_name: string; oi_price: string; oi_discount: string; oi_total: string };
type Order = {
    ord_id: string;
    ord_subtotal: string;
    ord_discount: string;
    ord_total: string;
    ord_status: "pending" | "paid" | "cancelled";
    ord_paid_at: string | null;
    ord_qr_image_url: string | null;
    ord_qr_expires_at: string | null;
    items: OrderItem[];
};

export default async function OrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await authorizedFetch(`/store/orders/${id}`);
    if (!res.ok) notFound();
    const order: Order = await res.json();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-10">
                {order.ord_status === "paid" && (
                    <div className="flex flex-col items-center text-center mb-8">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 mb-3">
                            <CheckCircle2 size={28} />
                        </span>
                        <h1 className="text-xl font-semibold text-slate-900">ชำระเงินสำเร็จ</h1>
                        <p className="text-sm text-slate-500 mt-1">เลขที่คำสั่งซื้อ {order.ord_id}</p>
                    </div>
                )}

                {order.ord_status === "pending" && (
                    <div className="flex flex-col items-center text-center mb-8">
                        <OrderStatusPoller orderId={order.ord_id} initialStatus={order.ord_status} />
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3">
                            <Clock size={28} />
                        </span>
                        <h1 className="text-xl font-semibold text-slate-900">
                            {order.ord_qr_image_url ? "สแกน QR เพื่อชำระเงิน" : "กำลังตรวจสอบการชำระเงิน"}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 mb-4">
                            เลขที่คำสั่งซื้อ {order.ord_id} — สิทธิ์จะเข้าบัญชีอัตโนมัติทันทีที่ยืนยันการชำระเงินสำเร็จ
                        </p>

                        {order.ord_qr_image_url && order.ord_qr_expires_at && new Date(order.ord_qr_expires_at) > new Date() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={order.ord_qr_image_url}
                                alt="สแกนจ่ายผ่าน PromptPay"
                                className="w-56 h-56 sm:w-64 sm:h-64 rounded-lg border border-slate-100"
                            />
                        ) : order.ord_qr_image_url ? (
                            <p className="text-sm text-red-500">QR หมดอายุแล้ว — กรุณาติดต่อแอดมินเพื่อยืนยันการชำระเงิน</p>
                        ) : (
                            <p className="text-sm text-slate-400">
                                ยังไม่สามารถสร้าง QR ได้ในขณะนี้ — กรุณาติดต่อแอดมินเพื่อยืนยันการชำระเงิน พร้อมแจ้งเลขที่คำสั่งซื้อ {order.ord_id}
                            </p>
                        )}

                        <div className="mt-5">
                            <CancelOrderButton orderId={order.ord_id} />
                        </div>
                    </div>
                )}

                {order.ord_status === "cancelled" && (
                    <div className="flex flex-col items-center text-center mb-8">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 mb-3">
                            <XCircle size={28} />
                        </span>
                        <h1 className="text-xl font-semibold text-slate-900">คำสั่งซื้อถูกยกเลิก</h1>
                        <p className="text-sm text-slate-500 mt-1">เลขที่คำสั่งซื้อ {order.ord_id}</p>
                    </div>
                )}

                <Card className="p-5 mb-6">
                    <div className="flex flex-col gap-3">
                        {order.items.map((item) => (
                            <div key={item.oi_product_id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700">{item.prod_name}</span>
                                <span className="font-medium text-slate-800">{formatBaht(item.oi_total)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-slate-100 mt-4 pt-4 flex flex-col gap-1.5 text-sm">
                        <div className="flex items-center justify-between text-slate-500">
                            <span>ยอดรวม</span>
                            <span>{formatBaht(order.ord_subtotal)}</span>
                        </div>
                        {Number(order.ord_discount) > 0 && (
                            <div className="flex items-center justify-between text-slate-500">
                                <span>ส่วนลด</span>
                                <span>-{formatBaht(order.ord_discount)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-base font-semibold text-slate-900 mt-1">
                            <span>ยอดชำระ</span>
                            <span>{formatBaht(order.ord_total)}</span>
                        </div>
                    </div>
                </Card>

                <Link href="/products">
                    <Button variant="secondary" className="w-full">
                        เลือกดูแนวข้อสอบเพิ่มเติม
                    </Button>
                </Link>
            </main>
            <Footer />
        </div>
    );
}
