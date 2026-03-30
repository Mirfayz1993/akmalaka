# Ombor Backfill + Payment UX + Kassa Delete — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Mavjud yopiq vagonlardan qolgan taxtalarni omborga backfill qilish. (2) PaymentModal da yo'nalish (biz to'ladik / ular to'ladi) aniq ko'rsatilsin. (3) Kassada noto'g'ri kiritilgan operatsiyalarni o'chirish imkoni qo'shilsin.

**Architecture:** Uch mustaqil task. Backend: warehouse.ts ga backfill action + cash.ts ga delete action. Frontend: PaymentModal direction buttons + UsdTab delete button.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/lib/actions/warehouse.ts` | MODIFY — `backfillWarehouseFromClosedWagons()` qo'shish |
| `src/app/(dashboard)/warehouse/page.tsx` | MODIFY — page load da backfill chaqirish |
| `src/lib/actions/cash.ts` | MODIFY — `deleteCashOperation(id)` qo'shish |
| `src/app/(dashboard)/cash/_components/UsdTab.tsx` | MODIFY — har qatorda o'chirish tugmasi |
| `src/app/(dashboard)/cash/page.tsx` | MODIFY — delete handler + UsdTab ga prop uzatish |
| `src/app/(dashboard)/partners/_components/PaymentModal.tsx` | MODIFY — direction buttons ("Biz to'ladik" / "Ular to'ladi") |

---

## Task 1: Ombor Backfill — Backend

**Agent:** Backend Botir

**Files:**
- Modify: `src/lib/actions/warehouse.ts`
- Modify: `src/app/(dashboard)/warehouse/page.tsx`

**CONTEXT:**

`closeTransport` endi yangi yopilgan vagonlar uchun `addToWarehouse` chaqiradi. Lekin mavjud 2 ta yopiq vagon (11111111, 10 C 183 AB) oldin yopilgan — ularning taxtalar omborga tushmagan.

`warehouse` jadvalida `timberId` ustuni bor — buni ishlatib duplicate tekshiramiz.

`warehouse.ts` da mavjud funksiyalar:
- `addToWarehouse(items)` — batch insert
- `getWarehouse()` — list
- `getSoldNotFromWarehouse(transportId)` — helper

**SPEC:**

### `src/lib/actions/warehouse.ts` ga qo'shish:

```typescript
export async function backfillWarehouseFromClosedWagons() {
  // Barcha yopiq transportlarni timbers bilan ol
  const closedTransports = await db.query.transports.findMany({
    where: eq(transports.status, "closed"),
    with: { timbers: true },
  });

  // Omborga allaqachon tushirilgan timberId lar
  const existingWarehouseItems = await db.query.warehouse.findMany();
  const existingTimberIds = new Set(
    existingWarehouseItems.map((w) => w.timberId).filter(Boolean)
  );

  const itemsToAdd: {
    timberId: number;
    transportId: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: number;
    quantity: number;
  }[] = [];

  for (const transport of closedTransports) {
    for (const t of transport.timbers) {
      if (existingTimberIds.has(t.id)) continue; // allaqachon bor
      const remaining = (t.tashkentCount ?? 0) - (t.customerCount ?? 0);
      if (remaining <= 0) continue;
      itemsToAdd.push({
        timberId: t.id,
        transportId: transport.id,
        thicknessMm: t.thicknessMm,
        widthMm: t.widthMm,
        lengthM: parseFloat(t.lengthM),
        quantity: remaining,
      });
    }
  }

  if (itemsToAdd.length > 0) {
    await addToWarehouse(itemsToAdd);
  }
}
```

**Import kerak:** `transports` from `@/db/schema`, `eq` from `drizzle-orm`

### `src/app/(dashboard)/warehouse/page.tsx`:

Sahifa `"use server"` server component. Mavjud `getWarehouse()` chaqiruvidan OLDIN backfill qo'shiladi:

```typescript
import { getWarehouse, backfillWarehouseFromClosedWagons } from "@/lib/actions/warehouse";

export default async function WarehousePage() {
  await backfillWarehouseFromClosedWagons(); // idempotent — har safar tekshiradi
  const items = await getWarehouse();
  // ... qolgan kod o'zgarmaydi
}
```

**CONSTRAINTS:**
- `backfillWarehouseFromClosedWagons` idempotent — har safar chaqirilsa ham duplicate yaratmaydi (timberId tekshiruvi bor)
- `addToWarehouse` ichida `revalidatePath("/warehouse")` bor — qo'shimcha revalidate kerak emas

- [ ] **Step 1:** `backfillWarehouseFromClosedWagons` funksiyasini `warehouse.ts` ga qo'shish
- [ ] **Step 2:** `warehouse/page.tsx` ni o'qib, backfill chaqiruvini qo'shish
- [ ] **Step 3:** `npx tsc --noEmit` — 0 xato

---

## Task 2: Kassa Delete — Backend + Frontend

**Agent:** Backend Botir (backend), keyin Frontend Farid (frontend)

**Files:**
- Modify: `src/lib/actions/cash.ts`
- Modify: `src/app/(dashboard)/cash/_components/UsdTab.tsx`
- Modify: `src/app/(dashboard)/cash/page.tsx`

**CONTEXT:**

Foydalanuvchi hamkorlar bo'limidan "To'lov qilish" orqali noto'g'ri Kirim operatsiyalar kiritib qo'ygan. Kassada o'chirish tugmasi yo'q — xatoni tuzatib bo'lmaydi.

`cashOperations` jadvalida `id` ustuni bor (serial primary key).

**BACKEND SPEC:**

### `src/lib/actions/cash.ts` ga qo'shish:

```typescript
export async function deleteCashOperation(id: number) {
  await db.delete(cashOperations).where(eq(cashOperations.id, id));
  revalidatePath("/cash");
}
```

Import: `eq` allaqachon import qilingan, `cashOperations` ham bor.

**FRONTEND SPEC:**

### `UsdTab.tsx` o'zgartirish:

Props ga `onDelete` qo'shish:
```typescript
interface UsdTabProps {
  balance: number;
  operations: UsdOperation[];
  onAddOperation: () => void;
  onDelete: (id: number) => void; // YANGI
}
```

Har bir qator uchun o'chirish tugmasi (Amallar ustunida, yoki qatorning oxirida):
```tsx
// Har bir <tr> ichida, oxirgi <td> dan keyin yoki ichida:
<td className="px-4 py-3 text-right">
  <button
    onClick={() => onDelete(op.id)}
    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
    title="O'chirish"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  </button>
</td>
```

Thead ga ham "O'chirish" ustuni sarlavhasi qo'shiladi (bo'sh `<th>`).

### `cash/page.tsx` o'zgartirish:

```typescript
import { deleteCashOperation } from "@/lib/actions/cash";

// handleDeleteUsd funksiyasi:
async function handleDeleteUsd(id: number) {
  await deleteCashOperation(id);
  await loadData();
}

// UsdTab ga:
<UsdTab
  balance={usdBalance}
  operations={usdOperations}
  onAddOperation={openUsdModal}
  onDelete={handleDeleteUsd}
/>
```

**CONSTRAINTS:**
- Faqat `UsdTab` ga o'chirish qo'shiladi (RubTab ham kerak bo'lsa keyingi task)
- Confirm dialog qo'shilmaydi (foydalanuvchi o'zi biladi)

- [ ] **Step 1:** `deleteCashOperation(id)` ni `cash.ts` ga qo'shish
- [ ] **Step 2:** `UsdTab.tsx` props ga `onDelete` qo'shish va har qatorda o'chirish tugmasi
- [ ] **Step 3:** `cash/page.tsx` da `handleDeleteUsd` + `UsdTab` ga prop uzatish
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato

---

## Task 3: PaymentModal UX — Frontend

**Agent:** Frontend Farid

**Files:**
- Modify: `src/app/(dashboard)/partners/_components/PaymentModal.tsx`

**CONTEXT:**

Hozirgi holat: foydalanuvchi "Musbat (+) = ular bizga to'ladi. Manfiy (-) = biz ularga to'ladik" degan izohni o'qimay, musbat son kiritib qo'ymoqda. Natijada kassada noto'g'ri Kirim yozuvi paydo bo'lyapti.

`recordPayment` backendi to'g'ri ishlaydi:
- `amount > 0` → income (ular bizga to'ladi)
- `amount < 0` → expense (biz ularga to'ladik)

Faqat UI o'zgaradi — backend o'zgarmaydi.

**SPEC:**

Amount input ni olib tashlash va uning o'rniga:
1. **Direction buttons** — "Biz to'ladik" (chiqim) / "Ular to'ladi" (kirim)
2. **Musbat summa input** — foydalanuvchi har doim musbat son kiritadi
3. Ichida: direction === "pay" bo'lsa `amount = -numAmount`, direction === "receive" bo'lsa `amount = numAmount`

```typescript
// State o'zgarishi:
const [direction, setDirection] = useState<"pay" | "receive">("pay");
const [amount, setAmount] = useState("");
// currency, description, docNumber — o'zgarmaydi
```

```tsx
{/* Direction buttons — amount input DAN OLDIN */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    To'lov yo'nalishi <span className="text-red-500">*</span>
  </label>
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => setDirection("pay")}
      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
        direction === "pay"
          ? "bg-red-50 border-red-500 text-red-700"
          : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
    >
      ↑ Biz to'ladik
    </button>
    <button
      type="button"
      onClick={() => setDirection("receive")}
      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
        direction === "receive"
          ? "bg-green-50 border-green-500 text-green-700"
          : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
    >
      ↓ Ular to'ladi
    </button>
  </div>
</div>

{/* Amount — izoh o'chiriladi, musbat son */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Summa <span className="text-red-500">*</span>
  </label>
  <input
    type="number"
    value={amount}
    onChange={(e) => setAmount(e.target.value)}
    placeholder="0.00"
    step="0.01"
    min="0"
    required
    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
  />
</div>
```

`handleSubmit` da:
```typescript
const signedAmount = direction === "pay" ? -numAmount : numAmount;
await recordPayment({
  partnerId: partner.id,
  amount: signedAmount, // manfiy = biz to'ladik, musbat = ular to'ladi
  currency,
  description: description.trim() || undefined,
  docNumber: docNumber.trim() || undefined,
});
```

`handleClose` da `direction` ni reset qilish:
```typescript
setDirection("pay");
```

**CONSTRAINTS:**
- `recordPayment` backend o'zgarmaydi
- Default direction = "pay" (ko'pincha biz to'laymiz)
- Eski izoh `"Musbat (+) = ular bizga to'ladi..."` olib tashlanadi

- [ ] **Step 1:** `direction` state qo'shish, direction buttons render qilish
- [ ] **Step 2:** `handleSubmit` da `signedAmount` ishlatish
- [ ] **Step 3:** `handleClose` da direction reset
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Omborxona sahifasini ochish → mavjud yopiq vagonlardan qolgan taxtalar ko'rinadi
- [ ] Kassada har bir qatorda o'chirish tugmasi ko'rinadi, bosib o'chirish mumkin
- [ ] Hamkorlar → "To'lov qilish" → "Biz to'ladik" tanlash → $100 kiritish → Kassada Chiqim ko'rinadi
- [ ] Hamkorlar → "To'lov qilish" → "Ular to'ladi" tanlash → $100 kiritish → Kassada Kirim ko'rinadi
- [ ] `npx tsc --noEmit` — 0 xato
