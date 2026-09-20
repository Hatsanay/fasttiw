// user-agent เต็มๆ อ่านไม่รู้เรื่องสำหรับลูกค้า — ตัดเหลือเท่าที่ดูออกว่า "เครื่องไหน"
// (ตรงกับ deviceKey() ฝั่ง backend ที่ใช้จับกลุ่มอุปกรณ์ และ deviceLabel() ของหน้าแอดมิน)
export function deviceLabel(ua: string | null | undefined): string {
    if (!ua) return "ไม่ทราบอุปกรณ์";
    const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox"
        : /Safari\//.test(ua) ? "Safari" : "เบราว์เซอร์อื่น";
    const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
        : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
    return [browser, os].filter(Boolean).join(" · ");
}

// วันเวลาแบบไทย ตรึง timeZone ไว้ที่กรุงเทพฯ เสมอ — เซิร์ฟเวอร์อาจเป็น UTC แล้วเวลาที่ลูกค้าเห็นเพี้ยน 7 ชม.
export function thaiDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    return new Date(value).toLocaleString("th-TH", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
    });
}
