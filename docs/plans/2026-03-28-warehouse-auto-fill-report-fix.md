# Omborxona Auto-To'ldirish + Hisobot Xarajat Tuzatish — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vagon yopilganda qolgan taxtalar omborga avtomatik tushsin; hisobotda RUB xarid narxi ($) va truck to'lovi ham zarar hisoblashga kirsin.

**Architecture:** (1) `closeTransport` da transaction tugagandan keyin mavjud `addToWarehouse` helper chaqiriladi. (2) `getWagonReport` da `timbers` JOIN qo'shiladi, rubCostUsd va truckCost hisoblanib `profit` dan ayiriladi.

**Tech Stack:** Next.js 15 · TypeScript · Drizzle ORM · PostgreSQL

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/lib/actions/wagons.ts` | MODIFY — `closeTransport` ga `addToWarehouse` chaqiruvi qo'shish |
| `src/lib/actions/reports.ts` | MODIFY — `getWagonReport` ga timbers JOIN + rubCostUsd + truckCost |

---

## Task 1: `wagons.ts` — closeTransport ga omborxona qo'shish

**Agent:** Frontend Farid
**Files:**
- Modify: `src/lib/actions/wagons.ts`

**CONTEXT:**

`closeTransport` (line 226) hozir DB transaction yopilgandan keyin faqat `revalidatePath` chaqiradi. Omborga hech narsa yozmaydi.

`addToWarehouse` (`src/lib/actions/warehouse.ts`) allaqachon mavjud:
```typescript
export async function addToWarehouse(items: {
  timberId?: number;
  transportId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;  // number tipida, ichida String() ga o'giriladi
  quantity: number;
}[])
```

**SPEC:**

### 1. Import qo'shish (fayl boshida, boshqa importlar bilan):
```typescript
import { addToWarehouse } from "./warehouse";
```

### 2. `closeTransport` da transaction tugagandan KEYIN, `revalidatePath` DAN OLDIN qo'shish:

Hozirgi holat (line 334-337):
```typescript
  });

  revalidatePath("/wagons");
  return { totalRub, totalUsd, avgRate };
```

O'zgarish keyin (transaction `});` va `revalidatePath` orasiga):
```typescript
  });

  // Omborga qolgan taxtalarni yozish: tashkentCount - customerCount > 0 bo'lganlar
  const warehouseItems = transport.timbers
    .filter((t) => (t.tashkentCount ?? 0) - (t.customerCount ?? 0) > 0)
    .map((t) => ({
      timberId: t.id,
      transportId: transport.id,
      thicknessMm: t.thicknessMm,
      widthMm: t.widthMm,
      lengthM: parseFloat(t.lengthM),
      quantity: (t.tashkentCount ?? 0) - (t.customerCount ?? 0),
    }));

  if (warehouseItems.length > 0) {
    await addToWarehouse(warehouseItems);
  }

  revalidatePath("/wagons");
  return { totalRub, totalUsd, avgRate };
```

**CONSTRAINTS:**
- `addToWarehouse` ichida ham `revalidatePath("/warehouse")` chaqiriladi — bu OK, takrorlash kerak emas
- `transport.timbers` allaqachon yuqorida `db.query.transports.findFirst({ with: { timbers: true } })` orqali olingan — qo'shimcha query kerak emas
- Agar barcha taxtalar mijozlarga yetkazilgan bo'lsa (qolmagan), omborga yozilmaydi

- [ ] **Step 1:** `import { addToWarehouse } from "./warehouse";` qo'shish
- [ ] **Step 2:** Transaction `});` dan keyin, `revalidatePath` dan oldin warehouse insert logikasi qo'shish
- [ ] **Step 3:** `npx tsc --noEmit` — 0 xato tekshirish

---

## Task 2: `reports.ts` — getWagonReport xarajatlar tuzatish

**Agent:** Frontend Farid (Task 1 dan keyin)
**Files:**
- Modify: `src/lib/actions/reports.ts`

**CONTEXT:**

Hozirgi `getWagonReport` (line 9-75) `transports` ni timbers SIFATSIZ oladi:
```typescript
const closedTransports = await db.query.transports.findMany({
  where: and(...conditions),
  orderBy: (t, { desc }) => [desc(t.closedAt)],
});
```

Va `profit = revenue - expenses - codeExpense` — bu formula 2 ta xarajatni o'tkazib yuboradi:

1. **RUB xarid narxi ($):** `rubPricePerCubic × totalTashkentCub / rubExchangeRate`
   - `rubPricePerCubic` — transport ustunida (numeric string)
   - `rubExchangeRate` — transport ustunida (transport yopilganda saqlanadi)
   - `totalTashkentCub` — transport timbers dan hisoblanadi

2. **Truck to'lovi:** `truckOwnerPayment`
   - `truckOwnerPayment` — transport ustunida (numeric string, USD)
   - Wagon tipida `null`, truck tipida summa bo'ladi

**SPEC:**

### 1. `findMany` ga `with: { timbers: true }` qo'shish:
```typescript
const closedTransports = await db.query.transports.findMany({
  where: and(...conditions),
  with: { timbers: true },
  orderBy: (t, { desc }) => [desc(t.closedAt)],
});
```

### 2. `return closedTransports.map(...)` ichida rubCostUsd va truckCost hisoblash:

Hozirgi (line 46-74):
```typescript
return closedTransports.map((t) => {
  const expenses = ...;
  const tonnage = parseFloat(t.tonnage ?? "0");
  const codeExpense = ...;
  const revenue = revenueMap.get(t.id) ?? 0;
  const profit = revenue - expenses - codeExpense;

  return {
    wagonId: t.id,
    number: t.number,
    closedAt: t.closedAt,
    revenue,
    expenses,
    codeExpense,
    profit,
  };
});
```

Yangi holat (`codeExpense` dan keyin qo'shish):
```typescript
return closedTransports.map((t) => {
  const expenses =
    parseFloat(t.expenseNds ?? "0") +
    parseFloat(t.expenseUsluga ?? "0") +
    parseFloat(t.expenseTupik ?? "0") +
    parseFloat(t.expenseXrannei ?? "0") +
    parseFloat(t.expenseOrtish ?? "0") +
    parseFloat(t.expenseTushurish ?? "0");

  const tonnage = parseFloat(t.tonnage ?? "0");
  const codeExpense =
    parseFloat(t.codeUzPricePerTon ?? "0") * tonnage +
    parseFloat(t.codeKzPricePerTon ?? "0") * tonnage;

  // RUB xarid narxi USD da
  const rubPricePerCubic = parseFloat(t.rubPricePerCubic ?? "0");
  const rubExchangeRate = parseFloat(t.rubExchangeRate ?? "0");
  const totalTashkentCub = t.timbers.reduce((sum, tb) => {
    const tashkentCount = tb.tashkentCount ?? 0;
    return (
      sum +
      (tb.thicknessMm / 1000) *
        (tb.widthMm / 1000) *
        parseFloat(tb.lengthM) *
        tashkentCount
    );
  }, 0);
  const rubCostUsd =
    rubExchangeRate > 0
      ? (rubPricePerCubic * totalTashkentCub) / rubExchangeRate
      : 0;

  // Truck to'lovi (wagon uchun 0)
  const truckCost = parseFloat(t.truckOwnerPayment ?? "0");

  const revenue = revenueMap.get(t.id) ?? 0;
  const profit = revenue - expenses - codeExpense - rubCostUsd - truckCost;

  return {
    wagonId: t.id,
    number: t.number,
    closedAt: t.closedAt,
    revenue,
    expenses,
    codeExpense,
    rubCostUsd,
    truckCost,
    profit,
  };
});
```

**CONSTRAINTS:**
- `t.timbers` type — `db.query.transports.findMany` + `with: { timbers: true }` TypeScript da to'g'ri type qaytaradi, import kerak emas
- `rubCostUsd` va `truckCost` return object ga qo'shiladi — UI da ishlatilishi mumkin, hech narsa buzilmaydi
- `getOverallReport` faqat `w.profit` ishlatadi — `rubCostUsd`/`truckCost` qo'shilishi bu funksiyaga ta'sir qilmaydi

- [ ] **Step 1:** `findMany` ga `with: { timbers: true }` qo'shish
- [ ] **Step 2:** map ichida `rubCostUsd`, `truckCost` hisoblash va `profit` formulasini yangilash
- [ ] **Step 3:** Return object ga `rubCostUsd`, `truckCost` qo'shish
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato tekshirish

---

## Tekshirish

- [ ] `npx tsc --noEmit` — 0 xato
- [ ] Yangi vagon yaratib, taxtalar qo'shib (tashkentCount kiritib), mijozlarga bir qismini sotib, vagonni yopish → Omborxonada qolgan taxtalar ko'rinadi
- [ ] Omborxona qatorida vagon raqami ko'rinadi (transportId orqali)
- [ ] Hisobotda profit/zarar endi rubCostUsd va truckCost ni ham hisobga oladi
