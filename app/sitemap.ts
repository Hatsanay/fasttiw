import type { MetadataRoute } from "next";
import { getPublicProducts } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

// ดึงรายการ product จริงจาก backend มาสร้าง sitemap — ไม่ hardcode รายการหน้าเอง เพราะจำนวนชุดข้อสอบ
// เพิ่มเรื่อยๆ ตามที่แอดมิน publish ใหม่ ต้อง sync กับข้อมูลจริงเสมอไม่ให้ sitemap ตกยุค — limit สูงพอที่จะ
// ได้ทุกชุดในคราวเดียว (ธุรกิจนี้ยังไม่ถึงหลักพันชุดข้อสอบ ไม่ต้องแบ่งหน้า) ไม่ดึง package เพราะ /packages
// เป็นหน้ารายการเดียว ยังไม่มีหน้ารายละเอียดแยกต่อแพ็กเกจให้ใส่ใน sitemap
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { data: products } = await getPublicProducts({ limit: 1000 });

    // lastModified: Google ใช้ตัดสินใจว่าควรกลับมา crawl ซ้ำเมื่อไหร่ — ใช้เวลาที่ sitemap ถูก generate
    // (ISR revalidate ทุก 60 วิ ดู getPublicProducts) เพราะเนื้อหาหน้าเหล่านี้ผูกกับรายการสินค้าที่เปลี่ยน
    // ได้ตลอด ไม่มี timestamp รายหน้าให้ใช้ตรงๆ — ดีกว่าไม่ส่งค่าอะไรเลยแบบเดิม
    const lastModified = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: SITE_URL, lastModified, changeFrequency: "daily", priority: 1 },
        { url: `${SITE_URL}/products`, lastModified, changeFrequency: "daily", priority: 0.9 },
        { url: `${SITE_URL}/packages`, lastModified, changeFrequency: "weekly", priority: 0.8 },
        { url: `${SITE_URL}/news`, lastModified, changeFrequency: "weekly", priority: 0.5 },
        { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    ];

    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
        url: `${SITE_URL}/products/${p.prod_id}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    // หน้าตัวอย่างฟรีเป็นเนื้อหาสาธารณะจริง (ไม่ต้อง login) มีคุณค่าให้ index เหมือนกัน — ช่วยดึงคนค้นหา
    // มาเจอตัวอย่างจริงก่อนตัดสินใจซื้อ
    const samplePages: MetadataRoute.Sitemap = products.map((p) => ({
        url: `${SITE_URL}/products/${p.prod_id}/sample`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.5,
    }));

    return [...staticPages, ...productPages, ...samplePages];
}
