import Image from "next/image";
import Link from "next/link";
import { BookOpenCheck, FileQuestion } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ExportPdfButton from "@/app/components/ExportPdfButton";
import ShareButton from "@/app/components/ShareButton";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { authorizedFetch } from "@/lib/session";
import { productCoverUrl } from "@/lib/api";

export const metadata = { title: "คลังข้อสอบของฉัน" };

type Entitlement = {
    ent_id: string;
    ent_product_id: string;
    prod_name: string;
    prod_cover_url: string | null;
    ent_expires_at: string | null;
    effective_status: "active" | "expired" | "revoked";
};

const STATUS_LABEL: Record<Entitlement["effective_status"], string> = {
    active: "ใช้งานได้",
    expired: "หมดอายุ",
    revoked: "ถูกยกเลิก",
};

export default async function LibraryPage() {
    const res = await authorizedFetch("/store/my/entitlements");
    const { data: entitlements }: { data: Entitlement[] } = res.ok ? await res.json() : { data: [] };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-8">คลังข้อสอบของฉัน</h1>

                {entitlements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <BookOpenCheck size={40} className="mb-3" />
                        <p className="mb-4">ยังไม่มีชุดข้อสอบในคลังของคุณ</p>
                        <Link href="/products">
                            <Button variant="secondary">เลือกดูแนวข้อสอบ</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {entitlements.map((e) => {
                            const cover = productCoverUrl(e.prod_cover_url);
                            return (
                                <Card key={e.ent_id} className="overflow-hidden flex flex-col">
                                    {/* สัดส่วน A4 เหมือน ProductCard — เป็นรูปหน้าปกชุดเดียวกัน ถ้าใช้สัดส่วนต่างกันจะครอปคนละแบบ */}
                                    <div className="relative aspect-[210/297] bg-slate-50">
                                        {cover ? (
                                            <Image src={cover} alt={e.prod_name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-slate-300">
                                                <FileQuestion size={24} />
                                            </div>
                                        )}
                                        <Badge
                                            tone={e.effective_status === "active" ? "success" : "neutral"}
                                            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px]"
                                        >
                                            {STATUS_LABEL[e.effective_status]}
                                        </Badge>
                                        <ShareButton
                                            url={`/products/${e.ent_product_id}`}
                                            title={`แนวข้อสอบ ${e.prod_name} | Fasttiw`}
                                            className="absolute bottom-1.5 right-1.5 h-7 w-7"
                                        />
                                    </div>
                                    <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                                        <h3 className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">{e.prod_name}</h3>
                                        {e.ent_expires_at && (
                                            <p className="text-[11px] text-slate-400">
                                                หมดอายุ {new Date(e.ent_expires_at).toLocaleDateString("th-TH")}
                                            </p>
                                        )}
                                        <div className="mt-auto pt-1 flex flex-col gap-1.5">
                                            {e.effective_status === "active" ? (
                                                <>
                                                    <Link href={`/exam/${e.ent_product_id}`}>
                                                        <Button size="sm" className="w-full">ทำข้อสอบ</Button>
                                                    </Link>
                                                    <ExportPdfButton productId={e.ent_product_id} />
                                                </>
                                            ) : (
                                                <Button size="sm" className="w-full" disabled>
                                                    ใช้งานไม่ได้
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
