import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Kanit } from "next/font/google";
import { Toaster } from "sonner";
import OnboardingGate from "@/app/components/OnboardingGate";
import ChatWidgetForSession from "@/app/components/ChatWidgetForSession";
import VisitTracker from "@/app/components/VisitTracker";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
// สไตล์ของ KaTeX ไม่ได้โหลดที่นี่แล้ว — ย้ายไปอยู่กับตัวเรนเดอร์สูตร (lib/math.tsx, lib/mathClient.tsx)
// เดิมทุกหน้ารวมหน้าแรกต้องโหลด CSS ก้อนนี้ก่อนแสดงผลได้ ทั้งที่มีแค่หน้าข้อสอบที่อาจมีสูตร

const kanit = Kanit({
  subsets: ["thai", "latin"],
  // ใช้จริงแค่ 3 น้ำหนัก (ข้อความปกติ / font-medium / font-semibold) — เดิมโหลด 5 น้ำหนัก × 2 ชุดอักษร = ไฟล์ฟอนต์
  // 10 ไฟล์ที่ทุกหน้าต้องโหลดก่อน (300 ไม่มีที่ใช้เลย, 700 มี 3 จุดซึ่งเปลี่ยนเป็น semibold ให้เหมือนหัวข้ออื่นทั้งเว็บ)
  // ⚠ ถ้าจะใช้ font-bold / font-light ที่ไหนต้องเพิ่มน้ำหนักกลับที่นี่ ไม่งั้นเบราว์เซอร์ใช้น้ำหนักใกล้เคียงแทน
  weight: ["400", "500", "600"],
  variable: "--font-kanit",
});

const SITE_NAME = "Fasttiw";
const DEFAULT_TITLE = "Fasttiw — แนวข้อสอบพร้อมเฉลยละเอียด";
const DEFAULT_DESCRIPTION = "ทำแนวข้อสอบออนไลน์พร้อมเฉลยละเอียดทีละขั้นตอน เตรียมสอบได้จริง ไม่ใช่แค่ PDF";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Fasttiw",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

// สีแถบ browser UI บนมือถือ (Chrome Android/Safari iOS) — ใช้น้ำเงินแบรนด์ตามที่ brand kit ล็อกไว้
// ต้องอยู่ใน export ชื่อ `viewport` ไม่ใช่ metadata — Next ย้าย themeColor ออกจาก metadata ไปอยู่ viewport แล้ว
export const viewport: Viewport = {
  themeColor: "#2B5CE6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ⚠ ห้าม await อะไรที่อ่าน cookie ที่ระดับบนสุดของ layout นี้ (เช่น getSession()) — เดิมทำแบบนั้นแล้ว
  // **ทุกหน้าในเว็บกลายเป็นหน้าที่ต้องเรนเดอร์ใหม่ทุกครั้งที่มีคนเข้า** รวมถึงหน้าแรกและ /privacy ที่เป็นข้อความล้วน
  // (2026-09-24 วัดจริงบน production: หน้าแรกรอเซิร์ฟเวอร์ 1.4-2.3 วินาทีทุกครั้งที่ worker ตื่นใหม่)
  // ส่วนที่ต้องรู้ว่าใคร login อยู่ ให้แยกเป็น component ของตัวเองแล้วครอบ <Suspense> แบบข้างล่าง
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className={`${kanit.className} min-h-full flex flex-col bg-white text-slate-900`}>
        {children}
        {/* modal บังคับตั้งรหัส/กรอกข้อมูล สำหรับบัญชีที่แอดมินสร้างให้ — ไหลตามมาทีหลังโดยไม่บล็อกหน้า */}
        <Suspense fallback={null}>
          <OnboardingGate />
        </Suspense>
        <Suspense fallback={null}>
          <ChatWidgetForSession />
        </Suspense>
        <Toaster position="top-right" richColors />
        {/* นับผู้เยี่ยมชมแบบไม่ใช้ cookie — ดู app/components/VisitTracker.tsx
            อ่าน URL ปัจจุบัน (usePathname) ซึ่งรู้ได้ตอนมีคนเข้าจริงเท่านั้น จึงต้องอยู่ใน Suspense ไม่งั้นทั้งหน้าสร้างล่วงหน้าไม่ได้ */}
        <Suspense fallback={null}>
          <VisitTracker />
        </Suspense>
      </body>
    </html>
  );
}
