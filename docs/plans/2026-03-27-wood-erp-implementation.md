# Wood ERP — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yog'och import biznesi uchun to'liq ERP tizimini TZ asosida qaytadan qurish.

**Architecture:** Next.js 15 App Router + Server Actions (alohida API yo'q). Har modul `_components/` papkasida alohida komponentlarga bo'lingan. Barcha moliyaviy operatsiyalar double-entry: kassa + hamkor balansi bir vaqtda yangilanadi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL · Lucide React

**Muhim fayllar:**
- TZ: `docs/TZ.md` — BARCHA qarorlar shu faylga asoslanadi
- Dizayn referensi: `docs/design-reference/wagon-create-modal.png`

---

## Fayl strukturasi

```
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── page.tsx                        ← Dashboard
│       ├── wagons/
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── WagonTable.tsx
│       │       ├── WagonModal.tsx
│       │       ├── TimberTable.tsx
│       │       └── WagonLog.tsx
│       ├── codes/
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── CodeInventory.tsx
│       │       ├── CodeBuyModal.tsx
│       │       ├── CodeSellModal.tsx
│       │       └── CodeHistory.tsx
│       ├── partners/
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── PartnerList.tsx
│       │       ├── PartnerModal.tsx
│       │       └── PartnerDetail.tsx
│       ├── cash/
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── UsdCash.tsx
│       │       ├── RubCash.tsx
│       │       └── ExchangeHistory.tsx
│       ├── sales/
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── SaleTable.tsx
│       │       ├── SaleModal.tsx
│       │       └── SaleReceiveModal.tsx
│       ├── warehouse/
│       │   ├── page.tsx
│       │   └── _components/
│       │       └── WarehouseTable.tsx
│       └── reports/
│           ├── page.tsx
│           └── _components/
│               ├── WagonReport.tsx
│               ├── CodeReport.tsx
│               └── CashReport.tsx
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── ConfirmDialog.tsx
│       └── Field.tsx
├── db/
│   ├── index.ts
│   └── schema.ts
├── lib/
│   └── actions/
│       ├── wagons.ts
│       ├── timbers.ts
│       ├── codes.ts
│       ├── partners.ts
│       ├── cash.ts
│       ├── sales.ts
│       ├── warehouse.ts
│       ├── reports.ts
│       └── dashboard.ts
└── i18n/
    └── uz.ts
```

---

## Task 1: Sidebar + Layout

**Agent:** Frontend Farid
**TZ bo'lim:** 5 (Fayl strukturasi)

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/layout/Sidebar.tsx`

**SPEC:**

`Sidebar.tsx`:
- Dark sidebar (bg-slate-900), kenglik: 240px
- Yuqorida: "Wood ERP" sarlavha + "Yog'och savdo tizimi" taglavha
- Nav items: Bosh sahifa / Vagonlar / Kodlar / Hamkorlar / Kassa / Savdo / Ombor / Hisobotlar
- Aktiv link: `bg-blue-600`, boshqalar: hover on bg-slate-800
- Lucide React ikonkalar ishlatilsin
- `usePathname()` bilan aktiv holat aniqlansin

`(dashboard)/layout.tsx`:
- Sidebar (chap) + main content (o'ng, flex-1, bg-slate-50, padding: 24px)

**DIZAYN:** `docs/design-reference/wagon-create-modal.png` rang sxemasiga mos: ko'k `#3B82F6` accent

**CONSTRAINTS:**
- `"use client"` faqat Sidebar da (pathname uchun)
- Layout server component bo'lsin

- [ ] **Step 1:** `globals.css` va root `layout.tsx` yaratilsin
- [ ] **Step 2:** `Sidebar.tsx` yaratilsin
- [ ] **Step 3:** `(dashboard)/layout.tsx` yaratilsin
- [ ] **Step 4:** Har bir route uchun placeholder `page.tsx` yaratilsin (build o'tishi uchun)
- [ ] **Step 5:** `npx tsc --noEmit` — 0 xato bo'lishi kerak
- [ ] **Step 6:** Commit: `"feat: sidebar va layout"`

---

## Task 2: DB Schema

**Agent:** Backend Botir
**TZ bo'lim:** 2 (barcha modullar), 3 (biznes qoidalari)

**Files:**
- Create: `src/db/index.ts`
- Create: `src/db/schema.ts`

**SPEC — Jadvallar:**

**Enumlar:**
- `transport_type`: `wagon | truck`
- `transport_status`: `in_transit | at_border | arrived | unloaded | closed`
- `partner_type`: `russia_supplier | code_supplier | code_buyer | wood_buyer | service_provider | truck_owner | personal | exchanger | partner`
- `code_type`: `kz | uz | afgon`
- `code_status`: `available | used | sold`
- `cash_currency`: `usd | rub`
- `operation_type`: `income | expense | exchange | debt_give | debt_take`

**`partners`** jadvali:
- id, name, type (partnerTypeEnum), phone, notes, createdAt

**`partner_balances`** jadvali (double-entry log):
- id, partnerId (→partners), amount (decimal, musbat = ular bizga qarz, manfiy = biz ularga qarz), currency, description, notes, docNumber (varchar 4), createdAt

**`transports`** jadvali (vagon + yuk mashinasi):
- id, type (transportTypeEnum), number, fromLocation, toLocation, sentAt (date), arrivedAt (date), closedAt (date)
- tonnage (decimal)
- status (transportStatusEnum, default: in_transit)
- supplierId (→partners) — Rossiya ta'minotchisi
- Kod maydonlari (faqat wagon uchun): codeUzSupplierId, codeUzPricePerTon, codeKzSupplierId, codeKzPricePerTon
- Yuk mashinasi: truckOwnerId (→partners), truckOwnerPayment (decimal)
- Yog'och xaridi: rubPricePerCubic, rubExchangeRate (to'lov paytidagi o'rtacha kurs)
- Standart xarajatlar ($): expenseNds, expenseUsluga, expenseTupik, expenseXrannei, expenseOrtish, expenseTushurish (barchasi decimal, default 0)
- Standart xarajat hamkorlari: expenseNdsPartnerId, expenseUslugaPartnerId, ... (→partners)
- notes, createdAt

**`transport_expenses`** jadvali (qo'shimcha xarajatlar):
- id, transportId (→transports, cascade), name, amount, partnerId (→partners), notes, createdAt

**`transport_logs`** jadvali:
- id, transportId (→transports, cascade), action (text), createdAt

**`timbers`** jadvali:
- id, transportId (→transports, cascade)
- thicknessMm (integer), widthMm (integer), lengthM (decimal)
- russiaCount (integer, default 0)
- tashkentCount (integer, default 0)
- customerCount (integer, default 0) — savdolardan yig'iladi
- createdAt

**`codes`** jadvali (har birlik alohida):
- id, type (codeTypeEnum), supplierId (→partners)
- status (codeStatusEnum, default: available)
- Narxlar (faqat ishlatilganda to'ldiriladi): buyCostUsd, sellPriceUsd, buyPricePerTon, sellPricePerTon
- tonnage (decimal) — ishlatilgan vagon tonnaji
- usedInTransportId (→transports) — o'z vagonida ishlatilganda
- soldToPartnerId (→partners) — mijozga sotilganda
- notes, createdAt, usedAt

**`cash_operations`** jadvali:
- id, currency (cashCurrencyEnum), type (operationTypeEnum)
- amount (decimal, musbat=kirim, manfiy=chiqim)
- exchangeRate (decimal) — RUB operatsiyalari uchun
- partnerId (→partners), transportId (→transports)
- description, notes, docNumber (varchar 4), createdAt

**`sales`** jadvali:
- id, customerId (→partners), status (sent | received)
- paymentType (cash | debt | mixed)
- totalSentUsd, totalReceivedUsd, paidAmount (decimal)
- docNumber (varchar 4), notes, sentAt, receivedAt

**`sale_items`** jadvali:
- id, saleId (→sales, cascade)
- timberId (→timbers, nullable) — vagondan sotilganda
- warehouseId (→warehouse, nullable) — ombordan sotilganda
- thicknessMm, widthMm, lengthM, sentCount, receivedCount
- pricePerCubicUsd, totalUsd
- createdAt

**`warehouse`** jadvali:
- id, timberId (→timbers), transportId (→transports)
- thicknessMm, widthMm, lengthM, quantity
- createdAt

**Relations:** barcha jadvallar uchun Drizzle relations yozilsin

**CONSTRAINTS:**
- `drizzle-kit push` bilan DB ga push qilinsin
- `npx tsc --noEmit` — 0 xato

- [ ] **Step 1:** `src/db/index.ts` — DB connection (DATABASE_URL env dan)
- [ ] **Step 2:** `src/db/schema.ts` — barcha jadvallar va relations
- [ ] **Step 3:** `npx drizzle-kit push` — migration apply
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato
- [ ] **Step 5:** Commit: `"feat: DB schema — barcha jadvallar"`

---

## Task 3: Vagonlar — Backend

**Agent:** Backend Botir
**TZ bo'lim:** 2.1 (Vagonlar), 3 (Biznes qoidalari #1, #2, #3, #10, #11)

**Files:**
- Create: `src/lib/actions/wagons.ts`
- Create: `src/lib/actions/timbers.ts`

**SPEC — `wagons.ts`:**

`getTransports(type)` — barcha vagonlar/yuk mashinalari, with: supplier, timbers, expenses

`getTransport(id)` — bitta transport, with: supplier, timbers, expenses(with partner), logs

`createTransport(data)` — yangi transport yaratish:
- DB ga yozish
- Log yozish: "Transport yaratildi (#номер)"
- Kod UZ va KZ uchun: `tonnaj × $/t = $` → ta'minotchi balansida qarz (manfiy partnerBalance)
- Standart xarajatlar uchun: har xarajat → tegishli hamkor balansida qarz (TZ bo'lim 2.1 C)
- **TZ qoida #1:** Kod hisoblash = tonnaj × $/t (KUB EMAS!)

`updateTransport(id, data)` — yangilash + log yozish

`closeTransport(id, rubPerCubic)` — vagon yopish:
- **TZ qoida #2:** Toshkent soni bo'yicha jami kub hisoblash
- **TZ qoida #10:** RUB kassa balansini tekshirish — yetarli bo'lmasa xato berish
- RUB kassasidan jami RUB ayirish (cashOperations ga yozish)
- **TZ qoida #3:** O'rtacha kurs bilan $ ga hisoblash
- Rossiya ta'minotchisi balansida qarzni yopish
- Status → "closed", closedAt → bugun
- Log yozish

`deleteTransport(id)` — o'chirish (faqat in_transit holatida)

**SPEC — `timbers.ts`:**

`getTimbers(transportId)` — yog'ochlar ro'yxati

`createTimber(data)` — yangi yog'och qo'shish + log

`updateTimber(id, data)` — Toshkent/Mijoz soni yangilash + log (Toshkent soni o'zgarganda log yozilsin)

`deleteTimber(id)` — o'chirish

`calcCubicMeters(thicknessMm, widthMm, lengthM, count)` — kub hisoblash utility:
- Formula: `(thicknessMm/1000) × (widthMm/1000) × lengthM × count`

**CONSTRAINTS:**
- Barcha funksiyalar `"use server"` bilan boshlansin
- `revalidatePath("/wagons")` har o'zgarishdan keyin
- Double-entry: har moliyaviy operatsiya ham kassada, ham hamkor balansida aks etsin

- [ ] **Step 1:** `wagons.ts` CRUD funksiyalari
- [ ] **Step 2:** `closeTransport` — weighted average kurs + double-entry
- [ ] **Step 3:** `timbers.ts` — CRUD + calcCubicMeters
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato
- [ ] **Step 5:** Commit: `"feat: vagonlar va yog'ochlar server actions"`

---

## Task 4: Vagonlar — Frontend

**Agent:** Frontend Farid
**TZ bo'lim:** 2.1, 0 (Dizayn qoidalari)

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/ConfirmDialog.tsx`
- Create: `src/i18n/uz.ts`
- Create: `src/app/(dashboard)/wagons/page.tsx`
- Create: `src/app/(dashboard)/wagons/_components/WagonTable.tsx`
- Create: `src/app/(dashboard)/wagons/_components/WagonModal.tsx`
- Create: `src/app/(dashboard)/wagons/_components/TimberTable.tsx`
- Create: `src/app/(dashboard)/wagons/_components/WagonLog.tsx`

**SPEC — `Modal.tsx`:**
- Props: isOpen, onClose, title, children, size (md/lg/xl)
- Dizayn: oq fon, yumaloq burchaklar (rounded-2xl), scrollable, overlay (black/50)
- Referens: `docs/design-reference/wagon-create-modal.png`

**SPEC — `ConfirmDialog.tsx`:**
- Props: isOpen, onClose, onConfirm, title, message, confirmText, isLoading
- "Bekor qilish" (outline) + confirm (red) tugmalari

**SPEC — `uz.ts`:**
- Barcha modullar uchun O'zbekcha tarjimalar: wagons, codes, partners, cash, sales, warehouse, reports, common

**SPEC — `WagonModal.tsx`:**
Dizayn `docs/design-reference/wagon-create-modal.png` ga to'liq mos:

Section 1 — **Asosiy ma'lumotlar:**
- Vagon raqami (full width)
- Jo'natilgan sana | Yetib kelgan sana (2 ustun)
- Qayerdan | Qayerga (2 ustun)
- Tonnaj (full width)
- Transport ta'minotchisi (hamkorlar dropdown — faqat russia_supplier turi)

Section 2 — **Kodlar** (faqat wagon type uchun, truck da ko'rinmaydi):
- Kod UZ qatori: [Kod nomi] [$/t input] [Jami: $X.XX (avtomatik)] + [Ta'minotchi dropdown]
- Kod KZ qatori: xuddi shunday
- Jami avtomatik: `tonnaj × $/t`

Section 3 — **Yog'ochlar:**
- Har qator: Qalinligi | Eni | Uzunligi | Soni | Kub (avtomatik)
- "+" tugmasi — yangi qator qo'shish
- Pastda: Jami kub (Rossiya) avtomatik hisob

Section 4 — **Yog'och xaridi (RUB):**
- Jami kub × RUB/m³ input = Jami RUB (avtomatik)

Section 5 — **Xarajatlar (USD):**
- NDS | Usluga (2 ustun)
- Tupik | Xrannei (2 ustun)
- Klentga ortish | Yerga tushurish (2 ustun)
- Har biri: summa input + hamkor dropdown (service_provider turi)
- "+ Qo'shimcha xarajat" tugmasi — nom + summa + hamkor

Footer: "Bekor qilish" + "Yaratish" (o'ng pastda)

**SPEC — `WagonTable.tsx`:**
- Ustunlar: # | Vagon raqami | Qayerdan→Qayerga | Jami kub m³ | Status | Taxtalar soni | Amallar
- Status badge ranglari (TZ dan): in_transit=yellow, at_border=orange, arrived=green, unloaded=blue, closed=slate
- Amallar: Tahrirlash | O'chirish | Yopish (closed da ko'rinmaydi)
- Qator bosilganda: yog'ochlar jadvali kengayib ochiladi (accordion)

**SPEC — `TimberTable.tsx`:**
- 6 ustun: Qalinligi | Eni | Uzunligi | Rossiya soni | Toshkent soni | Mijoz soni
- Pastda 3 ta jami: Jami kub Rossiya | Jami kub Toshkent | Jami kub Mijoz
- Toshkent sonini inline edit qilish mumkin

**SPEC — `WagonLog.tsx`:**
- Transport tarixi ro'yxati (sana + action)
- Eng yangi yuqorida

**SPEC — `wagons/page.tsx`:**
- `[+ Vagon yaratish]` va `[+ Yuk mashinasi]` tugmalari (yuqori o'ngda)
- WagonTable render
- WagonModal state boshqaruvi

**CONSTRAINTS:**
- `"use client"` — barcha komponentlar
- DB ni to'g'ridan-to'g'ri import qilma — faqat actions orqali
- Hardcoded matn yo'q — faqat `uz.ts` dan

- [ ] **Step 1:** `Modal.tsx` va `ConfirmDialog.tsx`
- [ ] **Step 2:** `uz.ts` — barcha tarjimalar
- [ ] **Step 3:** `WagonModal.tsx` — dizayn referensga mos
- [ ] **Step 4:** `WagonTable.tsx` — accordion bilan
- [ ] **Step 5:** `TimberTable.tsx` + `WagonLog.tsx`
- [ ] **Step 6:** `wagons/page.tsx` — hammani birlashtirish
- [ ] **Step 7:** `npx tsc --noEmit && npm run build` — 0 xato
- [ ] **Step 8:** Commit: `"feat: vagonlar UI — modal, jadval, timber table"`

---

## Task 5: Kodlar (Backend → Frontend)

**Agent:** Backend Botir → Frontend Farid
**TZ bo'lim:** 2.2

**Files:**
- Create: `src/lib/actions/codes.ts`
- Create: `src/app/(dashboard)/codes/page.tsx`
- Create: `src/app/(dashboard)/codes/_components/` (4 komponent)

**SPEC — Backend (`codes.ts`):**

`getCodeInventory()` — mavjud (available) kodlar, tur + ta'minotchi bo'yicha guruhlangan

`getCodeHistory()` — barcha kod operatsiyalari (sotib olish, ishlatish, sotish)

`buyCode(type, supplierId, quantity)` — omborga kirim:
- `quantity` ta alohida kod yozuvi yaratilsin (har biri alohida ID)
- Ta'minotchi balansi o'zgarmaydi (narx hali yo'q)

`useCodeInTransport(codeId, transportId, buyPricePerTon)` — o'z vagonida ishlatish:
- Kod holati → "used"
- buyCostUsd = tonnaj × buyPricePerTon
- Ta'minotchi balansida qarz paydo bo'ladi (manfiy)
- sellPriceUsd = buyCostUsd (foyda = 0, TZ qoida #4)

`sellCodes({ kzCodeId, uzCodeId, afgonCodeId, customerId, tonnage, buyPrices, sellPrices })`:
- 3 kodning holati → "sold"
- Har biri uchun: ta'minotchi balansida qarz (buy), mijoz balansida qarz (sell)
- Foyda = sell - buy

**SPEC — Frontend:**
- Yuqori qism: mavjud kodlar jadvali (Tur | Soni | Ta'minotchi)
- `[+ Sotib olish]` tugmasi → CodeBuyModal (tur, ta'minotchi, soni)
- `[Mijozga sotish]` tugmasi → CodeSellModal (3 kod tanlash + tonnaj + narxlar)
- Pastki qism: CodeHistory jadval (TZ bo'lim 2.2 dan: sana, tur, amal, ta'minotchi, vagon/mijoz, xarajat, daromad)

- [ ] **Step 1:** Backend — `codes.ts`
- [ ] **Step 2:** Frontend — 4 komponent + page
- [ ] **Step 3:** Build + Commit: `"feat: kodlar moduli"`

---

## Task 6: Hamkorlar (Backend → Frontend)

**Agent:** Backend Botir → Frontend Farid
**TZ bo'lim:** 2.3

**Files:**
- Create: `src/lib/actions/partners.ts`
- Create: `src/app/(dashboard)/partners/page.tsx`
- Create: `src/app/(dashboard)/partners/_components/` (3 komponent)

**SPEC — Backend (`partners.ts`):**

`getPartners(type?)` — barcha yoki filtrlangan hamkorlar

`getPartnerWithBalance(id)` — hamkor + barcha balance yozuvlari + joriy balans yig'indisi

`createPartner({ name, type, phone, notes })` — yangi hamkor

`updatePartner(id, data)` — yangilash

`deletePartner(id)` — o'chirish

`recordPayment({ partnerId, amount, currency, notes, docNumber })` — to'lov:
- partnerBalances ga yozish (musbat — agar biz ulardan qarz oldik; manfiy — agar biz to'ladik)
- cashOperations ga yozish (kassa chiqimi/kirimi)

**SPEC — Frontend:**
- Sidebar da kategoriyalar: 9 tur bo'yicha filter
- Ro'yxat: Ism | Telefon | Balans (musbat=yashil, manfiy=qizil) | Amallar
- Hamkor bosilganda: PartnerDetail (operatsiyalar tarixi + joriy balans + To'lov qilish tugmasi)
- PartnerModal: yangi hamkor qo'shish

- [ ] **Step 1:** Backend — `partners.ts`
- [ ] **Step 2:** Frontend — 3 komponent + page
- [ ] **Step 3:** Build + Commit: `"feat: hamkorlar moduli"`

---

## Task 7: Kassa (Backend → Frontend)

**Agent:** Backend Botir → Frontend Farid
**TZ bo'lim:** 2.4

**Files:**
- Create: `src/lib/actions/cash.ts`
- Create: `src/app/(dashboard)/cash/page.tsx`
- Create: `src/app/(dashboard)/cash/_components/` (3 komponent)

**SPEC — Backend (`cash.ts`):**

`getUsdBalance()` — joriy $ balans (cashOperations yig'indisi, currency=usd)

`getRubState()` — joriy RUB balans + weighted average kurs:
- Formula: `avgRate = totalRub / (Σ amount/rate)`
- Har yangi kirimda qayta hisoblanadi

`getUsdOperations(dateFrom?, dateTo?)` — $ operatsiyalar tarixi

`getRubOperations(dateFrom?, dateTo?)` — RUB operatsiyalar tarixi

`getExchangeHistory()` — faqat ayrboshlash operatsiyalari

`recordExchange({ usdAmount, rubAmount, rate, partnerId })`:
- $ kassasidan chiqim: `amount = -usdAmount`
- RUB kassasiga kirim: `amount = +rubAmount, exchangeRate = rate`
- Partner balansi: pul ayrboshlovchi bilan hisob-kitob

**SPEC — Frontend:**
- 3 tab: `$ Kassasi` | `RUB Kassasi` | `Pul Ayrboshlash`
- $ tab: joriy balans (yirik) + operatsiyalar jadvali (sana, tur, hamkor, kirim, chiqim, balans)
- RUB tab: joriy balans + o'rtacha kurs + operatsiyalar jadvali
- Ayrboshlash tab: tarix jadvali (sana, hamkor, berildi $, olindi RUB, kurs)

- [ ] **Step 1:** Backend — `cash.ts`
- [ ] **Step 2:** Frontend — 3 komponent + page
- [ ] **Step 3:** Build + Commit: `"feat: kassa moduli — 3 bo'lim"`

---

## Task 8: Savdo (Backend → Frontend)

**Agent:** Backend Botir → Frontend Farid
**TZ bo'lim:** 2.5

**Files:**
- Create: `src/lib/actions/sales.ts`
- Create: `src/app/(dashboard)/sales/page.tsx`
- Create: `src/app/(dashboard)/sales/_components/` (3 komponent)

**SPEC — Backend (`sales.ts`):**

`getSales()` — barcha savdolar with: customer, items

`createSale({ customerId, paymentType, items, notes })`:
- items: [{ timberId?, warehouseId?, thicknessMm, widthMm, lengthM, sentCount, pricePerCubicUsd }]
- totalUsd = Σ (kub × pricePerCubic)
- docNumber: 4 xonali avtomatik raqam (TZ qoida #11)
- Status: "sent"

`receiveSale(saleId, items)` — mijoz qabul tasdiqlash:
- Har item uchun receivedCount yangilanadi
- timber.customerCount += receivedCount (TZ: mijoz soni savdolardan yig'iladi)
- Kassaga kirim FAQAT shu qadam da (TZ bo'lim 2.5)
- naqd → cashOperations (income)
- qarz → partnerBalances (mijoz balansida qarz)
- Status: "received"

**SPEC — Frontend:**
- SaleTable: # | Mijoz | Sana | Jami $ | Status | Amallar
- SaleModal: mijoz tanlash → vagondan/ombordan yog'och tanlash → miqdor + narx → to'lov turi
- SaleReceiveModal: jo'natilgan ro'yxat, har biri uchun qabul soni input

- [ ] **Step 1:** Backend — `sales.ts`
- [ ] **Step 2:** Frontend — 3 komponent + page
- [ ] **Step 3:** Build + Commit: `"feat: savdo moduli"`

---

## Task 9: Omborxona (Backend → Frontend)

**Agent:** Backend Botir → Frontend Farid
**TZ bo'lim:** 2.6

**Files:**
- Create: `src/lib/actions/warehouse.ts`
- Create: `src/app/(dashboard)/warehouse/page.tsx`
- Create: `src/app/(dashboard)/warehouse/_components/WarehouseTable.tsx`

**SPEC — Backend (`warehouse.ts`):**

`getWarehouse()` — ombordagi barcha yog'ochlar with: transport

`addToWarehouse(items)` — vagon yopilganda omborga tushurish:
- items: [{ timberId, transportId, thicknessMm, widthMm, lengthM, quantity }]

`getSoldNotFromWarehouse(transportId)` — shu vagondan hali sotilmagan yog'ochlar (vagon yopishda dialog uchun)

**SPEC — Frontend:**
- Jadval: O'lcham | Soni | Qaysi vagondan | Kirgan sana
- Vagon yopilganda dialog: "Sotilmagan yog'ochlar bor. Omborga tushurasizmi?"

**Vagon yopish dialogi** (`WagonTable.tsx` ga qo'shilsin):
1. "Yopish" tugmasi → RUB/m³ narxini so'rash
2. Sotilmagan yog'ochlar borligini tekshirish → omborga tushirish dialogi
3. `closeTransport()` chaqirish

- [ ] **Step 1:** Backend — `warehouse.ts`
- [ ] **Step 2:** Frontend — WarehouseTable + vagon yopish dialogi
- [ ] **Step 3:** Build + Commit: `"feat: omborxona moduli"`

---

## Task 10: Hisobotlar (Backend → Frontend)

**Agent:** Backend Botir → Frontend Farid
**TZ bo'lim:** 2.7, 3.1

**Files:**
- Create: `src/lib/actions/reports.ts`
- Create: `src/app/(dashboard)/reports/page.tsx`
- Create: `src/app/(dashboard)/reports/_components/` (3 komponent)

**SPEC — Backend (`reports.ts`):**

`getWagonReport(dateFrom, dateTo)` — vagonlar foyda/zarar:
- Faqat `closedAt` shu oraliqda bo'lgan vagonlar (TZ qoida #8)
- Har vagon: daromad (savdolar) − xarajatlar = foyda/zarar
- Daromad ombordan sotilganlarni ham o'z ichiga oladi

`getCodeReport(dateFrom, dateTo)` — kod sotuvi foyda/zarar:
- Har operatsiya: sellPrice − buyPrice = foyda

`getCashReport(dateFrom, dateTo)` — kassa holati:
- $ va RUB kirim/chiqim jami

`getOverallReport(dateFrom, dateTo)` — umumiy foyda/zarar

**SPEC — Frontend:**
- 4 tab: Vagonlar | Kodlar | Kassa | Umumiy
- Har tab da: `[Dan]` `[Gacha]` sana filtri
- Jadval + jami qatorda
- `[Excel yuklash]` tugmasi (oddiy CSV export)

- [ ] **Step 1:** Backend — `reports.ts`
- [ ] **Step 2:** Frontend — 3 komponent + page
- [ ] **Step 3:** Build + Commit: `"feat: hisobotlar moduli"`

---

## Task 11: Dashboard

**Agent:** Frontend Farid
**TZ bo'lim:** 2.8

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**SPEC:**
- `getUsdBalance()`, `getRubState()` — kassa balanslari (yirik raqam, yuqorida)
- `getActiveTransports()` — aktiv vagonlar soni va holati (status badge lar)
- Jami qarzdorlik: kimlar bizga qarz (yashil) / biz kimlarga qarz (qizil)
- Shu oydagi savdolar jami summasi
- So'nggi 5 ta operatsiya ro'yxati

- [ ] **Step 1:** Dashboard UI + data fetching
- [ ] **Step 2:** Build + Commit: `"feat: dashboard"`

---

## Deploy (har task keyin)

```bash
ssh root@194.163.157.44 "cd /root/akmalaka && git pull && npm install && npm run build && pm2 restart wood-erp"
```

---

## Tekshirish checklistlari

### Har task da — Reviewer Ravshan:
- [ ] Barcha SPEC talablari bajarilganmi?
- [ ] Ortiqcha narsa qo'shilmadimi (YAGNI)?
- [ ] Fayllar to'g'ri joylashtirilganmi?

### Moliyaviy tasklarda — Bughunter Bahodir:
- [ ] **TZ qoida #1:** Kod = `tonnaj × $/t` (kub EMAS)
- [ ] **TZ qoida #2:** Ta'minotchi to'lovi = Toshkent kub bo'yicha
- [ ] **TZ qoida #3:** RUB→$ = weighted average kurs
- [ ] **TZ qoida #7:** Qarz operatsiyasi kassaga ta'sir qilmaydi
- [ ] **TZ qoida #10:** Manfiy RUB qoldiriga ruxsat yo'q
- [ ] **TZ qoida #11:** Hujjat raqami 4 xonali
- [ ] Double-entry: har operatsiya ham kassada, ham hamkor balansida
