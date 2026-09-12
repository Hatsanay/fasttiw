"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ตัวนับผู้เยี่ยมชม — ส่งสัญญาณทุกครั้งที่เปลี่ยนหน้า + สัญญาณ "ยังเปิดอยู่" ทุก 1 นาทีขณะแท็บแสดงบนจอ
// ไม่ใช้ cookie / localStorage ใดๆ (ตัดสินใจร่วมกับผู้ใช้ — ไม่ต้องมีแถบขอความยินยอม cookie ตาม PDPA)
// การระบุ "คน" ทำฝั่ง backend ทั้งหมด ดู backend/src/utils/visitTracking.js

const PING_INTERVAL_MS = 60 * 1000;

// ระดับ module (ไม่ใช่ state) — อยู่รอดข้ามการเปลี่ยนหน้าแบบ client-side แต่รีเซ็ตเมื่อโหลดหน้าใหม่ทั้งหน้า
// ซึ่งตรงกับความหมายของ "หน้าแรกที่เข้ามา" พอดี
let entrySent = false;
let lastView = { path: "", at: 0 };

function send(data: Record<string, unknown>) {
    const body = JSON.stringify(data);
    try {
        // sendBeacon ส่งได้แม้กำลังปิดแท็บ/เปลี่ยนหน้า และไม่ถ่วงการโหลดหน้า
        if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
    } catch {
        // บางเบราว์เซอร์ในแอปปิด sendBeacon — ตกไปใช้ fetch แทน
    }
    fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

export default function VisitTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;
        // กันนับซ้ำ — React โหมด dev รัน effect สองรอบ และบางหน้าเปลี่ยน URL ซ้ำที่เดิมตอน redirect
        const now = Date.now();
        if (lastView.path === pathname && now - lastView.at < 1500) return;
        lastView = { path: pathname, at: now };

        if (!entrySent) {
            entrySent = true;
            const params = new URLSearchParams(window.location.search);
            send({
                kind: "view",
                path: pathname, // usePathname ไม่มี query string อยู่แล้ว (backend ตัดซ้ำอีกชั้น)
                entry: true,
                // ส่งแค่ referrer ของหน้าแรก — การเปลี่ยนหน้าในเว็บเราไม่ใช่ "แหล่งที่มา"
                referrer: document.referrer,
                utm_source: params.get("utm_source") ?? "",
                fbclid: params.has("fbclid"),
            });
            return;
        }
        send({ kind: "view", path: pathname });
    }, [pathname]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            // แท็บที่ถูกซ่อน (สลับไปแอปอื่น/แท็บอื่น) ไม่นับว่ากำลังใช้งาน
            if (document.visibilityState === "visible") send({ kind: "ping" });
        }, PING_INTERVAL_MS);
        return () => window.clearInterval(timer);
    }, []);

    return null;
}
