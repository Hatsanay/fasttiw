import { notFound } from "next/navigation";
import { KeyRound, UserRound, Laptop, ShieldAlert } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import { authorizedFetch } from "@/lib/session";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import AvatarUpload from "./AvatarUpload";
import SessionList from "./SessionList";
import DeletionRequestButton from "./DeletionRequestButton";

export const metadata = { title: "บัญชีของฉัน" };

export default async function AccountPage() {
    const [res, sessionsRes] = await Promise.all([
        authorizedFetch("/store/me"),
        authorizedFetch("/store/me/sessions"),
    ]);
    if (!res.ok) notFound();
    const profile = await res.json();
    const { data: sessions } = sessionsRes.ok ? await sessionsRes.json() : { data: [] };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-8">บัญชีของฉัน</h1>

                <div className="flex flex-col gap-6">
                    <Card className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                <UserRound size={16} />
                            </span>
                            <h2 className="font-medium text-slate-800">ข้อมูลส่วนตัว</h2>
                        </div>
                        <AvatarUpload avatarUrl={profile.cus_avatar_url} />
                        <div className="my-5 border-t border-slate-100" />
                        <ProfileForm profile={profile} />
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                <KeyRound size={16} />
                            </span>
                            <h2 className="font-medium text-slate-800">เปลี่ยนรหัสผ่าน</h2>
                        </div>
                        <PasswordForm />
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                <Laptop size={16} />
                            </span>
                            <h2 className="font-medium text-slate-800">อุปกรณ์ที่ล็อกอินอยู่</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">เข้าสู่ระบบพร้อมกันได้สูงสุด 2 เครื่อง เข้าเครื่องใหม่เกินโควตาจะเตะเครื่องเก่าสุดออกอัตโนมัติ</p>
                        <SessionList sessions={sessions} />
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                                <ShieldAlert size={16} />
                            </span>
                            <h2 className="font-medium text-slate-800">ความเป็นส่วนตัว</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            ต้องการให้เราลบข้อมูลบัญชีของคุณ? ทีมงานจะตรวจสอบและดำเนินการภายในระยะเวลาอันสมควรตามสิทธิ์ PDPA
                        </p>
                        <DeletionRequestButton />
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
