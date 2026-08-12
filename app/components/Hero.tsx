"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Smartphone, ListChecks, Timer, Bookmark, History, BadgePercent, LayoutGrid, GraduationCap, NotebookPen, QrCode, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
    DesktopMockup,
    MobileMockup,
    ResultsMockup,
    ModeSelectMockup,
    BookmarkMockup,
    HistoryMockup,
    PricingMockup,
    CatalogMockup,
    UniversityMockup,
    CourseworkMockup,
    QrPaymentMockup,
} from "./ExamPreviewMockup";

const ROTATE_MS = 4500;

const VARIANTS = [
    {
        badgeIcon: Sparkles,
        badge: "เตรียมสอบด้วยเฉลยที่อธิบายวิธีคิดจริง",
        headlineTop: "ทำแนวข้อสอบออนไลน์",
        headlineHighlight: "พร้อมเฉลยละเอียด",
        subtitle: "เตรียมสอบได้จริง ไม่ใช่แค่อ่าน PDF — ทำโจทย์ ดูผล และเข้าใจวิธีคิดทุกข้อ",
        Mockup: DesktopMockup,
    },
    {
        badgeIcon: Smartphone,
        badge: "ใช้ง่าย ทำได้ทุกที่ผ่านมือถือ",
        headlineTop: "ติวสอบได้ทุกที่",
        headlineHighlight: "แค่มือถือเครื่องเดียว",
        subtitle: "ไม่ต้องพกโน้ตบุ๊ค ไม่ต้องเปิดคอม — หยิบมือถือขึ้นมาก็ทำโจทย์ได้ทันที",
        Mockup: MobileMockup,
    },
    {
        badgeIcon: ListChecks,
        badge: "ทำข้อสอบได้จริงบนเว็บ ไม่ใช่แค่ไฟล์ PDF",
        headlineTop: "ทำโจทย์ ส่งคำตอบ",
        headlineHighlight: "ดูผลได้ทันที",
        subtitle: "ไม่ต้องรอเฉลยแยกไฟล์ ทำข้อสอบบนเว็บได้จริง เห็นคะแนนและผลลัพธ์ทันทีที่ส่งคำตอบ",
        Mockup: ResultsMockup,
    },
    {
        badgeIcon: Timer,
        badge: "เลือกได้ทั้งโหมดฝึกและจับเวลา",
        headlineTop: "ฝึกแบบชิลๆ",
        headlineHighlight: "หรือจับเวลาสอบจริง",
        subtitle: "เลือกโหมดฝึกดูเฉลยทันที หรือโหมดจับเวลาจำลองสนามสอบจริง ก่อนไปเจอของจริง",
        Mockup: ModeSelectMockup,
    },
    {
        badgeIcon: Bookmark,
        badge: "บันทึกข้อที่ทำผิดไว้ทบทวนได้",
        headlineTop: "พลาดข้อไหน",
        headlineHighlight: "บันทึกไว้ทบทวนทีหลัง",
        subtitle: "กลับมาดูเฉพาะข้อที่เคยพลาดได้ง่ายๆ ไม่ต้องไล่ทำใหม่ทั้งชุด",
        Mockup: BookmarkMockup,
    },
    {
        badgeIcon: History,
        badge: "ดูประวัติการทำข้อสอบย้อนหลังได้",
        headlineTop: "ทำไปแล้วกี่ครั้ง",
        headlineHighlight: "เช็กความก้าวหน้าได้เสมอ",
        subtitle: "ดูคะแนนและประวัติการทำข้อสอบทุกครั้งที่ผ่านมา ไม่มีข้อมูลหายไปไหน",
        Mockup: HistoryMockup,
    },
    {
        badgeIcon: BadgePercent,
        badge: "ราคาไม่แพง จับต้องได้",
        headlineTop: "ราคาเบาๆ",
        headlineHighlight: "ใครก็จับต้องได้",
        subtitle: "เริ่มต้นเตรียมสอบได้โดยไม่ต้องเสียเงินก้อนใหญ่ คุ้มกว่าซื้อหนังสือหลายเล่ม",
        Mockup: PricingMockup,
    },
    {
        badgeIcon: LayoutGrid,
        badge: "มีข้อสอบหลากหลายให้เลือก",
        headlineTop: "เลือกแนวข้อสอบ",
        headlineHighlight: "ได้ตรงสนามที่ต้องการ",
        subtitle: "รวมแนวข้อสอบหลายสนามสอบไว้ในที่เดียว เลือกชุดที่ตรงกับที่คุณกำลังเตรียมตัว",
        Mockup: CatalogMockup,
    },
    {
        badgeIcon: GraduationCap,
        badge: "มีแนวข้อสอบเตรียมสอบเข้ามหาวิทยาลัยด้วย",
        headlineTop: "เตรียมสอบเข้ามหาวิทยาลัย",
        headlineHighlight: "ก็ทำได้ที่นี่",
        subtitle: "ไม่ใช่แค่สอบบรรจุงานราชการ มีแนวข้อสอบ TCAS, GAT/PAT และวิชาสามัญให้ฝึกด้วยเช่นกัน",
        Mockup: UniversityMockup,
    },
    {
        badgeIcon: NotebookPen,
        badge: "มีแนวข้อสอบประจำภาคเรียนด้วย",
        headlineTop: "เตรียมสอบกลางภาค-ปลายภาค",
        headlineHighlight: "ก็มีให้ฝึกเช่นกัน",
        subtitle: "ครอบคลุมแนวข้อสอบรายวิชาระดับมหาวิทยาลัย เช่น วิชาบัญชี (เตรียมสอบ ม.ราม) และอีกหลายวิชา",
        Mockup: CourseworkMockup,
    },
    {
        badgeIcon: QrCode,
        badge: "ซื้อง่าย จ่ายง่าย แค่แสกน QR",
        headlineTop: "จ่ายเงินง่ายๆ",
        headlineHighlight: "แค่สแกน QR พร้อมเพย์",
        subtitle: "รองรับการชำระผ่านพร้อมเพย์ สแกนจ่ายได้ทันที ไม่ต้องกรอกบัตร",
        Mockup: QrPaymentMockup,
    },
];

// ข้อความหัวเรื่อง+รูปสลับคู่กันเสมอ (ไม่ใช่สลับแค่รูปแล้วข้อความตายตัว) เพราะแต่ละคู่สื่อจุดขาย
// คนละด้าน (เฉลยละเอียด / ใช้งานผ่านมือถือง่าย) — ใช้ CSS grid ซ้อนเลเยอร์ (แทน fixed height ที่เดาไว้ผิด)
// ให้ความสูง container ปรับตามตัวที่สูงสุดอัตโนมัติ กันข้อความ/รูปทับกันตอนความยาวไม่เท่ากัน
export default function Hero() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setIndex((i) => (i + 1) % VARIANTS.length), ROTATE_MS);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-32 left-1/2 h-96 w-2xl -translate-x-1/2 rounded-full bg-linear-to-b from-brand-100 to-transparent blur-3xl opacity-70" />
                <div className="absolute top-24 -right-24 h-72 w-72 rounded-full bg-brand-50 blur-3xl opacity-60" />
            </div>

            <div className="max-w-360 mx-auto px-4 sm:px-6 pt-16 pb-24 lg:pt-20 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                <div className="text-center lg:text-left">
                    <div className="grid">
                        {VARIANTS.map((v, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "col-start-1 row-start-1 transition-opacity duration-700",
                                    i === index ? "opacity-100" : "opacity-0 pointer-events-none"
                                )}
                            >
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-medium text-brand-700 mb-6">
                                    <v.badgeIcon size={14} />
                                    {v.badge}
                                </span>

                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
                                    {v.headlineTop}
                                    <br />
                                    <span className="bg-linear-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                                        {v.headlineHighlight}
                                    </span>
                                </h1>

                                <p className="mt-6 text-slate-500 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                    {v.subtitle}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                        <Link href="/products" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto">
                                ดูแนวข้อสอบทั้งหมด
                                <ArrowRight size={18} />
                            </Button>
                        </Link>
                        <Link href="/register" className="w-full sm:w-auto">
                            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                                สมัครสมาชิกฟรี
                            </Button>
                        </Link>
                    </div>
                </div>

                <div>
                    <div className="grid">
                        {VARIANTS.map((v, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "col-start-1 row-start-1 transition-opacity duration-700",
                                    i === index ? "opacity-100" : "opacity-0 pointer-events-none"
                                )}
                            >
                                <v.Mockup />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-center gap-1.5">
                        {VARIANTS.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setIndex(i)}
                                aria-label={`มุมมองที่ ${i + 1}`}
                                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-brand-500" : "w-1.5 bg-slate-200")}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
