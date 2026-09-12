import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { safeNextPath } from "@/lib/safeNext";
import { GOOGLE_ERROR_MESSAGES } from "@/lib/googleOAuth";
import LoginForm from "./LoginForm";

export const metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string; error?: string }>;
}) {
    const { next, error } = await searchParams;
    const safeNext = safeNextPath(next);
    // แสดงเฉพาะรหัสที่รู้จักเท่านั้น ไม่เอาข้อความจาก URL มาแสดงตรงๆ (ดู GOOGLE_ERROR_MESSAGES)
    const errorMessage = error ? GOOGLE_ERROR_MESSAGES[error] : undefined;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <Card className="w-full max-w-sm p-6 sm:p-8">
                    <h1 className="text-xl font-semibold text-slate-900 mb-6 text-center">เข้าสู่ระบบ</h1>
                    {errorMessage && (
                        <p
                            role="alert"
                            className={
                                error === "google_cancelled"
                                    ? "mb-5 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600"
                                    : "mb-5 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600"
                            }
                        >
                            {errorMessage}
                        </p>
                    )}
                    <GoogleSignInButton next={safeNext} />
                    <LoginForm next={safeNext} />
                </Card>
            </main>
            <Footer />
        </div>
    );
}
