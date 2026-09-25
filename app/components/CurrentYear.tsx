import { cacheLife } from "next/cache";

// ปี ค.ศ. ปัจจุบันใน footer (2026-09-24) — Footer อยู่ในหน้าสำเร็จรูปที่สร้างล่วงหน้า ซึ่งห้ามเรียก new Date()
// ตรงๆ (ค่าจะถูกแช่ไว้ตามวันที่ build) จึงครอบ `use cache` อายุเป็นวัน: หลังขึ้นปีใหม่ไม่เกินหนึ่งวันตัวเลขเปลี่ยนเอง
// ไม่ต้อง build ใหม่ และไม่ต้องส่ง JavaScript ไปที่เบราว์เซอร์เพื่อแสดงตัวเลขตัวเดียว
export default async function CurrentYear() {
    "use cache";
    cacheLife("days");
    return <>{new Date().getFullYear()}</>;
}
