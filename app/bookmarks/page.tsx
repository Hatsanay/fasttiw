import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { authorizedFetch } from "@/lib/session";
import BookmarksList, { type BookmarkedQuestion } from "./BookmarksList";

export const metadata = { title: "ข้อที่บันทึกไว้ทบทวน" };

export default async function BookmarksPage() {
    const res = await authorizedFetch("/store/bookmarks");
    const { data: bookmarks }: { data: BookmarkedQuestion[] } = res.ok ? await res.json() : { data: [] };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-8">ข้อที่บันทึกไว้ทบทวน</h1>
                <BookmarksList initialBookmarks={bookmarks} />
            </main>
            <Footer />
        </div>
    );
}
