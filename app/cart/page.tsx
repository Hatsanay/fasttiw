import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getSession } from "@/lib/session";
import CartClient from "./CartClient";

export const metadata = { title: "ตะกร้าของฉัน" };

export default async function CartPage() {
    const session = await getSession();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
                <CartClient isLoggedIn={!!session} />
            </main>
            <Footer />
        </div>
    );
}
