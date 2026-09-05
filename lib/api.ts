export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003/api/V1";

export type Product = {
    prod_id: string;
    prod_name: string;
    prod_price: string;
    prod_compare_price: string | null;
    prod_is_free: boolean;
    prod_cover_url: string | null;
    prod_category_id: string | null;
    prod_category_name: string | null;
    question_count: number;
};

export type ProductDetail = Product & {
    prod_description: string | null;
    prod_exam_duration_minutes: number;
};

export async function getPublicProducts(
    params: { search?: string; category_id?: string; limit?: number; is_free?: boolean } = {}
): Promise<{ data: Product[]; total: number }> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.category_id) query.set("category_id", params.category_id);
    if (params.is_free) query.set("is_free", "true");
    query.set("limit", String(params.limit ?? 24));

    const res = await fetch(`${API_URL}/store/products?${query}`, { next: { revalidate: 60 } });
    if (!res.ok) return { data: [], total: 0 };
    return res.json();
}

export async function getPublicProduct(id: string): Promise<ProductDetail | null> {
    const res = await fetch(`${API_URL}/store/products/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
}

export type SampleQuestion = {
    ques_id: string;
    ques_text: string;
    ques_image_url: string | null;
    ques_score: string | number | null;
    choices: { cho_id: string; cho_text: string; cho_image_url: string | null }[];
    selected_choice_id: string | null;
    reveal: {
        correct_choice_id: string;
        explanation: string | null;
        choice_reasons: { cho_id: string; is_correct: boolean; wrong_reason: string | null }[];
    };
};

// prod_total_score เป็น null = ชุดนี้ไม่ใช้ระบบคะแนน (หน้าตัวอย่างจะไม่แสดงคะแนนเลย)
export async function getSampleQuestions(id: string): Promise<{ questions: SampleQuestion[]; totalScore: string | number | null }> {
    const res = await fetch(`${API_URL}/store/products/${id}/sample-questions`, { next: { revalidate: 60 } });
    if (!res.ok) return { questions: [], totalScore: null };
    const { data, prod_total_score } = await res.json();
    return { questions: data, totalScore: prod_total_score ?? null };
}

export type StorePackage = {
    pkg_id: string;
    pkg_name: string;
    pkg_description: string | null;
    pkg_price: string;
    pkg_cover_url: string | null;
    individual_total: number;
    savings: number;
    products: { prod_id: string; prod_name: string; prod_price: string; prod_is_free: boolean; prod_cover_url: string | null }[];
};

export async function getPublicPackages(): Promise<StorePackage[]> {
    const res = await fetch(`${API_URL}/store/packages`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data;
}

export async function getPopularProducts(): Promise<Product[]> {
    const res = await fetch(`${API_URL}/store/products/popular?limit=12`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data;
}

export type StoreCategory = { cat_id: string; cat_name: string };

export async function getPublicCategories(): Promise<StoreCategory[]> {
    const res = await fetch(`${API_URL}/store/categories`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data;
}

export function productCoverUrl(path: string | null): string | null {
    if (!path) return null;
    return `${new URL(API_URL).origin}${path}`;
}

// ─── ข่าวสาร/ประกาศ — ฟีดเดียว (ไม่มี "โพสต์" แยกกัน) ประกอบด้วย widget หลายชิ้นเรียงลำดับกันเหมือน
// landing page หนึ่งหน้า (แอดมินลาก-วางจัดหน้าไว้) ─────────────────────────────────────────────
// item_id/item_order มีเฉพาะ item ระดับบนสุด (แถวจริงใน tb_news_block_items) — item ที่ซ้อนอยู่ในช่องของ
// widget "สร้างเอง" ไม่มีแถว DB ของตัวเอง (อยู่ใน JSON เดียวกับ cell) จึงมีแค่ key แทน ไม่มีทั้งสองอย่างนี้
export type NewsBlockItem = {
    item_id?: string;
    key?: string;
    item_order?: number;
    item_image_url: string | null;
    item_title: string | null;
    item_text: string | null;
    item_link_url: string | null;
    item_link_label: string | null;
};
// ช่อง 1 ช่องในกริดของ widget "สร้างเอง" (blk_type "custom") — เนื้อหาเหมือน NewsBlock ทุกอย่าง บวกตำแหน่ง/
// ขนาดบนกริด 12 คอลัมน์ที่แอดมินจัดวางไว้ในหน้าออกแบบ widget
export type NewsCustomCell = {
    key: string;
    blk_type: "text" | "image" | "heading" | "button" | "post" | "card" | "card_set" | "carousel" | "youtube";
    x: number; y: number; w: number; h: number;
    blk_title: string | null;
    blk_text: string | null;
    blk_image_url: string | null;
    blk_link_url: string | null;
    blk_link_label: string | null;
    blk_items_per_view: number;
    items: NewsBlockItem[];
};
export type NewsBlock = {
    blk_id: string;
    blk_type: "text" | "image" | "heading" | "button" | "post" | "card" | "card_set" | "carousel" | "custom" | "youtube";
    blk_order: number;
    blk_title: string | null;
    blk_text: string | null;
    blk_image_url: string | null;
    blk_link_url: string | null;
    blk_link_label: string | null;
    blk_items_per_view: number;
    blk_custom_structure: NewsCustomCell[] | null;
    blk_updated_at: string;
    items: NewsBlockItem[];
};

export function newsImageUrl(path: string | null): string | null {
    if (!path) return null;
    return `${new URL(API_URL).origin}${path}`;
}

// แตก YouTube URL ทุกรูปแบบที่คนก็อปมาปกติ (watch?v=, youtu.be/, embed/, shorts/ รวมถึงมี query string ต่อท้าย
// เช่น &t=30s) ให้เหลือแค่ video ID ไว้สร้าง iframe embed src — คืน null ถ้า parse ไม่ได้
export function extractYoutubeId(url: string | null): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    return match ? match[1] : null;
}

export async function getPublicNewsFeed(): Promise<NewsBlock[]> {
    const res = await fetch(`${API_URL}/store/news`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.blocks ?? [];
}

// widget ที่แอดมินติ๊ก "เผยแพร่ใน landing page" ไว้เท่านั้น — เป็นอิสระจากสถานะเผยแพร่ของ getPublicNewsFeed
// โดยตั้งใจ (widget ที่ยังร่างอยู่ในฟีดเต็มก็ขึ้นหน้าแรกได้ถ้าติ๊กไว้ ไม่ใช่เซตย่อยเสมอไป) ใช้เป็น teaser
// สั้นๆ ที่หน้าแรก ก่อนลิงก์ไปหน้า /news เต็ม
export async function getLandingNewsBlocks(): Promise<NewsBlock[]> {
    const res = await fetch(`${API_URL}/store/news/landing`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.blocks ?? [];
}

// บังคับทศนิยม 2 ตำแหน่งเสมอ (ไม่ใช้ toLocaleString เปล่าๆ เพราะ default ของ JS โชว์ 0-3 ตำแหน่งตามค่าจริง
// เช่น 599.5 จะโชว์แค่ ".5" ดูเหมือนราคาพิมพ์ตก — สำคัญเป็นพิเศษเพราะเป็นเว็บที่ลูกค้าจริงจ่ายเงินจริง)
export function formatBaht(price: string | number): string {
    const n = Number(price) || 0;
    return `${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}

// ราคาที่ต้องโชว์/รวมยอดฝั่ง client (การ์ดสินค้า, ตะกร้า) — เวอร์ชัน frontend ของ getEffectivePrice()
// ฝั่ง backend (backend/src/utils/pricing.js) ห้ามเขียน ternary ซ้ำเองในแต่ละไฟล์ที่โชว์ราคา เพราะ backend
// เป็นคนตัดสินราคาจริงที่เก็บเงินอยู่ดี ฝั่งนี้แค่ต้องโชว์ตรงกับสิ่งที่จะเกิดขึ้นจริงตอน checkout
export function effectivePrice(item: { prod_price: string | number; prod_is_free: boolean }): number {
    return item.prod_is_free ? 0 : Number(item.prod_price) || 0;
}

// ราคาปกติที่ควรโชว์ขีดฆ่าคู่กับราคาขายจริง (สร้างความรู้สึกว่ากำลังลดราคา) — คืน null ถ้าไม่ควรโชว์
// (product แจกฟรีใช้ prod_price เป็น "ราคาปกติ" ของตัวเองอยู่แล้วผ่าน field เดิม ไม่เกี่ยวกับ compare price นี้
// และถ้า compare price ตั้งไว้ต่ำกว่าหรือเท่ากับราคาขายจริง แสดงว่าไม่ใช่ส่วนลด ไม่ควรโชว์ขีดฆ่า)
export function compareAtPrice(item: { prod_price: string | number; prod_compare_price: string | number | null; prod_is_free: boolean }): number | null {
    if (item.prod_is_free || item.prod_compare_price == null) return null;
    const compare = Number(item.prod_compare_price) || 0;
    return compare > effectivePrice(item) ? compare : null;
}
