import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { safeNextPath } from "@/lib/safeNext";
import { GOOGLE_SIGNUP_COOKIE } from "@/lib/googleOAuth";
import GoogleSignupForm from "./GoogleSignupForm";

export const metadata = { title: "สร้างบัญชีด้วย Google", robots: { index: false } };

// อ่านชื่อ/อีเมลจาก signup_token ไว้แสดงบนหน้าเท่านั้น — ไม่ verify ลายเซ็นตรงนี้ (secret อยู่ที่ backend)
// ตอนกดสร้างบัญชี backend จะ verify เองอีกที ค่าที่แสดงจึงแก้ปลอมได้แค่บนจอตัวเอง ไม่มีผลกับบัญชีที่ถูกสร้าง
function readSignupProfile(token: string | undefined) {
    if (!token) return null;
    try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
        if (!payload?.email || (payload.exp && payload.exp * 1000 < Date.now())) return null;
        const name = [payload.given_name, payload.family_name].filter(Boolean).join(" ") || payload.name || "";
        return { email: String(payload.email), name: String(name) };
    } catch {
        return null;
    }
}

export default async function GoogleSignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
    const next = safeNextPath((await searchParams).next);
    const profile = readSignupProfile((await cookies()).get(GOOGLE_SIGNUP_COOKIE)?.value);
    if (!profile) redirect(`/login?error=google_expired&next=${encodeURIComponent(next)}`);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <Card className="w-full max-w-sm p-6 sm:p-8">
                    <h1 className="text-xl font-semibold text-slate-900 mb-1 text-center">สร้างบัญชีด้วย Google</h1>
                    <p className="mb-6 text-center text-sm text-slate-400">อีกขั้นเดียวก็เริ่มทำข้อสอบได้</p>
                    <GoogleSignupForm next={next} email={profile.email} name={profile.name} />
                </Card>
            </main>
            <Footer />
        </div>
    );
}
