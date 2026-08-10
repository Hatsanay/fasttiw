import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// กันหน้าที่ต้อง login และไม่มีเนื้อหาสาธารณะให้ index (crawler ที่ไม่ได้ล็อกอินจะเจอแค่หน้า redirect
// ไปล็อกอินเปล่าๆ) ไม่ให้เสีย crawl budget และไม่ให้หลุดไปโผล่ในผลค้นหาโดยไม่ตั้งใจ
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/account", "/cart", "/orders/", "/exam/", "/history", "/bookmarks", "/library", "/api/"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
