@AGENTS.md

# tiwwai-store — เว็บฝั่งลูกค้า (storefront + ทำข้อสอบ)

โปรเจกต์นี้แยกจาก `frontend` (แอดมิน) แต่ใช้ backend Express เดียวกัน (`localhost:3003`) — อยู่ใน repo เดียวกันเป็น sibling ของ `backend`/`frontend`/`database` แต่เป็นคนละ Next.js project ที่ deploy แยกจากกันได้อิสระ — ดูรายละเอียดธุรกิจ/ขอบเขต MVP เต็มๆ ที่ `../CLAUDE.md`

## สถานะ

**เสร็จแล้ว** (MVP phase 1-6 + phase 2 เกือบครบทั้งหมดตาม `../CLAUDE.md`):
- landing page (`Hero.tsx` สลับ 11 มุมมองข้อความ+รูปคู่กันอัตโนมัติ), แคตตาล็อกสินค้า (`/products`), หน้ารายละเอียดสินค้า (`/products/[id]` + ลิงก์ตัวอย่างฟรี), ตะกร้าสินค้าฝั่ง client (`/cart`, localStorage)
- สมัคร/เข้าสู่ระบบ (`/register`, `/login`) + onboarding บังคับเปลี่ยนรหัส/เติมข้อมูล+รูปโปรไฟล์+ยอมรับนโยบายความเป็นส่วนตัว (`OnboardingGate`/`OnboardingModal`)
- เช็คเอาท์จริง (`/cart` หรือ `/packages` → checkout → `/orders/[id]` ใบเสร็จ) พร้อมชำระเงินจริงผ่าน **Stripe PromptPay** (ย้ายมาจาก Omise ระหว่างทำโปรเจกต์ — ดู `../CLAUDE.md` ข้อ 6) — สร้าง QR ให้สแกนตอน checkout เลย, หน้า order poll สถานะเองทุก 4 วิ (`OrderStatusPoller.tsx` + Route Handler แรกของโปรเจกต์ `app/api/orders/[id]/status/route.ts`) จนกว่า webhook จะยืนยัน, แสดงสถานะ pending/paid/cancelled ชัดเจน, ยกเลิกคำสั่งซื้อที่ยังไม่จ่ายได้เอง (`CancelOrderButton.tsx` ที่หน้า order เดียวกัน)
- **ทำข้อสอบจริง**: `/library` → `/exam/[productId]` (เลือกโหมด) → `/exam/attempts/[id]` (ทำทีละข้อ, autosave, timer, auto-submit) → `/exam/attempts/[id]/review` (เฉลยครบ 4 อย่าง + bookmark + แจ้งปัญหาข้อนี้) — รองรับรูปภาพประกอบโจทย์ทุกจุด (`QuestionImage.tsx`) และรูปภาพต่อตัวเลือก (`ChoiceImage.tsx`, ใช้ใน exam runner/review/bookmarks/sample ทุกจุด)
- **ประวัติ/bookmark/บัญชี**: `/history` (+ สรุปจุดอ่อนรายหมวด), `/bookmarks` (+ แจ้งปัญหาข้อนี้), `/account` (โปรไฟล์/รหัสผ่าน/รูป/อุปกรณ์ที่ล็อกอิน/ขอลบข้อมูลบัญชี)
- **ตัวอย่างข้อสอบฟรีก่อนซื้อ**: `/products/[id]/sample` (10 ข้อแรก เห็นเฉลยเต็ม ไม่ต้อง login)
- **แพ็กเกจรวมชุด**: `/packages` (ซื้อรวมราคาพิเศษ, ซื้อซ้ำ product ที่มีอยู่แล้ว → ต่ออายุ ไม่สร้างสิทธิ์ซ้ำ, การ์ดมีรูปหน้าปกแพ็กเกจ `pkg_cover_url`)
- **จำกัด 2 อุปกรณ์ล็อกอินพร้อมกัน** ต่อบัญชี (กันแชร์บัญชี — ความเสี่ยงอันดับ 1 ตาม `../CLAUDE.md` ข้อ 7) จัดการที่ `/account`
- **PDPA**: `/privacy`, checkbox ยอมรับตอนสมัคร/onboarding, ปุ่มขอลบข้อมูลบัญชีที่ `/account`
- **Navbar/UserMenu**: แสดงชื่อเต็ม+รูปโปรไฟล์, responsive (`md:` ขึ้นไปโชว์ลิงก์ตรงๆ, ต่ำกว่านั้นพับเป็น sidebar เลื่อนจากซ้าย `MobileNav.tsx`)

**ยังไม่ทำ**: package กับ coupon ใช้พร้อมกันไม่ได้ (v1 จำกัดไว้) — payment gateway เชื่อม Stripe ครบแล้วและ**ยืนยัน live mode ใช้งานได้จริงบน production แล้ว** (2026-08-17: ตั้ง webhook endpoint จริง, ทดสอบจ่ายเงินจริงผ่าน PromptPay สำเร็จ ให้สิทธิ์ถูกต้อง) ดูหัวข้อ 6 ที่ `../CLAUDE.md`

**รูปภาพในโจทย์และตัวเลือก**: รองรับทั้งระดับคำถาม (`ques_image_url`) และระดับตัวเลือก (`cho_image_url`) แนบได้ 2 ทาง —
1. **ฟอร์มสร้าง/แก้ไขคำถามฝั่งแอดมิน** (`frontend/app/(protected)/products/questions/create|edit`) มี `DragDropImage` (มี prop `compact` สำหรับใช้ในแถวตัวเลือกที่แคบ) ต่อคำถาม 1 อัน และต่อตัวเลือกแต่ละอัน — อัปโหลดแยก request หลังบันทึกข้อความสำเร็จ (เหมือนรูปหน้าปก product)
2. **นำเข้าไฟล์ Excel** (`.xlsx` เท่านั้น — `.csv` ฝังรูปไม่ได้) — เทมเพลตที่ดาวน์โหลดมีคอลัมน์แยกไว้เฉพาะสำหรับรูปโดยตรง (ไม่ปนกับคอลัมน์ข้อความ): คอลัมน์ "รูปคำถาม" และ "รูปตัวเลือก1"-"รูปตัวเลือก6" (พื้นหลังสีฟ้าอ่อนในเทมเพลตให้สังเกตง่าย) แอดมินวางรูปทับคอลัมน์เหล่านี้ตรงแถวของคำถามที่ต้องการ ระบบจับคู่จากตำแหน่งคอลัมน์อัตโนมัติ (`extractImagesByCell()` + `QUESTION_IMAGE_COLUMN`/`CHOICE_IMAGE_COLUMNS` ใน `backend/src/utils/parseQuestionFile.js` อ่าน `worksheet.getImages()`/`workbook.model.media` ของ ExcelJS ใช้ทั้งแถวและคอลัมน์) — รูปถูกบันทึกหลัง `conn.commit()` ทีละรายการแบบ try/catch แยกจากกัน ถ้ารูปไหนเซฟไม่สำเร็จจะไม่ทำให้ import ทั้งชุดล้มเหลว

**ข้อควรระวังเรื่องรูปตัวเลือกตอนแก้ไขคำถาม**: `PUT /products/:id/questions/:id` (update ในแอดมิน) ลบตัวเลือกเก่าทั้งหมดแล้วสร้างใหม่ทุกครั้ง (เหมือนข้อความตัวเลือก) — เพื่อไม่ให้รูปตัวเลือกเดิมหายไปโดยไม่ตั้งใจ ฝั่ง frontend ต้องส่ง `cho_image_url` เดิมกลับไปในแต่ละตัวเลือกที่ไม่ได้แนบรูปใหม่/ไม่ได้กดลบ ("carry over") — backend จะ insert ค่านั้นตรงๆ และลบไฟล์เก่าออกจาก disk เฉพาะ URL ที่ไม่ถูกส่งกลับมาเท่านั้น

**ยังไม่ได้ทดสอบจริงในเบราว์เซอร์ (ยกเว้นหน้า QR/ชำระเงินที่ผู้ใช้ทดสอบเองแล้ว)**: ฟีเจอร์ส่วนใหญ่ทดสอบผ่าน curl+cookie จริง (ไม่มี browser automation ในสภาพแวดล้อมนี้) — timer auto-submit จริง, การคลิก/ลากจริง (drag-drop รูป, ครอปรูป) ยังไม่เคยเห็นภาพจริงในเบราว์เซอร์ — ส่วนหน้า QR PromptPay + poller (`OrderStatusPoller.tsx`) ผู้ใช้ทดสอบเองผ่านเบราว์เซอร์จริงบน production แล้ว (2026-08-17: จ่ายเงินจริงผ่าน Stripe PromptPay สำเร็จ ให้สิทธิ์ถูกต้อง)

## Backend endpoints ที่ใช้ (`/api/V1/store/...`)

- Public: `GET /store/products`, `GET /store/products/:id`, `GET /store/products/:id/sample-questions`, `GET /store/packages`, `POST /store/webhooks/payment` (webhook จาก Stripe จริง — verify signature ผ่าน SDK ทางการ `stripe.webhooks.constructEvent()` แล้ว)
- ต้อง auth (`Authorization: Bearer <customer JWT>`, payload `{ cus_id, mcp, jti }` — `jti` ใหม่จาก phase จำกัดอุปกรณ์):
  - Auth/onboarding: `POST /store/auth/register`, `POST /store/auth/login`, `GET /store/me`, `PUT /store/me`, `PUT /store/me/password`, `PUT /store/me/onboarding`, `PUT /store/me/image`
  - Session: `GET /store/me/sessions` (รายการอุปกรณ์), `DELETE /store/me/sessions/:id` (เตะอุปกรณ์อื่น)
  - PDPA: `POST /store/me/deletion-request` (ขอลบข้อมูลบัญชี)
  - Checkout: `POST /store/checkout` (รับ `product_ids` และ/หรือ `package_id` — สร้าง PromptPay PaymentIntent อัตโนมัติถ้ามี Stripe config, คืน `qr_image_url`/`qr_expires_at` มาด้วยถ้าสร้างสำเร็จ), `GET /store/orders/:id` (มี self-heal: เช็คสถานะจริงกับ Stripe ตรงๆ ถ้ายัง pending), `PUT /store/orders/:id/cancel` (ยกเลิกออเดอร์ที่ยังไม่จ่าย — เช็คสถานะจริงกับ Stripe ก่อนยกเลิกเสมอ กัน race กับจ่ายสำเร็จพอดี), `GET /store/my/entitlements` — **`POST /store/orders/:id/confirm-payment` (mock) mount แบบมีเงื่อนไขเท่านั้น** (`ALLOW_MOCK_PAYMENT_CONFIRM=true` และยังไม่ตั้ง `STRIPE_SECRET_KEY` จริง) — checkoutAction ฝั่งนี้**ไม่เรียก endpoint นี้อัตโนมัติแล้ว** ต้องยิงตรงเอง (curl/Postman) หรือให้แอดมิน force-confirm ที่หน้า `/orders` ฝั่งแอดมินแทนตอนทดสอบ local
  - ทำข้อสอบ: `POST /store/products/:id/attempts` (เริ่ม/resume), `GET /store/attempts` (ประวัติ), `GET /store/me/weak-areas` (สรุปจุดอ่อนรายหมวด), `GET /store/attempts/:id`, `PUT /store/attempts/:id/answers/:questionId`, `POST /store/attempts/:id/submit`, `GET /store/attempts/:id/review`
  - Bookmark: `GET /store/bookmarks`, `POST /store/bookmarks/:questionId`, `DELETE /store/bookmarks/:questionId`
  - แจ้งปัญหา: `POST /store/questions/:id/report`
- token ลูกค้าคนละรูปทรงกับ staff (`{ user_id, user_role_id }`) — ห้ามใช้ token ปนกันข้ามระบบ
- `prod_exam_duration_minutes` (tb_products) กำหนดเวลาสอบต่อชุด — แก้ได้จากหน้าแอดมิน products create/edit — snapshot เป็น `att_time_limit_minutes` ตอนเริ่ม attempt โหมดจับเวลา (กันแก้ทีหลังกระทบ attempt เก่า)
- `checkout()` เมื่อมี `package_id` จะขยายเป็นรายการ product ย่อยแล้วไหลผ่าน flow เดิมทั้งหมด (ไม่มีคอลัมน์/ตารางพิเศษสำหรับ order ที่มาจาก package) — ส่วนลดคำนวณจาก (ราคารวมแยกซื้อ - pkg_price) เหมือนคูปอง
- entitlement จากการซื้อผ่านลูกค้าเอง (checkout/webhook) ใช้ `grantOrRenewProduct()` (ต่ออายุถ้ามีสิทธิ์ active อยู่แล้ว ไม่สร้างซ้ำ) ต่างจาก `grantProduct()` ที่แอดมิน grant มือ (ตั้งใจไม่ dedupe เพื่อความยืดหยุ่นของแอดมิน)

## Session/Auth pattern (implement แล้ว)

- httpOnly cookie เป็นแหล่งเก็บ JWT เดียว ตั้งค่าผ่าน Server Action ตอน login/register เท่านั้น — client-side JS ห้ามแตะ token
- Server Component ที่ต้องใช้ auth (fetch ข้อมูลส่วนตัว) อ่าน cookie ผ่าน `cookies()` แล้วแนบ `Authorization` header เรียก backend ตรงๆ ได้เลย (ปลอดภัยเพราะรันฝั่ง server)
- ปุ่ม/ฟอร์มที่ client ต้อง mutate (submit คำตอบ, ยืนยันจ่ายเงิน) ให้ยิงผ่าน Route Handler (`app/api/.../route.ts`) ที่ proxy ไป backend แทน ไม่ส่ง token ออกไปที่ browser JS
- Auth gating ใช้ **`proxy.ts`** (ไม่ใช่ `middleware.ts` — deprecated/renamed ใน Next.js 16 นี้) ทำ optimistic check เท่านั้น (decode payload เช็ค exp คร่าวๆ ไม่ query DB) ตามคำแนะนำทางการของ Next — การเช็คจริงเกิดที่ backend ทุกครั้งที่ request ไปถึง Express

## Gotcha ที่เจอระหว่างทำ (Next.js 16 breaking changes จาก AGENTS.md — อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ดเสมอ)

- `middleware.ts` ถูก rename เป็น `proxy.ts` (export function ชื่อ `proxy` ไม่ใช่ `middleware`)
- `next/image` จาก remote host ที่เป็น local IP/`localhost` ถูกบล็อกโดย default (กัน SSRF) ต้องเปิด `images.dangerouslyAllowLocalIP: true` เอง (ดู `next.config.ts` — เปิดเฉพาะตอน backend เป็น localhost เท่านั้น ไม่กระทบตอน deploy จริง)
- `images.qualities` default เหลือแค่ `[75]` ถ้าจะใช้ quality อื่นต้องประกาศเพิ่มเอง

## Design system

**Brand assets (kit ล่าสุด ชุดมีขา tt อัปเดต 2026-09-04)** — ต้นฉบับ brand kit อยู่ที่ `brand/` (นอก `public/` จะไม่ถูก serve ออกเว็บ) คู่กันกับฝั่งแอดมิน (`frontend/brand/`) สำเนาที่ใช้จริงอยู่ใน `public/logo/` + `app/{favicon.ico,icon.svg,apple-icon.png}` — สีแบรนด์น้ำเงิน `#2B5CE6` ส้ม `#FF9F1C` (ตั้งเป็น `--color-brand-600` กับ `themeColor` ใน `app/layout.tsx` แล้ว)

- **สัดส่วนโลโก้แนวนอน = 496:153 (3.24:1)** brand kit ห้ามยืดสัดส่วน — `next/image` ทุกจุดค่า `width`/`height` ต้องตรงสัดส่วนนี้ (ที่ใช้อยู่: 130×40 ใน navbar, 130×40 กับ 91×28 ใน sidebar แอดมิน) — kit ปรับสัดส่วนมาแล้ว 3 รอบ (2.45 → 3.62 → 3.1 → 3.24) เปลี่ยนทีไรเช็ค viewBox ก่อนทุกครั้ง
- **แท็บเบราว์เซอร์ใช้ `favicon-simple`** (`app/favicon.ico`, `app/icon.svg`) เพราะไอคอนหลักที่มีขา tt พอย่อเหลือ 16px ขาจะเละเป็นก้อน (README ของ kit เตือนไว้เอง) — ไอคอนขนาดใหญ่ (apple-touch, 192, 512, maskable) ยังใช้ตัวเต็มที่มีขา
- สัญลักษณ์เดี่ยวๆ ใน UI ให้ใช้ `/logo/fasttiw-symbol.svg` (ไม่ใช่ไฟล์ favicon ตรงๆ) — kit นี้เลิกชื่อ `fasttiw-mark` แล้ว มีโลโก้แนวตั้ง (`fasttiw-logo-vertical*`) เพิ่มมาด้วย สำหรับพื้นที่ทรงจัตุรัส/แนวตั้ง
- มี `app/manifest.ts` (PWA icon/ชื่อ/สี ตอนเพิ่มลงหน้าจอโฮม) และลายน้ำ PDF (`public/logo/watermark.png` → `watermark-tiled.png`) — **เปลี่ยนโลโก้อีกครั้งต้อง resize โลโก้ใหม่เป็น `watermark.png` (กว้าง 300px) แก้ `TILE_H` ให้ตรงสัดส่วน แล้วรัน `node scripts/build-tiled-watermark.mjs` ซ้ำ**

`components/ui/` เป็นชุดใหม่ (ไม่ได้ก็อปจาก `tiwwai/frontend`) — Button ใช้ `cn()` (clsx + tailwind-merge) merge className ถูกต้อง (โปรเจกต์แอดมินมีบั๊กตรงนี้ อย่าทำซ้ำ) โทนสีกำหนดใน `app/globals.css` ผ่าน `--color-brand-*` (Tailwind v4 CSS-first config) ฟอนต์ใช้ Kanit จาก `next/font/google` (หลาย weight ต่างจากแอดมินที่มีแค่ regular ตัวเดียว)
