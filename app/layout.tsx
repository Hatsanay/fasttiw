import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { Toaster } from "sonner";
import OnboardingGate from "@/app/components/OnboardingGate";
import ChatWidget from "@/app/components/ChatWidget";
import { getSession } from "@/lib/session";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ใช้ตัดสิน "login อยู่ไหม" แบบ optimistic (เหมือน proxy.ts) เพื่อส่งเป็น hint ให้ ChatWidget เท่านั้น —
  // ตัวตรวจสอบจริงเกิดที่ Route Handler /api/chat/* (อ่าน cookie httpOnly เอง) ไม่ใช่ค่านี้โดยตรง
  const session = await getSession();

  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className={`${kanit.className} min-h-full flex flex-col bg-white text-slate-900`}>
        <OnboardingGate>{children}</OnboardingGate>
        <ChatWidget isLoggedIn={!!session} />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
