import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Receipt, ChevronRight } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import { formatBaht } from "@/lib/api";

export const metadata = { title: "คำสั่งซื้อของฉัน" };

type OrderSummary = {
    ord_id: string;
    ord_total: string;
    ord_status: "pending" | "paid" | "cancelled";
    ord_paid_at: string | null;
    ord_created_at: string;
    item_count: number;
    product_names: string[];
};

// ตั้ง timeZone เป็นกรุงเทพตายตัว — หน้านี้ render ฝั่ง server ซึ่งอาจตั้ง TZ เป็น UTC ทำให้วันที่
// เพี้ยนไป 7 ชั่วโมง (ออเดอร์ตอนเช้าจะกลายเป็นวันก่อนหน้า)
function thaiDate(value: string) {
    return new Date(value).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
}

const STATUS = {
    paid: { label: "ชำระเงินแล้ว", icon: CheckCircle2, className: "bg-green-50 text-green-700" },
    pending: { label: "รอชำระเงิน", icon: Clock, className: "bg-amber-50 text-amber-700" },
    cancelled: { label: "ยกเลิกแล้ว", icon: XCircle, className: "bg-slate-100 text-slate-500" },
} as const;

export default async function MyOrdersPage() {
    const res = await authorizedFetch("/store/orders?limit=50");
    const { data: orders }: { data: OrderSummary[] } = res.ok ? await res.json() : { data: [] };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-900 mb-1">คำสั่งซื้อของฉัน</h1>
                <p className="text-sm text-slate-500 mb-8">ประวัติการสั่งซื้อทั้งหมด กดเข้าไปดูใบเสร็จหรือชำระเงินที่ค้างอยู่ได้</p>

                {orders.length === 0 ? (
                    <Card className="flex flex-col items-center text-center py-14 px-6">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
                            <Receipt size={26} />
                        </span>
                        <p className="text-slate-600 font-medium">ยังไม่มีคำสั่งซื้อ</p>
                        <p className="text-sm text-slate-400 mt-1 mb-6">เลือกชุดข้อสอบที่สนใจแล้วเริ่มทำได้เลย</p>
                        <Link href="/products">
                            <Button>ดูแนวข้อสอบทั้งหมด</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-3">
                        {orders.map((order) => {
                            const status = STATUS[order.ord_status] ?? STATUS.cancelled;
                            const StatusIcon = status.icon;
                            return (
                                <Link key={order.ord_id} href={`/orders/${order.ord_id}`} className="group">
                                    <Card className="p-4 sm:p-5 transition-colors group-hover:border-brand-200">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                                                        <StatusIcon size={12} />
                                                        {status.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {thaiDate(order.ord_paid_at ?? order.ord_created_at)}
                                                    </span>
                                                </div>
                                                {/* โชว์ชื่อชุดข้อสอบตรงนี้เลย ลูกค้าจะได้ไม่ต้องกดเข้าไปทีละใบเพื่อหาว่าใบไหนคือใบที่ตามหา */}
                                                <p className="text-sm text-slate-700 line-clamp-2">
                                                    {order.product_names.join(" · ") || "ไม่มีรายการ"}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {order.item_count} รายการ · เลขที่ {order.ord_id}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="font-semibold text-slate-900 whitespace-nowrap">{formatBaht(order.ord_total)}</span>
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
