# Wood ERP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rossiya-O'zbekiston yog'och savdo ERP tizimini to'liq ishga tushirish

**Architecture:** Next.js 16 App Router + Drizzle ORM + PostgreSQL. Server Actions orqali CRUD. Zustand orqali client state. i18n (uz/ru).

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Zustand, Lucide React

---

## Rollar taqsimoti

| Rol | Vazifasi | Model |
|-----|----------|-------|
| **PM (Controller)** | Tasklar taqsimlash, natijalarni tekshirish, context berish | Opus (asosiy session) |
| **Backend Developer** | API routes, server actions, database CRUD, business logic | Sonnet (implementer subagent) |
| **Frontend Developer** | UI sahifalar, formalar, jadvallar, komponentlar | Sonnet (implementer subagent) |
| **Spec Reviewer** | Spec bo'yicha tekshirish — spec ga mos keladi yoki yo'q | Haiku (reviewer subagent) |
| **Code Quality Reviewer** | Kod sifati, xavfsizlik, pattern, test | Sonnet (reviewer subagent) |

## Ish tartibi (har bir task uchun)

```
PM → Backend Dev (implement) → Spec Reviewer → Code Quality Reviewer → ✅
PM → Frontend Dev (implement) → Spec Reviewer → Code Quality Reviewer → ✅
```

---

## File Structure

```
src/
├── db/
│   ├── schema.ts          ← ✅ DONE (13 jadval)
│   └── index.ts           ← ✅ DONE (PostgreSQL connection)
├── lib/
│   ├── actions/           ← Server Actions (CRUD)
│   │   ├── partners.ts
│   │   ├── clients.ts
│   │   ├── shipments.ts
│   │   ├── wagons.ts
│   │   ├── timber.ts
│   │   ├── customs-codes.ts
│   │   ├── code-sales.ts
│   │   ├── expenses.ts
│   │   ├── sales.ts
│   │   ├── cash.ts
│   │   ├── debts.ts
│   │   ├── debt-payments.ts
│   │   └── currency.ts
│   └── utils.ts           ← Kub hisoblash, valyuta konvertatsiya
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx    ← ✅ DONE
│   └── ui/
│       ├── DataTable.tsx  ← Umumiy jadval komponent
│       ├── FormModal.tsx  ← Umumiy forma modal
│       ├── StatusBadge.tsx
│       ├── CurrencyDisplay.tsx
│       └── ConfirmDialog.tsx
├── i18n/                  ← ✅ DONE (uz.ts, ru.ts)
└── app/(dashboard)/
    ├── layout.tsx         ← ✅ DONE
    ├── page.tsx           ← ✅ DONE (dashboard)
    ├── partners/page.tsx  ← CRUD sahifa
    ├── clients/page.tsx
    ├── purchases/page.tsx ← Partiya + vagonlar
    ├── wagons/page.tsx    ← Vagon + taxtalar
    ├── codes/page.tsx     ← Bojxona kodlari + sotish
    ├── warehouse/page.tsx ← Ombor qoldig'i
    ├── sales/page.tsx     ← Sotish + to'lov
    ├── cash/page.tsx      ← Kassa kirim/chiqim
    ├── debts/page.tsx     ← Qarz daftar + to'lov
    ├── currency/page.tsx  ← Valyuta kurslari
    ├── reports/page.tsx   ← Hisobotlar
    └── logistics/page.tsx ← Vagon holatlari
```

---

## Task 1: Umumiy UI komponentlar (Frontend)

**Rol: Frontend Developer**

**Files:**
- Create: `src/components/ui/DataTable.tsx`
- Create: `src/components/ui/FormModal.tsx`
- Create: `src/components/ui/StatusBadge.tsx`
- Create: `src/components/ui/CurrencyDisplay.tsx`
- Create: `src/components/ui/ConfirmDialog.tsx`

**Spec:**
- [ ] DataTable: sortable, filterable, responsive jadval. Props: columns, data, onEdit, onDelete
- [ ] FormModal: dialog/modal forma. Props: title, isOpen, onClose, children
- [ ] StatusBadge: rangli status ko'rsatkich (in_transit=sariq, arrived=yashil, ...)
- [ ] CurrencyDisplay: valyuta formatlash ($1,234.56 / ₽89,000 / 12,500,000 UZS)
- [ ] ConfirmDialog: o'chirish tasdiqlash dialogu

---

## Task 2: Utility funksiyalar (Backend)

**Rol: Backend Developer**

**Files:**
- Create: `src/lib/utils.ts`

**Spec:**
- [ ] `calculateCubicMeters(widthMm, thicknessMm, lengthM, quantity)` → m³
  - Formula: (width/1000) * (thickness/1000) * length * quantity
- [ ] `convertRubToUsd(amountRub, rate)` → USD
- [ ] `convertUzsToUsd(amountUzs, rate)` → USD
- [ ] `formatCurrency(amount, currency)` → formatted string
- [ ] `formatDate(date)` → localized date string

---

## Task 3: Sheriklar CRUD (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/partners.ts`

**Spec:**
- [ ] `getPartners()` — barcha sheriklar ro'yxati
- [ ] `getPartner(id)` — bitta sherik
- [ ] `createPartner(data)` — yangi sherik
- [ ] `updatePartner(id, data)` — tahrirlash
- [ ] `deletePartner(id)` — o'chirish

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/partners/page.tsx`

**Spec:**
- [ ] Sheriklar jadvali (ism, telefon, joylashuv)
- [ ] "Qo'shish" tugmasi → FormModal
- [ ] Tahrirlash va o'chirish tugmalari
- [ ] Forma: name*, phone, location, notes

---

## Task 4: Mijozlar CRUD (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/clients.ts`

**Spec:**
- [ ] `getClients()` — barcha mijozlar (qarz summasi bilan)
- [ ] `getClient(id)` — bitta mijoz (sotuvlar + qarzlar bilan)
- [ ] `createClient(data)` — yangi mijoz
- [ ] `updateClient(id, data)` — tahrirlash
- [ ] `deleteClient(id)` — o'chirish

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/clients/page.tsx`

**Spec:**
- [ ] Mijozlar jadvali (ism, telefon, manzil, jami qarz)
- [ ] Mijoz sahifasi: sotuvlar va qarzlar tarixi
- [ ] "Qo'shish" tugmasi → FormModal
- [ ] Qarz bo'lsa — qizil rangda ko'rsatish

---

## Task 5: Valyuta kurslari (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/currency.ts`

**Spec:**
- [ ] `getCurrencyRates()` — barcha kurslar (sanaga ko'ra)
- [ ] `getLatestRate()` — eng oxirgi kurs
- [ ] `createCurrencyRate(data)` — yangi kurs kiritish
- [ ] `updateCurrencyRate(id, data)` — tahrirlash

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/currency/page.tsx`

**Spec:**
- [ ] Kurslar jadvali (sana, USD/RUB, USD/UZS)
- [ ] "Yangi kurs" tugmasi
- [ ] Eng oxirgi kursni yuqorida ko'rsatish

---

## Task 6: Partiyalar (Shipments) CRUD (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/shipments.ts`

**Spec:**
- [ ] `getShipments()` — barcha partiyalar (sherik, vagonlar soni, status bilan)
- [ ] `getShipment(id)` — partiya tafsilotlari (vagonlar, xarajatlar bilan)
- [ ] `createShipment(data)` — yangi partiya (sherik tanlash, kurs kiritish)
- [ ] `updateShipment(id, data)` — tahrirlash
- [ ] `updateShipmentStatus(id, status)` — status o'zgartirish

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/purchases/page.tsx`

**Spec:**
- [ ] Partiyalar jadvali (nomi, sherik, sana, kurs, status, vagonlar soni)
- [ ] StatusBadge: in_transit/at_border/arrived/distributed
- [ ] "Yangi partiya" tugmasi → FormModal (sherik select, kurs, sana)
- [ ] Partiyani bosganda → tafsilot (vagonlar ro'yxati)

---

## Task 7: Vagonlar + Taxtalar (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/wagons.ts`
- Create: `src/lib/actions/timber.ts`

**Spec:**
- [ ] `getWagons(shipmentId)` — partiyaning vagonlari
- [ ] `createWagon(data)` — yangi vagon (raqam, transport, tushirish narxi)
- [ ] `updateWagon(id, data)` — tahrirlash
- [ ] `addTimber(wagonId, data)` — vagonga taxta qo'shish
  - widthMm, thicknessMm, lengthM, quantity, pricePerCubicRub kiritiladi
  - cubicMeters va pricePerCubicUsd avtomatik hisoblanadi (partiya kursidan)
  - remainingQuantity = quantity (boshlang'ich)
- [ ] `updateTimber(id, data)` — tahrirlash
- [ ] `deleteTimber(id)` — o'chirish
- [ ] Vagonga taxta qo'shilganda totalCubicMeters avtomatik yangilansin

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/wagons/page.tsx`

**Spec:**
- [ ] Vagon ro'yxati (raqam, jami kub, status, taxtalar soni)
- [ ] Vagon tafsilot: taxtalar jadvali (o'lcham, soni, kub, narx ₽, narx $)
- [ ] "Taxta qo'shish" tugmasi → Forma (width, thickness, length, qty, price)
- [ ] Kub avtomatik hisoblanib ko'rsatilsin
- [ ] Jami kub va jami narx ko'rsatilsin

---

## Task 8: Bojxona kodlari + Kod sotish (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/customs-codes.ts`
- Create: `src/lib/actions/code-sales.ts`

**Spec:**
- [ ] `getCustomsCodes(wagonId?)` — kodlar ro'yxati
- [ ] `createCustomsCode(data)` — kod qo'shish (chegara, kub, narx)
- [ ] `sellCode(codeId, data)` — ortiqcha kodni sotish
  - profit = saleAmount - (costUsd * soldCubic / totalCubic)
  - code status → "sold" (to'liq sotilsa) yoki "active" (qisman)
- [ ] `getCodeSales()` — sotilgan kodlar tarixi

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/codes/page.tsx`

**Spec:**
- [ ] Kodlar jadvali (chegara, vagon, kub, narx, status)
- [ ] "Kod qo'shish" tugmasi → Forma
- [ ] "Sotish" tugmasi → Xaridor, kub, narx kiritish
- [ ] Foyda avtomatik hisoblansin
- [ ] Sotilgan kodlar tarixi pastda

---

## Task 9: Xarajatlar (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/expenses.ts`

**Spec:**
- [ ] `getExpenses(wagonId?, shipmentId?)` — xarajatlar
- [ ] `createExpense(data)` — xarajat qo'shish (kategoriya, summa, izoh)
- [ ] `updateExpense(id, data)` — tahrirlash
- [ ] `deleteExpense(id)` — o'chirish
- [ ] Kassaga avtomatik chiqim yozilsin

**Frontend:** Xarajatlar Vagon tafsilotida va Purchases sahifasida ko'rinadi (alohida sahifa shart emas)

---

## Task 10: Sotish (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/sales.ts`

**Spec:**
- [ ] `getSales()` — barcha sotuvlar (mijoz, taxta, kub, summa)
- [ ] `createSale(data)` — yangi sotuv
  - mijoz tanlash, taxta tanlash (mavjud ombordan)
  - quantity, pricePerCubicUsd kiritiladi
  - cubicMeters va totalAmountUsd avtomatik hisoblanadi
  - wagonTimber.remainingQuantity kamaytiriladi
  - **To'lov turi:** to'liq → kassaga kirim | qisman → kassaga kirim + qarzga | qarzga → faqat qarz
- [ ] `deleteSale(id)` — bekor qilish (ombor qaytariladi)

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/sales/page.tsx`

**Spec:**
- [ ] Sotuvlar jadvali (sana, mijoz, taxta o'lcham, kub, narx, jami, to'lov turi)
- [ ] "Yangi sotuv" → Katta forma:
  1. Mijoz tanlash (select)
  2. Taxta tanlash (mavjud ombordan — vagon, o'lcham, qolgan kub)
  3. Soni kiritish (max = remainingQuantity)
  4. Narx kiritish ($/kub)
  5. To'lov turi tanlash (to'liq / qisman / qarzga)
  6. Agar qisman → qancha to'lashini kiritish
- [ ] Jami avtomatik hisoblansin

---

## Task 11: Kassa (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/cash.ts`

**Spec:**
- [ ] `getCashOperations(filter?)` — kirim/chiqim ro'yxati
- [ ] `getCashBalance()` — valyutalar bo'yicha balans {USD, RUB, UZS}
- [ ] `createCashOperation(data)` — yangi operatsiya (kirim/chiqim)
- [ ] Sotuv, qarz to'lov, xarajat operatsiyalari avtomatik yaratilsin

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/cash/page.tsx`

**Spec:**
- [ ] Balans kartochkalari: USD, RUB, UZS (yuqorida)
- [ ] Kirim/chiqim jadvali (sana, tur, kategoriya, summa, valyuta, izoh)
- [ ] Filtr: kirim/chiqim, valyuta, sana oralig'i
- [ ] "Yangi operatsiya" tugmasi

---

## Task 12: Qarz daftar + To'lovlar (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/debts.ts`
- Create: `src/lib/actions/debt-payments.ts`

**Spec:**
- [ ] `getDebts(clientId?)` — qarzlar ro'yxati
- [ ] `createDebt(data)` — yangi qarz (sotuv bilan bog'liq)
- [ ] `makePayment(debtId, data)` — to'lov qilish
  - amount, currency, paymentMethod kiritiladi
  - UZS bo'lsa → exchangeRate kiritiladi → amountInUsd hisoblanadi
  - debt.paidAmountUsd += amountInUsd
  - debt.remainingAmountUsd = totalAmountUsd - paidAmountUsd
  - status: remaining == 0 → "paid", 0 < remaining < total → "partially_paid"
  - Kassaga avtomatik kirim yozilsin

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/debts/page.tsx`

**Spec:**
- [ ] Jami qarz summasi (yuqorida katta raqam bilan)
- [ ] Qarzlar jadvali (mijoz, jami, to'langan, qolgan, status)
- [ ] StatusBadge: active=qizil, partially_paid=sariq, paid=yashil
- [ ] "To'lov" tugmasi → Forma (summa, valyuta, kurs, usul)
- [ ] **Mijoz sahifasidan ham to'lov qilish imkoni** (clients → debt → pay)
- [ ] **Kassadan ham to'lov qilish imkoni** (cash → debt_payment)

---

## Task 13: Ombor (Frontend)

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/warehouse/page.tsx`

**Spec:**
- [ ] Ombordagi taxtalar jadvali (vagon, o'lcham, jami, qolgan, %)
- [ ] Filtr: faqat qolgan > 0
- [ ] Jami ombor qoldig'i kubda
- [ ] Vagon bo'yicha guruhlash

---

## Task 14: Logistika (Frontend)

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/logistics/page.tsx`

**Spec:**
- [ ] Yo'ldagi vagonlar — Kanban board (in_transit → at_border → arrived → unloaded)
- [ ] Drag & drop yoki tugma bilan status o'zgartirish
- [ ] Har vagon uchun: raqam, partiya, kub, kodlar holati

---

## Task 15: Hisobotlar (Backend + Frontend)

**Rol: Backend Developer**
**Files:**
- Create: `src/lib/actions/reports.ts`

**Spec:**
- [ ] `getShipmentProfitReport(shipmentId)` — partiya foyda/zarar hisobi
  - Daromad: sotuvlar + kod sotish
  - Xarajat: xarid narxi + transport + tushirish + kodlar + sherik + boshqa
  - Foyda = Daromad - Xarajat
- [ ] `getDebtReport()` — jami qarzlar, mijoz bo'yicha
- [ ] `getWarehouseReport()` — ombor qoldig'i
- [ ] `getOverallReport(dateFrom, dateTo)` — umumiy foyda/zarar

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/reports/page.tsx`

**Spec:**
- [ ] Tab navigatsiya: Foyda/Zarar | Qarzlar | Ombor | Umumiy
- [ ] Har tab uchun jadval + jami raqamlar
- [ ] Partiya tanlash (foyda/zarar uchun)
- [ ] Sana oralig'i filtr (umumiy uchun)

---

## Task 16: Dashboard (Frontend)

**Rol: Frontend Developer**
**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Spec:**
- [ ] Statistik kartochkalar (real ma'lumotlar bilan):
  - Yo'ldagi partiyalar soni
  - Ombordagi jami kub
  - Jami qarz
  - Oylik daromad
  - Kassa balansi (USD)
  - Faol mijozlar soni
- [ ] Oxirgi operatsiyalar ro'yxati
- [ ] Yo'ldagi vagonlar holati

---

## Execution Order

```
1. Task 1 (UI komponentlar) — barcha sahifalar uchun asos
2. Task 2 (Utils) — barcha hisoblashlar uchun asos
3. Task 3 (Sheriklar) — oddiy CRUD, warm-up
4. Task 4 (Mijozlar) — oddiy CRUD
5. Task 5 (Valyuta) — kurslar kerak bo'ladi
6. Task 6 (Partiyalar) — asosiy modul
7. Task 7 (Vagonlar + Taxtalar) — asosiy modul
8. Task 8 (Kodlar) — partiyaga bog'liq
9. Task 9 (Xarajatlar) — partiyaga bog'liq
10. Task 10 (Sotish) — ombor + mijoz + kassa
11. Task 11 (Kassa) — barcha moliya operatsiyalari
12. Task 12 (Qarz daftar) — sotish + kassa bilan bog'liq
13. Task 13 (Ombor) — read-only, timber dan oladi
14. Task 14 (Logistika) — vagonlar statusi
15. Task 15 (Hisobotlar) — barcha ma'lumotlardan
16. Task 16 (Dashboard) — barcha modullardan statistika
```
