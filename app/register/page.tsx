import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>;
}) {
    const { next } = await searchParams;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <Card className="w-full max-w-sm p-6 sm:p-8">
                    <h1 className="text-xl font-semibold text-slate-900 mb-6 text-center">สมัครสมาชิก</h1>
                    <RegisterForm next={next?.startsWith("/") ? next : "/library"} />
                </Card>
            </main>
            <Footer />
        </div>
    );
}
