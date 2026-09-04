import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = { title: "ลืมรหัสผ่าน" };

export default function ForgotPasswordPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <Card className="w-full max-w-sm p-6 sm:p-8">
                    <h1 className="text-xl font-semibold text-slate-900 mb-1 text-center">ลืมรหัสผ่าน</h1>
                    <p className="text-sm text-slate-500 mb-6 text-center">
                        กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้
                    </p>

                    <ForgotPasswordForm />

                    <p className="text-center text-sm text-slate-500 mt-5">
                        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
                            กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </p>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
