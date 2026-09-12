@AGENTS.md

# tiwwai-store — เว็บฝั่งลูกค้า (storefront + ทำข้อสอบ)

โปรเจกต์นี้แยกจาก `frontend` (แอดมิน) แต่ใช้ backend Express เดียวกัน (`localhost:3003`) — อยู่ใน repo เดียวกันเป็น sibling ของ `backend`/`frontend`/`database` แต่เป็นคนละ Next.js project ที่ deploy แยกจากกันได้อิสระ — ดูรายละเอียดธุรกิจ/ขอบเขต MVP เต็มๆ ที่ `../CLAUDE.md`

## สถานะ

**เสร็จแล้ว** (MVP phase 1-6 + phase 2 เกือบครบทั้งหมดตาม `../CLAUDE.md`):
- landing page (`Hero.tsx` สลับ 11 มุมมองข้อความ+รูปคู่กันอัตโนมัติ), แคตตาล็อกสินค้า (`/products`), หน้ารายละเอียดสินค้า (`/products/[id]` + ลิงก์ตัวอย่างฟรี), ตะกร้าสินค้าฝั่ง client (`/cart`, localStorage)
- สมัคร/เข้าสู่ระบบ (`/register`, `/login`) + onboarding บังคับเปลี่ยนรหัส/เติมข้อมูล+รูปโปรไฟล์+ยอมรับนโยบายความเป็นส่วนตัว (`OnboardingGate`/`OnboardingModal`)
- **ยืนยันอีเมลด้วย OTP ตอนสมัคร** (2026-09-04): หน้า `/register` เป็น 2 ขั้น — กรอกข้อมูล → กรอกรหัส 6 หลักที่ส่งไปทางอีเมล (มีปุ่มส่งใหม่พร้อมนับถอยหลัง 60 วิ) บัญชีถูกสร้างก็ต่อเมื่อกรอกรหัสถูก ดูกติกาเต็มที่ `../CLAUDE.md` ข้อ 6.4
- เช็คเอาท์จริง (`/cart` หรือ `/packages` → checkout → `/orders/[id]` ใบเสร็จ) พร้อมชำระเงินจริงผ่าน **Stripe PromptPay** (ย้ายมาจาก Omise ระหว่างทำโปรเจกต์ — ดู `../CLAUDE.md` ข้อ 6) — สร้าง QR ให้สแกนตอน checkout เลย, หน้า order poll สถานะเองทุก 4 วิ (`OrderStatusPoller.tsx` + Route Handler แรกของโปรเจกต์ `app/api/orders/[id]/status/route.ts`) จนกว่า webhook จะยืนยัน, แสดงสถานะ pending/paid/cancelled ชัดเจน, ยกเลิกคำสั่งซื้อที่ยังไม่จ่ายได้เอง (`CancelOrderButton.tsx` ที่หน้า order เดียวกัน)
- **ทำข้อสอบจริง**: `/library` → `/exam/[productId]` (เลือกโหมด) → `/exam/attempts/[id]` (ทำทีละข้อ, autosave, timer, auto-submit) → `/exam/attempts/[id]/review` (สรุปผล + เฉลยครบ 4 อย่าง + bookmark + แจ้งปัญหาข้อนี้) — รองรับรูปภาพประกอบโจทย์ทุกจุด (`QuestionImage.tsx`) และรูปภาพต่อตัวเลือก (`ChoiceImage.tsx`, ใช้ใน exam runner/review/bookmarks/sample ทุกจุด)
- **ระบบคะแนน** (2026-09-05): ชุดข้อสอบที่แอดมินตั้ง "คะแนนเต็ม" ไว้จะแสดงคะแนนรายข้อ + คะแนนเต็มทุกจุด (หน้าทำข้อสอบ, หน้าเฉลย `60 / 100`, `/history`, ตัวอย่างฟรี, PDF) ส่วนชุดที่ไม่ได้ตั้งไว้จะซ่อนเรื่องคะแนนทั้งหมด แสดงเป็น % จากจำนวนข้อเหมือนเดิมเป๊ะ — เช็คด้วย `hasScoring()` จาก `lib/scoring.ts` ทุกจุด และต้องยึด `att_max_score` ที่ freeze ไว้ตอนเริ่มทำ **ห้ามอ่านคะแนนเต็มปัจจุบันของชุดข้อสอบ** เพราะแอดมินเปลี่ยนทีหลังได้ (กติกาเต็มที่ `../CLAUDE.md` ข้อ 5.1)
- **ประวัติ/bookmark/บัญชี**: `/history` (สรุปภาพรวม + สรุปรายชุด + จุดอ่อนรายหมวดของแต่ละชุด), `/bookmarks` (+ แจ้งปัญหาข้อนี้), `/account` (โปรไฟล์/รหัสผ่าน/รูป/อุปกรณ์ที่ล็อกอิน/ขอลบข้อมูลบัญชี)
- **สรุปผลท้ายการสอบ** (2026-09-06): หน้า `/exam/attempts/[id]/review` มีบล็อกสรุปคั่นระหว่างคะแนนรวมกับข้อ 1 — ตอบถูก/ตอบผิด/ไม่ได้ตอบ, เวลาที่ใช้, เทียบกับ**ครั้งก่อน**ของชุดเดียวกัน (`prev_score`, ไม่ใช่เทียบกับครั้งที่ดีที่สุด เพราะสิ่งที่อยากรู้ทันทีคือรอบนี้พัฒนาขึ้นไหม), ผลรายหมวดเรียงหมวดที่อ่อนสุดขึ้นก่อน และการ์ดกดไป `/history/mistakes?product_id=...`
  - **ลำดับ**: หัวหน้า (ชื่อชุด + คะแนน) → สรุปถูก/ผิด/ไม่ตอบ → `ตอบถูก X จาก Y ข้อ` + เวลา + เทียบครั้งก่อน → ผลรายหมวด → การ์ดไปหน้าทบทวน → **ข้อ 1** → ... → ปุ่มทำอีกครั้ง/กลับคลังข้อสอบ (ระหว่างทางเคยย้ายทั้งบล็อกไปไว้ท้ายหน้าตามที่ผู้ใช้สั่ง แล้วผู้ใช้สั่งย้ายกลับขึ้นบนก่อนข้อ 1 — ตำแหน่งปัจจุบันคืออันที่ถูก)
  - `ตอบถูก X จาก Y ข้อ` อยู่ในแถวข้อมูลใต้การ์ด **ไม่ใช่ในหัวหน้า** — เดิมอยู่ทั้งสองที่ อ่านเจอเรื่องเดียวกันซ้ำสองรอบติดกัน
  - `mistake_count` ที่การ์ดโชว์เป็นของ**ทั้งชุด รวมทุกครั้งที่ทำ** ไม่ใช่เฉพาะใบนี้ (ข้อความบนการ์ดบอกไว้ชัด) และคิดจาก `countUnresolvedMistakes()` ตัวเดียวกับหน้า `/history` — ทดสอบแล้วว่าเลขตรงกับจำนวนการ์ดที่กดเข้าไปเห็นจริงทุกใบ
  - **ตอบผิด/ไม่ได้ตอบ นับจาก `questions` ตรงๆ ห้ามลบออกจาก `att_total_questions`** — ถ้าแอดมินปิดคำถามบางข้อหลังลูกค้าทำไปแล้ว ข้อนั้นจะหายจาก `questions` แต่ `att_total_questions` ที่ freeze ไว้ยังนับรวม การลบจะทำให้ข้อที่ถูกปิดโผล่เป็น "ตอบผิด" ทั้งที่ลูกค้าอาจตอบถูก
- **แสดงตัวเลขดิบคู่กับ % ทุกจุด** (2026-09-06): เดิมหลายที่บอกแค่ `40%` ซึ่งไม่พอสำหรับคนซ้อมข้อสอบ (ผิด 3 จาก 5 กับผิด 30 จาก 50 คนละสถานการณ์ทั้งที่ % เท่ากัน) — ตอนนี้ทุก % มีตัวเลขดิบกำกับ ผ่าน `formatRawScore()` ใน `lib/scoring.ts` ที่เดียว: ชุดที่ใช้ระบบคะแนนโชว์ `X/Y คะแนน` ชุดที่ไม่ใช้โชว์ `ถูก X/Y ข้อ`
  - จุดที่แก้: การ์ดสรุปภาพรวม `/history` (ยอดรวมสะสม + ครั้งล่าสุด), การ์ดรายชุด (ดีที่สุด/ล่าสุด/เฉลี่ย), แถวประวัติรายครั้ง, แถวจุดอ่อนรายหมวด — หน้าเฉลยมีอยู่แล้วในบล็อกสรุป
  - **จำนวนข้อที่ตอบถูกนับจาก `ans_is_correct` เสมอ ห้ามถอดกลับจาก `att_score`** — % ถูกปัดทศนิยมตอนเก็บ คูณกลับแล้วคลาดเคลื่อนได้เมื่อจำนวนข้อเยอะ
  - `best_*`/`latest_*` ใน `getProductSummary` เป็นค่า**ของ attempt ใบนั้นจริงๆ** (หยิบด้วย GROUP_CONCAT+SUBSTRING_INDEX) ไม่ใช่ `MAX()` ข้ามใบ เพราะชุดเดียวกันทำหลายครั้ง `MAX(att_earned_score)` อาจมาจากคนละใบกับที่ให้ `best_score` แล้วตัวเลขที่โชว์คู่กันจะมาจากคนละครั้ง
  - ต้อง `IFNULL(col, '')` ก่อนเข้า GROUP_CONCAT เสมอ เพราะ GROUP_CONCAT **ข้าม NULL ทิ้ง** ชุดที่มีทั้งครั้งที่ใช้ระบบคะแนนและไม่ใช้ปนกันจะได้ค่าของครั้งอื่นแทน — แล้วแปลงสตริงว่างกลับเป็น null ที่ `num()` ฝั่ง JS (`Number("") = 0` ซึ่งจะกลายเป็น "0 คะแนน" ทั้งที่ครั้งนั้นไม่ได้ใช้ระบบคะแนน)
- **ข้อที่ต้องทบทวน** (2026-09-06): `/history/mistakes` — รวมข้อที่เคยตอบผิด **และครั้งล่าสุดยังผิดอยู่** พร้อมเฉลยเต็ม (ตัวเลือกถูก + วิธีคิด + เหตุผลที่ตัวเลือกอื่นผิด) ไฮไลต์ตัวที่เลือกไปครั้งล่าสุดว่า "ที่คุณเลือก" กรองรายชุด/รายหมวดได้ผ่าน `?product_id=&topic_id=` และสลับดูข้อที่แก้ได้แล้วด้วย `?all=1` — เข้าได้จาก 3 จุดในหน้า `/history`: การ์ดใหญ่บนสุด (รวมทุกชุด), แถวจุดอ่อนแต่ละหมวด (กรองชุด+หมวด), และปุ่มท้ายการ์ดของแต่ละชุด
  - **เหตุผลที่ทำ**: หน้า `/history` เดิม *รายงานอย่างเดียว* — บอกได้ว่าอ่อนหมวดไหน แต่ไม่มีทางกดไปทำอะไรต่อ ทั้งที่จุดขายของธุรกิจคือเฉลยที่อธิบายวิธีคิด (`../CLAUDE.md` ข้อ 4)
  - นิยาม "ยังต้องทบทวน" อยู่ที่เดียวใน `attempt.controller.js` (`UNRESOLVED_MISTAKE_HAVING` + `LATEST_CORRECT_SQL`) ใช้ร่วมกันทั้งตัวนับ `mistake_count` ในหน้าสรุปและลิสต์จริง — **ห้ามเขียนเงื่อนไขซ้ำแยกกัน** ไม่งั้นตัวเลข "N ข้อ" จะไม่ตรงกับจำนวนการ์ดที่กดเข้าไปเห็น
  - `ORDER BY` ของลิสต์ต้องปิดท้ายด้วย `ques_id` เสมอ (total order) — สามคีย์แรกเสมอกันได้ง่ายมาก พอเสมอกันแล้วแบ่งหน้าจะได้ข้อซ้ำข้ามหน้า (เจอจริงตอนทดสอบ: หน้า 1 กับ 2 ซ้ำกัน 1 ข้อ)
- **ตัวอย่างข้อสอบฟรีก่อนซื้อ**: `/products/[id]/sample` (10 ข้อแรก เห็นเฉลยเต็ม ไม่ต้อง login)
- **แพ็กเกจรวมชุด**: `/packages` (ซื้อรวมราคาพิเศษ, ซื้อซ้ำ product ที่มีอยู่แล้ว → ต่ออายุ ไม่สร้างสิทธิ์ซ้ำ, การ์ดมีรูปหน้าปกแพ็กเกจ `pkg_cover_url`)
- **จำกัด 2 อุปกรณ์ล็อกอินพร้อมกัน** ต่อบัญชี (กันแชร์บัญชี — ความเสี่ยงอันดับ 1 ตาม `../CLAUDE.md` ข้อ 7) จัดการที่ `/account`
- **PDPA**: `/privacy`, checkbox ยอมรับตอนสมัคร/onboarding, ปุ่มขอลบข้อมูลบัญชีที่ `/account`
- **เข้าสู่ระบบ/สมัครด้วย Google** (2026-09-12): ปุ่มที่หน้า `/login` + `/register` → `/api/auth/google` → Google → `/api/auth/google/callback` → ลูกค้าใหม่ไปหน้า `/register/google` (ติ๊ก PDPA) → `/api/auth/google/complete` — ไม่ตั้ง `GOOGLE_CLIENT_ID` = ปุ่มไม่ขึ้น · กติกาเต็ม + วิธีตั้งค่า Google Cloud ดู `../CLAUDE.md` ข้อ 6.5
  - ปุ่มเป็น `<a>` ธรรมดา **ห้ามเปลี่ยนเป็น `next/link`** — Link จะ prefetch `/api/auth/google` ล่วงหน้าทุกครั้งที่ปุ่มโผล่บนจอ = ตั้ง cookie state ใหม่ทับของเดิมเงียบๆ
  - error ที่ส่งกลับหน้า login เป็น**รหัส** (`?error=google_suspended`) แปลเป็นข้อความด้วย `GOOGLE_ERROR_MESSAGES` เท่านั้น ห้ามรับข้อความจาก URL มาแสดงตรงๆ (ใครก็ส่งลิงก์ที่มีข้อความหลอกลวงให้ลูกค้าเห็นบนหน้าเว็บเราได้)
  - ไฟล์: `lib/googleOAuth.ts` (state/PKCE/ตรวจแอป/รหัส error), `app/components/GoogleSignInButton.tsx`, `app/api/auth/google/{route,callback/route,complete/route}.ts`, `app/register/google/*`
- **หน้าต้อนรับหลังสมัคร** (2026-09-12): `/welcome` เด้งขึ้น**ครั้งเดียว**ทันทีหลังสร้างบัญชีสำเร็จ มีปุ่ม "ข้ามไปก่อน" เสมอ แล้วไปต่อที่ `next` เดิม (เช่น กลับไปหน้าชำระเงิน)
  - สมัครด้วย Google → `/welcome?step=profile` ตรวจ/แก้ชื่อ-นามสกุล (เติมจาก Google ไว้แล้ว) + ใส่รูปโปรไฟล์ · สมัครด้วยฟอร์มปกติ → ใส่รูปอย่างเดียว (เพิ่งพิมพ์ชื่อในฟอร์มสมัครไป ถามซ้ำก็น่ารำคาญ)
  - ไม่เก็บในฐานข้อมูลว่าเคยข้ามหรือยัง — มีแค่ `RegisterForm` กับ `GoogleSignupForm` ที่พามาหน้านี้ ล็อกอินครั้งถัดไปไม่เจออีก เปลี่ยนชื่อ/รูปทีหลังได้ที่ `/account`
  - บัญชีที่แอดมินสร้าง (`cus_must_change_password`) ถูกพาข้ามหน้านี้ไปเลย เพราะ `OnboardingModal` ถามครบทุกอย่างอยู่แล้ว ไม่ซ้อนสองฟอร์ม
  - บันทึกชื่อผ่าน `PUT /api/me/name` → `PUT /store/me/name` (endpoint แยกเฉพาะชื่อ เพราะ `PUT /store/me` บังคับส่งอีเมลมาด้วยทุกครั้ง) · รูปใช้ `/api/me/avatar` ตัวเดียวกับ onboarding
- **ตัวนับผู้เยี่ยมชม** (2026-09-12): `app/components/VisitTracker.tsx` (ติดใน `app/layout.tsx`) ส่ง `navigator.sendBeacon("/api/track")` ทุกครั้งที่เปลี่ยนหน้า + สัญญาณ "ยังอยู่" ทุก 1 นาทีขณะแท็บแสดงบนจอ → `app/api/track/route.ts` ส่งต่อ backend พร้อม IP จริง (`forwardedClientHeaders`) และ user-agent ที่อ่านจาก header ฝั่ง server — **ไม่ใช้ cookie/localStorage เลย** · รายงานอยู่หน้าแอดมิน `/visitors` กติกาเต็มดู `../CLAUDE.md` ข้อ 5.3
  - route ตอบ 204 เสมอ แม้ backend ล่ม — ตัวนับเป็นของเสริม ห้ามทำให้หน้าเว็บช้าหรือเห็น error
  - กันนับซ้ำจาก React โหมด dev ที่รัน effect สองรอบ (path เดิมภายใน 1.5 วินาทีไม่นับ)
- **ลืมรหัสผ่านเองได้** (2026-09-04): `/forgot-password` → รับลิงก์ทางอีเมล → `/reset-password?token=...` (หน้านี้ `robots: noindex` เพราะ token อยู่ใน URL) — ดูกติกาความปลอดภัยเต็มๆ ที่ `../CLAUDE.md` ข้อ 6.2
- **คำสั่งซื้อของฉัน** (2026-09-04): `/orders` รายการออเดอร์ทั้งหมดพร้อมสถานะ/ชื่อชุดข้อสอบ/ยอดเงิน กดเข้าไปดูใบเสร็จหรือจ่ายเงินที่ค้างต่อได้ — เดิมมีแต่หน้าออเดอร์รายใบ ปิดแท็บทิ้งแล้วหาไม่เจอ
- **ใบเสร็จส่งเข้าอีเมลอัตโนมัติ** หลังชำระเงินสำเร็จ (ดู `../CLAUDE.md` ข้อ 6.1)
- **Navbar/UserMenu**: แสดงชื่อเต็ม+รูปโปรไฟล์, responsive (`md:` ขึ้นไปโชว์ลิงก์ตรงๆ, ต่ำกว่านั้นพับเป็น sidebar เลื่อนจากซ้าย `MobileNav.tsx`)

**ยังไม่ทำ**: package กับ coupon ใช้พร้อมกันไม่ได้ (v1 จำกัดไว้) — payment gateway เชื่อม Stripe ครบแล้วและ**ยืนยัน live mode ใช้งานได้จริงบน production แล้ว** (2026-08-17: ตั้ง webhook endpoint จริง, ทดสอบจ่ายเงินจริงผ่าน PromptPay สำเร็จ ให้สิทธิ์ถูกต้อง) ดูหัวข้อ 6 ที่ `../CLAUDE.md`

**รูปภาพในโจทย์และตัวเลือก**: รองรับทั้งระดับคำถาม (`ques_image_url`) และระดับตัวเลือก (`cho_image_url`) แนบได้ 2 ทาง —
1. **ฟอร์มสร้าง/แก้ไขคำถามฝั่งแอดมิน** (`frontend/app/(protected)/products/questions/create|edit`) มี `DragDropImage` (มี prop `compact` สำหรับใช้ในแถวตัวเลือกที่แคบ) ต่อคำถาม 1 อัน และต่อตัวเลือกแต่ละอัน — อัปโหลดแยก request หลังบันทึกข้อความสำเร็จ (เหมือนรูปหน้าปก product)
2. **นำเข้าไฟล์ Excel** (`.xlsx` เท่านั้น — `.csv` ฝังรูปไม่ได้) — เทมเพลตที่ดาวน์โหลดมีคอลัมน์แยกไว้เฉพาะสำหรับรูปโดยตรง (ไม่ปนกับคอลัมน์ข้อความ): คอลัมน์ "รูปคำถาม" และ "รูปตัวเลือก1"-"รูปตัวเลือก6" (พื้นหลังสีฟ้าอ่อนในเทมเพลตให้สังเกตง่าย) แอดมินวางรูปทับคอลัมน์เหล่านี้ตรงแถวของคำถามที่ต้องการ ระบบจับคู่จากตำแหน่งคอลัมน์อัตโนมัติ (`extractImagesByCell()` + `QUESTION_IMAGE_COLUMN`/`CHOICE_IMAGE_COLUMNS` ใน `backend/src/utils/parseQuestionFile.js` อ่าน `worksheet.getImages()`/`workbook.model.media` ของ ExcelJS ใช้ทั้งแถวและคอลัมน์) — รูปถูกบันทึกหลัง `conn.commit()` ทีละรายการแบบ try/catch แยกจากกัน ถ้ารูปไหนเซฟไม่สำเร็จจะไม่ทำให้ import ทั้งชุดล้มเหลว

**ข้อควรระวังเรื่องรูปตัวเลือกตอนแก้ไขคำถาม**: `PUT /products/:id/questions/:id` (update ในแอดมิน) ลบตัวเลือกเก่าทั้งหมดแล้วสร้างใหม่ทุกครั้ง (เหมือนข้อความตัวเลือก) — เพื่อไม่ให้รูปตัวเลือกเดิมหายไปโดยไม่ตั้งใจ ฝั่ง frontend ต้องส่ง `cho_image_url` เดิมกลับไปในแต่ละตัวเลือกที่ไม่ได้แนบรูปใหม่/ไม่ได้กดลบ ("carry over") — backend จะ insert ค่านั้นตรงๆ และลบไฟล์เก่าออกจาก disk เฉพาะ URL ที่ไม่ถูกส่งกลับมาเท่านั้น

**ยังไม่ได้ทดสอบจริงในเบราว์เซอร์ (ยกเว้นหน้า QR/ชำระเงินที่ผู้ใช้ทดสอบเองแล้ว)**: ฟีเจอร์ส่วนใหญ่ทดสอบผ่าน curl+cookie จริง (ไม่มี browser automation ในสภาพแวดล้อมนี้) — timer auto-submit จริง, การคลิก/ลากจริง (drag-drop รูป, ครอปรูป) ยังไม่เคยเห็นภาพจริงในเบราว์เซอร์ — ส่วนหน้า QR PromptPay + poller (`OrderStatusPoller.tsx`) ผู้ใช้ทดสอบเองผ่านเบราว์เซอร์จริงบน production แล้ว (2026-08-17: จ่ายเงินจริงผ่าน Stripe PromptPay สำเร็จ ให้สิทธิ์ถูกต้อง)

## Backend endpoints ที่ใช้ (`/api/V1/store/...`)

- Public: `POST /store/track` (ตัวนับผู้เยี่ยมชม — rate limit 300/นาที/IP), `POST /store/auth/google` (แลก code ของ Google — บัญชีเดิมได้ token / ลูกค้าใหม่ได้ `signup_token`), `POST /store/auth/google/complete` (`signup_token` + `pdpa_consent` → สร้างบัญชี), `GET /store/products`, `GET /store/products/:id`, `GET /store/products/:id/sample-questions`, `GET /store/packages`, `POST /store/auth/register/request-otp` (ขอรหัส OTP ยืนยันอีเมลก่อนสมัคร), `POST /store/auth/forgot-password`, `POST /store/auth/reset-password`, `POST /store/webhooks/payment` (webhook จาก Stripe จริง — verify signature ผ่าน SDK ทางการ `stripe.webhooks.constructEvent()` แล้ว)
- ต้อง auth (`Authorization: Bearer <customer JWT>`, payload `{ cus_id, mcp, jti }` — `jti` ใหม่จาก phase จำกัดอุปกรณ์):
  - Auth/onboarding: `POST /store/auth/register`, `POST /store/auth/login`, `GET /store/me`, `PUT /store/me`, `PUT /store/me/name` (ชื่อ-นามสกุลอย่างเดียว ใช้ที่หน้า `/welcome`), `PUT /store/me/password`, `PUT /store/me/onboarding`, `PUT /store/me/image`
  - Session: `GET /store/me/sessions` (รายการอุปกรณ์), `DELETE /store/me/sessions/:id` (เตะอุปกรณ์อื่น)
  - PDPA: `POST /store/me/deletion-request` (ขอลบข้อมูลบัญชี)
  - Checkout: `POST /store/checkout` (รับ `product_ids` และ/หรือ `package_id` — สร้าง PromptPay PaymentIntent อัตโนมัติถ้ามี Stripe config, คืน `qr_image_url`/`qr_expires_at` มาด้วยถ้าสร้างสำเร็จ), `GET /store/orders` (รายการคำสั่งซื้อของตัวเอง — ต้องประกาศ route ก่อน `/orders/:id` เสมอ), `GET /store/orders/:id` (มี self-heal: เช็คสถานะจริงกับ Stripe ตรงๆ ถ้ายัง pending), `PUT /store/orders/:id/cancel` (ยกเลิกออเดอร์ที่ยังไม่จ่าย — เช็คสถานะจริงกับ Stripe ก่อนยกเลิกเสมอ กัน race กับจ่ายสำเร็จพอดี), `GET /store/my/entitlements` — **`POST /store/orders/:id/confirm-payment` (mock) mount แบบมีเงื่อนไขเท่านั้น** (`ALLOW_MOCK_PAYMENT_CONFIRM=true` และยังไม่ตั้ง `STRIPE_SECRET_KEY` จริง) — checkoutAction ฝั่งนี้**ไม่เรียก endpoint นี้อัตโนมัติแล้ว** ต้องยิงตรงเอง (curl/Postman) หรือให้แอดมิน force-confirm ที่หน้า `/orders` ฝั่งแอดมินแทนตอนทดสอบ local
  - ทำข้อสอบ: `POST /store/products/:id/attempts` (เริ่ม/resume), `GET /store/attempts` (ประวัติ), `GET /store/attempts/summary` (สรุปรายชุด + จุดอ่อน + จำนวนข้อที่ต้องทบทวนของชุดนั้น — ต้องประกาศ route ก่อน `/attempts/:id` เสมอ), `GET /store/me/weak-areas` (สรุปจุดอ่อนรายหมวดข้ามชุด), `GET /store/me/mistakes` (ข้อที่ต้องทบทวน — รับ `product_id`/`topic_id`/`include_resolved`/`limit`/`offset`), `GET /store/attempts/:id`, `PUT /store/attempts/:id/answers/:questionId`, `POST /store/attempts/:id/submit`, `GET /store/attempts/:id/review` (คืนสรุปมาด้วย: `topic_breakdown` รายหมวดของครั้งนี้, `prev_score`, `mistake_count`, `att_started_at`)
  - Bookmark: `GET /store/bookmarks`, `POST /store/bookmarks/:questionId`, `DELETE /store/bookmarks/:questionId`
  - แจ้งปัญหา: `POST /store/questions/:id/report`
- token ลูกค้าคนละรูปทรงกับ staff (`{ user_id, user_role_id }`) — ห้ามใช้ token ปนกันข้ามระบบ
- `prod_exam_duration_minutes` (tb_products) กำหนดเวลาสอบต่อชุด — แก้ได้จากหน้าแอดมิน products create/edit — snapshot เป็น `att_time_limit_minutes` ตอนเริ่ม attempt โหมดจับเวลา (กันแก้ทีหลังกระทบ attempt เก่า)
- `checkout()` เมื่อมี `package_id` จะขยายเป็นรายการ product ย่อยแล้วไหลผ่าน flow เดิมทั้งหมด (ไม่มีคอลัมน์/ตารางพิเศษสำหรับ order ที่มาจาก package) — ส่วนลดคำนวณจาก (ราคารวมแยกซื้อ - pkg_price) เหมือนคูปอง
- entitlement จากการซื้อผ่านลูกค้าเอง (checkout/webhook) ใช้ `grantOrRenewProduct()` (ต่ออายุถ้ามีสิทธิ์ active อยู่แล้ว ไม่สร้างซ้ำ) ต่างจาก `grantProduct()` ที่แอดมิน grant มือ (ตั้งใจไม่ dedupe เพื่อความยืดหยุ่นของแอดมิน)

## Session/Auth pattern (implement แล้ว)

**⚠ ฟอร์ม auth ทั้ง 5 ไม่ใช้ Server Action แล้ว (2026-09-04)** — `login`, `register`, `forgot-password`, `reset-password`, **`onboarding`** (รวมอัปโหลดรูปโปรไฟล์ตอน onboarding ที่ `/api/me/avatar`) ย้ายไปเป็น Route Handler ที่ `app/api/auth/*/route.ts` + ฟอร์มยิง `postJson()` จาก `lib/http.ts` เอง เพราะ **WAF ของโฮสต์ (ModSecurity rule React2Shell) ตอบ 403 ให้ทุก request ที่มีสตริง `$@`** ซึ่ง Next แนบมากับฟอร์มที่ผูก `useActionState` เสมอ (ช่องซ่อน `{"bound":"$@1"}` ไว้ใช้ตอน JS ยังไม่ hydrate) — ลูกค้าที่กดปุ่มก่อนหน้าเว็บพร้อมจะเจอหน้า error และงานไม่เกิดขึ้นจริง

**cookie ยังตั้งฝั่ง server เหมือนเดิม** (Route Handler ตั้ง httpOnly cookie ได้เท่ากับ Server Action) JWT ไม่เคยผ่านมือ JS ฝั่ง client — กฎเดิมไม่เปลี่ยน · หลังตั้ง cookie เสร็จฟอร์มใช้ `hardNavigate()` (โหลดหน้าใหม่ทั้งหน้า) ไม่ใช่ `router.push` เพื่อให้ Server Component ทุกตัว render ใหม่ด้วย cookie ชุดใหม่

**ที่ยังเหลือใช้ `useActionState` อยู่ 3 ตัว** คือ `account/{AvatarUpload,PasswordForm,ProfileForm}.tsx` — **ตัดสินใจแล้วว่าไม่ย้าย (2026-09-04)** เพราะอยู่หลัง login ทั้งหมด ล้มแบบปลอดภัย (ไม่มีข้อมูลเสีย ไม่มีเงินเกี่ยว) กด Back แล้วลองใหม่ก็ผ่านเพราะรอบสอง JS โหลดเสร็จแล้ว — ทางแก้ที่ถูกต้องกว่าคือให้โฮสต์ใส่ข้อยกเว้นกฎ WAF `1055182010` ให้โดเมนนี้ (อัป Next 16.3.3 แล้ว = ปิดช่องโหว่ที่กฎนั้นป้องกันไปแล้ว) **อย่าเสนอย้ายซ้ำถ้าไม่มีข้อมูลใหม่** · `logoutAction` ไม่ต้องย้าย เพราะไม่ได้ผูก `useActionState` จึงไม่มี `$@` ในฟอร์ม

- httpOnly cookie เป็นแหล่งเก็บ JWT เดียว ตั้งค่าผ่าน Server Action ตอน login/register เท่านั้น — client-side JS ห้ามแตะ token
- Server Component ที่ต้องใช้ auth (fetch ข้อมูลส่วนตัว) อ่าน cookie ผ่าน `cookies()` แล้วแนบ `Authorization` header เรียก backend ตรงๆ ได้เลย (ปลอดภัยเพราะรันฝั่ง server)
- ปุ่ม/ฟอร์มที่ client ต้อง mutate (submit คำตอบ, ยืนยันจ่ายเงิน) ให้ยิงผ่าน Route Handler (`app/api/.../route.ts`) ที่ proxy ไป backend แทน ไม่ส่ง token ออกไปที่ browser JS
- Auth gating ใช้ **`proxy.ts`** (ไม่ใช่ `middleware.ts` — deprecated/renamed ใน Next.js 16 นี้) ทำ optimistic check เท่านั้น (decode payload เช็ค exp คร่าวๆ ไม่ query DB) ตามคำแนะนำทางการของ Next — การเช็คจริงเกิดที่ backend ทุกครั้งที่ request ไปถึง Express

## Gotcha ที่เจอระหว่างทำ (Next.js 16 breaking changes จาก AGENTS.md — อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ดเสมอ)

- `middleware.ts` ถูก rename เป็น `proxy.ts` (export function ชื่อ `proxy` ไม่ใช่ `middleware`)
- `next/image` จาก remote host ที่เป็น local IP/`localhost` ถูกบล็อกโดย default (กัน SSRF) ต้องเปิด `images.dangerouslyAllowLocalIP: true` เอง (ดู `next.config.ts` — เปิดเฉพาะตอน backend เป็น localhost เท่านั้น ไม่กระทบตอน deploy จริง)
- `images.qualities` default เหลือแค่ `[75]` ถ้าจะใช้ quality อื่นต้องประกาศเพิ่มเอง
- **ค่า `?next=` ต้องผ่าน `safeNextPath()` (`lib/safeNext.ts`) ทุกจุด** (แก้ 2026-09-12) — เดิมเช็คแค่ `startsWith("/")` ซึ่ง `//evil.com` ผ่านได้ (เบราว์เซอร์ตีความเป็นโดเมนอื่น) ใครส่งลิงก์ `/login?next=//evil.com` ให้ลูกค้า ล็อกอินเสร็จจะถูกพาไปเว็บปลอมทันที · ใช้แล้วที่หน้า login/register, `hardNavigate()` และ route ของ Google — เพิ่มจุดรับ `next` ใหม่เมื่อไหร่ต้องใช้ตัวนี้เสมอ
- **PDF: สระอำ (ำ) ทำให้ตัวอักษรท้ายข้อความหายไป** (เจอจริง 2026-09-05) — `@react-pdf/renderer` ตัดท้ายข้อความทิ้งเท่ากับจำนวนสระอำในข้อความนั้นเป๊ะๆ เพราะ fontkit แตก ำ 1 ตัวอักษรเป็น 2 glyph (นิคหิต U+0E4D กว้าง 0 + สระอา U+0E32) แต่ textkit คิดตำแหน่งตัดบรรทัดจากลำดับ**ตัวอักษร** ส่วนความกว้างมาจากลำดับ**glyph** พอเหลื่อมกันตัวท้ายเลยหลุด (อาการที่เห็นชัดสุดคือ "✓ คำตอบที่ถูกต้อง" กลายเป็น "✓ คำตอบที่ถูกต้อ" ทุกข้อ) — แก้ด้วย `toPdfThai()` ใน `lib/pdf/thaiText.ts` ที่เขียน ำ เป็นนิคหิต+สระอาตั้งแต่ต้น (1 ตัวอักษร = 1 glyph) **หน้าตาบนกระดาษไม่เปลี่ยนเลย** เพราะ fontkit ก็แตกเป็นสอง glyph นี้อยู่แล้ว — **เพิ่ม `<Text>` ใหม่ใน `ExamPdfDocument.tsx` เมื่อไหร่ต้องหุ้ม `toPdfThai()` ด้วยเสมอ ทั้งข้อความจาก DB และข้อความคงที่ในโค้ด**
- **PDF: ข้อความไทยยาวที่ไม่มีเว้นวรรคเลย react-pdf ตัดบรรทัดไม่ได้** — จะวาดทะลุออกนอกขอบขวาแล้วโดนขอบกระดาษตัดทิ้ง ตอนนี้เนื้อหาจริงยังไม่มีข้อไหนยาวถึงขั้นล้น (วัดด้วย metric ของ Kanit แล้ว 0/609 คำถาม 0/2405 ตัวเลือก) จึงยังไม่แก้ — ถ้าวันหนึ่งเจอ ทางแก้เดียวที่มีคือ `Font.registerHyphenationCallback` + `Intl.Segmenter("th")` ซึ่ง**ได้ยัติภังค์ "-" ติดมาด้วยเสมอ** (react-pdf แทรก `insertGlyph(HYPHEN)` ที่ทุก penalty breakpoint ปิดไม่ได้) และตัวคั่นแบบกว้างศูนย์ (U+200B/U+FEFF) ใช้ไม่ได้เพราะ Kanit ไม่มี glyph เลยกลายเป็นกล่อง .notdef

## Design system

**Brand assets (กลับมาใช้ kit ตัวสัญลักษณ์ไม่มีขา tt เมื่อ 2026-09-04)** — ต้นฉบับ brand kit อยู่ที่ `brand/` (นอก `public/` จะไม่ถูก serve ออกเว็บ) คู่กันกับฝั่งแอดมิน (`frontend/brand/`) สำเนาที่ใช้จริงอยู่ใน `public/logo/` + `app/{favicon.ico,icon.svg,apple-icon.png}` — สีแบรนด์น้ำเงิน `#2B5CE6` ส้ม `#FF9F1C` (ตั้งเป็น `--color-brand-600` กับ `themeColor` ใน `app/layout.tsx` แล้ว)

- **สัดส่วนโลโก้แนวนอน = 478:132 (3.62:1)** brand kit ห้ามยืดสัดส่วน — `next/image` ทุกจุดค่า `width`/`height` ต้องตรงสัดส่วนนี้ (ที่ใช้อยู่: 145×40 ใน navbar, 145×40 กับ 101×28 ใน sidebar แอดมิน) — ระหว่างทางเคยลอง kit ที่สัญลักษณ์มีขา tt (สัดส่วน 3.1/3.24/3.54) แล้วกลับมาชุดนี้ — **เปลี่ยน kit ทีไรให้เช็ค viewBox ก่อนเสมอ สัดส่วนเปลี่ยนทุกรอบ**
- favicon ของ kit นี้เป็นวงอย่างเดียวไม่มีขา อ่านชัดตั้งแต่ 16px (เรนเดอร์เทียบแล้ว) จึงใช้ `favicon.ico`/`favicon.svg` ตรงๆ ได้ทั้ง 3 ขนาด (16/32/48) ไม่ต้องมีตัว simple สำรอง
- สัญลักษณ์เดี่ยวๆ ใน UI (footer, sidebar ตอนหุบ) ใช้ `/logo/fasttiw-mark.svg` — kit นี้มีโลโก้แนวตั้ง (`fasttiw-logo-vertical*`) มาด้วย สำหรับพื้นที่ทรงจัตุรัส/แนวตั้ง (ยังไม่ได้ใช้ที่ไหนในเว็บ)
- มี `app/manifest.ts` (PWA icon/ชื่อ/สี ตอนเพิ่มลงหน้าจอโฮม) และลายน้ำ PDF (`public/logo/watermark.png` → `watermark-tiled.png`) — **เปลี่ยนโลโก้อีกครั้งต้อง resize โลโก้ใหม่เป็น `watermark.png` (กว้าง 300px) แก้ `TILE_H` ให้ตรงสัดส่วน แล้วรัน `node scripts/build-tiled-watermark.mjs` ซ้ำ**

`components/ui/` เป็นชุดใหม่ (ไม่ได้ก็อปจาก `tiwwai/frontend`) — Button ใช้ `cn()` (clsx + tailwind-merge) merge className ถูกต้อง (โปรเจกต์แอดมินมีบั๊กตรงนี้ อย่าทำซ้ำ) โทนสีกำหนดใน `app/globals.css` ผ่าน `--color-brand-*` (Tailwind v4 CSS-first config) ฟอนต์ใช้ Kanit จาก `next/font/google` (หลาย weight ต่างจากแอดมินที่มีแค่ regular ตัวเดียว)
