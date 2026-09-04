import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
    title: "ตั้งรหัสผ่านใหม่",
    // หน้านี้มี token อยู่ใน URL ห้ามให้ search engine เก็บ index เด็ดขาด
    robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <Card className="w-full max-w-sm p-6 sm:p-8">
                    <h1 className="text-xl font-semibold text-slate-900 mb-1 text-center">ตั้งรหัสผ่านใหม่</h1>

                    {token ? (
                        <>
                            <p className="text-sm text-slate-500 mb-6 text-center">ตั้งรหัสผ่านใหม่ที่จะใช้เข้าสู่ระบบครั้งต่อไป</p>
                            <ResetPasswordForm token={token} />
                        </>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm text-slate-600 my-6">
                                ลิงก์ไม่ถูกต้องหรือไม่สมบูรณ์ กรุณาขอลิงก์ตั้งรหัสผ่านใหม่อีกครั้ง
                            </p>
                            <Link href="/forgot-password" className="font-medium text-sm text-brand-600 hover:text-brand-700">
                                ขอลิงก์ใหม่
                            </Link>
                        </div>
                    )}
                </Card>
            </main>
            <Footer />
        </div>
    );
}
