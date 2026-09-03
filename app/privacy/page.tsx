import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Card from "@/components/ui/Card";

export const metadata = {
    title: "นโยบายความเป็นส่วนตัว",
    alternates: { canonical: "/privacy" },
};

// ร่างนโยบายความเป็นส่วนตัวเบื้องต้นตาม PDPA — เป็นฉบับร่างสำหรับใช้งานจริงชั่วคราวเท่านั้น
// ควรให้ทนายความตรวจสอบก่อนเผยแพร่ใช้งานจริง ตามที่ระบุไว้ใน CLAUDE.md ข้อ 8
export default function PrivacyPolicyPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
                <h1 className="text-2xl font-semibold text-slate-800 mb-2">นโยบายความเป็นส่วนตัว</h1>
                <p className="text-sm text-slate-400 mb-8">ปรับปรุงล่าสุด: {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</p>

                <Card className="p-6 sm:p-8 flex flex-col gap-6 text-sm text-slate-600 leading-relaxed">
                    <p className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
                        เอกสารนี้เป็นฉบับร่างเบื้องต้น ไม่ใช่คำแนะนำทางกฎหมาย จัดทำขึ้นเพื่อให้สอดคล้องกับหลักการทั่วไปของ
                        พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) เท่านั้น
                    </p>

                    <section>
                        <h2 className="font-medium text-slate-800 mb-2">1. ข้อมูลที่เราเก็บรวบรวม</h2>
                        <p>
                            เราเก็บข้อมูลที่จำเป็นต่อการให้บริการ ได้แก่ ชื่อ-นามสกุล ชื่อผู้ใช้ อีเมล เบอร์โทรศัพท์ (ถ้ามี)
                            รหัสผ่านที่เข้ารหัสแล้ว ประวัติการทำแนวข้อสอบและผลคะแนน ประวัติการสั่งซื้อ และข้อมูลอุปกรณ์/เซสชันที่ใช้เข้าสู่ระบบ
                        </p>
                    </section>

                    <section>
                        <h2 className="font-medium text-slate-800 mb-2">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
                        <p>
                            เพื่อให้บริการทำแนวข้อสอบ ประมวลผลคำสั่งซื้อและสิทธิ์การเข้าถึง ป้องกันการแชร์บัญชีร่วมกันเกินสิทธิ์
                            ปรับปรุงคุณภาพเนื้อหา และติดต่อกลับกรณีมีปัญหาการใช้งาน เราไม่นำข้อมูลไปขายหรือเปิดเผยให้บุคคลภายนอก
                            เพื่อวัตถุประสงค์ทางการตลาดโดยไม่ได้รับความยินยอม
                        </p>
                    </section>

                    <section>
                        <h2 className="font-medium text-slate-800 mb-2">3. ระยะเวลาการเก็บข้อมูล</h2>
                        <p>
                            เราเก็บข้อมูลไว้ตราบเท่าที่บัญชียังใช้งานอยู่ หรือตามระยะเวลาที่กฎหมายอื่นกำหนด (เช่น เอกสารทางบัญชี/ภาษี)
                        </p>
                    </section>

                    <section>
                        <h2 className="font-medium text-slate-800 mb-2">4. สิทธิ์ของเจ้าของข้อมูล</h2>
                        <p>
                            ท่านมีสิทธิ์ขอเข้าถึง แก้ไข หรือขอให้ลบข้อมูลส่วนบุคคลของท่านได้ โดยแก้ไขข้อมูลโปรไฟล์ได้เองที่หน้า
                            &ldquo;บัญชีของฉัน&rdquo; หรือส่งคำขอลบข้อมูลบัญชีได้จากหน้าเดียวกัน คำขอลบข้อมูลจะได้รับการตรวจสอบและ
                            ดำเนินการโดยผู้ดูแลระบบภายในระยะเวลาอันสมควร
                        </p>
                    </section>

                    <section>
                        <h2 className="font-medium text-slate-800 mb-2">5. ความปลอดภัยของข้อมูล</h2>
                        <p>
                            รหัสผ่านของท่านถูกเข้ารหัสก่อนจัดเก็บเสมอ เราไม่เก็บข้อมูลบัตรเครดิต/เดบิตของท่านไว้บนระบบของเรา
                            (การชำระเงินผ่านผู้ให้บริการที่ได้มาตรฐานความปลอดภัยแยกต่างหาก)
                        </p>
                    </section>

                    <section>
                        <h2 className="font-medium text-slate-800 mb-2">6. ติดต่อเรา</h2>
                        <p>หากมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ หรือต้องการใช้สิทธิ์ตามข้อ 4 กรุณาติดต่อผ่านช่องทางที่ระบุไว้บนเว็บไซต์</p>
                    </section>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
