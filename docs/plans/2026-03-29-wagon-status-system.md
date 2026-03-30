# Vagon Status Tizimi — Arrived/Unloaded/Closed + Tushirish Dialog

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vagon statuslari uchun: (1) `unloadTransport` server action — vagonni "tushirilgan" ga o'tkazish va supplier hisobini yozish, (2) Wagons page da "Yopish" tugmasi bosilganda "Tushirish yoki Yopish?" dialog, (3) WagonTable da status badge ranglari.

**Architecture:** Backend: `unloadTransport` yangi action (hozirgi `closeTransport` finans logikasini o'z ichiga oladi). Frontend: wagons/page.tsx da choice dialog, WagonTable.tsx da status badge. Enum da 3 status allaqachon mavjud: `arrived`, `unloaded`, `closed`.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/lib/actions/wagons.ts` | MODIFY — `unloadTransport` qo'shish, `closeTransport` soddalashtirish |
| `src/app/(dashboard)/wagons/page.tsx` | MODIFY — choice dialog qo'shish |
| `src/app/(dashboard)/wagons/_components/WagonTable.tsx` | MODIFY — status badge ranglari |

---

## Task 1: Backend — wagons.ts (Backend Botir)

**Files:**
- Modify: `src/lib/actions/wagons.ts`

**CONTEXT:**

Hozirgi `closeTransport` (wagons.ts:231+):
- tashkentCount bo'yicha totalCub hisoblaydi
- RUB kassasini tekshiradi
- avgRate hisoblaydi (weighted average)
- cashOperations ga RUB expense yozadi
- partnerBalances ga supplier uchun yozadi
- status → "closed" qiladi

**SPEC:**

### `unloadTransport` (YANGI action):

`closeTransport` ichidagi BARCHA finans logikasini `unloadTransport` ga ko'chirish, faqat status → "unloaded" bo'ladi:

```typescript
export async function unloadTransport(id: number) {
  // Hozirgi closeTransport funksiyasidagi barcha logikani bu yerga ko'chir
  // Faqat oxirida: status = "unloaded" (closed emas)

  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, id),
    with: { timbers: true },
  });

  if (!transport) throw new Error("Transport topilmadi");

  // tashkentCount bo'yicha jami kub hisoblash (TZ qoida #2)
  let totalCubTashkent = 0;
  for (const timber of transport.timbers) {
    const tashkentCount = timber.tashkentCount ?? 0;
    const cub = (timber.thicknessMm / 1000) * (timber.widthMm / 1000) * Number(timber.lengthM) * tashkentCount;
    totalCubTashkent += cub;
  }

  const rubPricePerCubic = Number(transport.rubPricePerCubic ?? 0);
  const totalRub = totalCubTashkent * rubPricePerCubic;

  // RUB kassa balansini tekshirish (TZ qoida #10)
  const rubOpsResult = await db
    .select({ totalAmount: sql<string>`COALESCE(SUM(${cashOperations.amount}), 0)` })
    .from(cashOperations)
    .where(eq(cashOperations.currency, "rub"));
  const rubBalance = Number(rubOpsResult[0]?.totalAmount ?? 0);
  if (rubBalance < totalRub) throw new Error("RUB kassada yetarli mablag' yo'q");

  // Weighted average kurs hisoblash (TZ qoida #3)
  const rubIncomeOps = await db
    .select({ amount: cashOperations.amount, exchangeRate: cashOperations.exchangeRate })
    .from(cashOperations)
    .where(eq(cashOperations.currency, "rub"));

  let totalRubAmount = 0;
  let totalUsdEquivalent = 0;
  for (const op of rubIncomeOps) {
    const opAmount = Number(op.amount);
    const opRate = Number(op.exchangeRate ?? 0);
    if (opAmount > 0 && opRate > 0) {
      totalRubAmount += opAmount;
      totalUsdEquivalent += opAmount / opRate;
    }
  }

  let avgRate = totalUsdEquivalent > 0 ? totalRubAmount / totalUsdEquivalent : 1;
  if (avgRate <= 0) throw new Error("RUB kassada kurs ma'lumoti topilmadi");
  const totalUsd = totalRub / avgRate;

  await db.transaction(async (tx) => {
    // RUB kassasidan chiqim
    await tx.insert(cashOperations).values({
      currency: "rub",
      type: "expense",
      amount: String(-totalRub),
      exchangeRate: String(avgRate),
      transportId: id,
      description: `Vagon tushirildi #${transport.number ?? id}`,
    });

    // Supplier balance (agar supplierId bo'lsa)
    if (transport.supplierId && totalRub > 0) {
      await tx.insert(partnerBalances).values({
        partnerId: transport.supplierId,
        amount: String(-totalUsd),
        currency: "usd",
        transportId: id,
        description: `Yog'och to'lovi — vagon ${transport.number ?? id}`,
      });
    }

    // Status → unloaded
    await tx
      .update(transports)
      .set({ status: "unloaded" })
      .where(eq(transports.id, id));

    await tx.insert(transportLogs).values({
      transportId: id,
      action: "Vagon tushirildi (unloaded)",
    });
  });

  revalidatePath("/wagons");
}
```

### `closeTransport` (SODDALASHTIRISH):

Hozirgi `closeTransport` finans logikasini OLIB TASHLASH — faqat status o'zgartirish:

```typescript
export async function closeTransport(id: number) {
  await db
    .update(transports)
    .set({ status: "closed" })
    .where(eq(transports.id, id));

  await db.insert(transportLogs).values({
    transportId: id,
    action: "Vagon yopildi (closed)",
  });

  revalidatePath("/wagons");
}
```

**MUHIM:** `closeTransport` dan finans logikasi olib tashlanadi chunki u `unloadTransport` ga ko'chirildi. "Yopish" faqat status o'zgartiradi.

- [ ] **Step 1:** `unloadTransport` server action yozish (closeTransport logikasini ko'chirish, status="unloaded")
- [ ] **Step 2:** `closeTransport` ni soddalashtirish (faqat status="closed")
- [ ] **Step 3:** `unloadTransport` ni `revalidatePath("/wagons")` bilan yakunlash
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato

---

## Task 2: Frontend — wagons/page.tsx (Frontend Farid)

**Files:**
- Modify: `src/app/(dashboard)/wagons/page.tsx`

**CONTEXT:**

Hozirgi `handleCloseRequest` → `closeTarget` state → `ConfirmDialog` ko'rsatiladi → `handleCloseConfirm` → `closeTransport` chaqiriladi.

Hozirgi imports:
```typescript
import { getTransports, deleteTransport, closeTransport, getTransport } from "@/lib/actions/wagons";
```

**SPEC:**

### O'zgarish 1: Import yangilash

```typescript
import { getTransports, deleteTransport, closeTransport, unloadTransport, getTransport } from "@/lib/actions/wagons";
```

### O'zgarish 2: Yangi state — choice dialog

```typescript
// Choice dialog state (unload vs close)
const [choiceTarget, setChoiceTarget] = useState<Transport | null>(null);
const [isChoiceLoading, setIsChoiceLoading] = useState(false);
```

### O'zgarish 3: `handleCloseRequest` o'zgartirish

```typescript
// handleCloseRequest endi choiceTarget ni set qiladi (eski closeTarget o'rniga)
function handleCloseRequest(transport: Transport) {
  setChoiceTarget(transport);
}
```

### O'zgarish 4: Yangi `handleUnload` va `handleClose` funksiyalari

```typescript
async function handleUnload() {
  if (!choiceTarget) return;
  setIsChoiceLoading(true);
  try {
    await unloadTransport(choiceTarget.id);
    setChoiceTarget(null);
    await loadData();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
  } finally {
    setIsChoiceLoading(false);
  }
}

async function handleCloseConfirm() {
  if (!choiceTarget) return;
  setIsChoiceLoading(true);
  try {
    await closeTransport(choiceTarget.id);
    setChoiceTarget(null);
    await loadData();
  } catch (err) {
    console.error("Yopishda xato:", err);
  } finally {
    setIsChoiceLoading(false);
  }
}
```

### O'zgarish 5: Choice Dialog UI (eski ConfirmDialog o'rniga yoki qo'shimcha)

Eski `closeTarget` ConfirmDialog ni OLIB TASHLASH. Uning o'rniga `choiceTarget` uchun yangi modal:

```tsx
{/* Choice Dialog — Tushirish yoki Yopish */}
{choiceTarget && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
      <h2 className="text-lg font-bold text-slate-800 mb-2">
        Vagon #{choiceTarget.number ?? choiceTarget.id}
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        Ushbu vagon bilan nima qilmoqchisiz?
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={handleUnload}
          disabled={isChoiceLoading}
          className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm font-medium"
        >
          Tushirish — vagondan yog&apos;och tushirildi, sotish davom etadi
        </button>
        <button
          onClick={handleCloseConfirm}
          disabled={isChoiceLoading}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
        >
          Yopish — barcha yog&apos;och jo&apos;natildi, vagon yopiladi
        </button>
        <button
          onClick={() => setChoiceTarget(null)}
          disabled={isChoiceLoading}
          className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm"
        >
          Bekor qilish
        </button>
      </div>
    </div>
  </div>
)}
```

**MUHIM:**
- Eski `closeTarget` state va `isCloseLoading` state OLIB TASHLANADI
- Eski `handleCloseConfirm` (closeTarget bilan) OLIB TASHLANADI
- WagonTable `onClose` prop i hali ham `handleCloseRequest` ni chaqiradi — o'zgarmaydi
- Eski `ConfirmDialog` (yopish uchun) JSX dan OLIB TASHLANADI

- [ ] **Step 1:** Import ga `unloadTransport` qo'shish
- [ ] **Step 2:** `choiceTarget`, `isChoiceLoading` state lar qo'shish
- [ ] **Step 3:** `handleCloseRequest` → `choiceTarget` set qilishi
- [ ] **Step 4:** `handleUnload` va yangi `handleCloseConfirm` funksiyalari
- [ ] **Step 5:** Eski `closeTarget`/`isCloseLoading` va eski `handleCloseConfirm` OLIB TASHLASH
- [ ] **Step 6:** Choice Dialog JSX qo'shish, eski ConfirmDialog (yopish uchun) OLIB TASHLASH
- [ ] **Step 7:** `npx tsc --noEmit` — 0 xato

---

## Task 3: Frontend — WagonTable.tsx status badge ranglari (Frontend Farid)

**Files:**
- Modify: `src/app/(dashboard)/wagons/_components/WagonTable.tsx`

**CONTEXT:**

WagonTable.tsx da har bir wagon qatori uchun status badge ko'rsatiladi. Hozirgi holat: `status` maydoni mavjud lekin ranglar belgilangan emas yoki faqat bitta rang.

**SPEC:**

Status badge funksiyasi:

```typescript
function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    in_transit:  { label: "Yo'lda",      className: "bg-blue-100 text-blue-700" },
    at_border:   { label: "Chegarada",   className: "bg-purple-100 text-purple-700" },
    arrived:     { label: "Yetib keldi", className: "bg-green-100 text-green-700" },
    unloaded:    { label: "Tushirildi",  className: "bg-amber-100 text-amber-700" },
    closed:      { label: "Yopildi",     className: "bg-slate-100 text-slate-500" },
  };
  const item = map[status] ?? { label: status, className: "bg-slate-100 text-slate-500" };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${item.className}`}>
      {item.label}
    </span>
  );
}
```

WagonTable.tsx ni o'qi, mavjud status ko'rinishini topib ushbu yangi `statusBadge` funksiyasi bilan almashtir.

- [ ] **Step 1:** WagonTable.tsx ni o'qi, mavjud status rendering qismini top
- [ ] **Step 2:** `statusBadge` funksiyasini qo'shish va status ko'rinishini almashtirish
- [ ] **Step 3:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Vagon qatorida "Yopish" bosilsa — "Tushirish yoki Yopish?" dialog ochiladi
- [ ] "Tushirish" → status amber "Tushirildi" badge, finans yozuvi yaratiladi
- [ ] "Yopish" → status slate "Yopildi" badge, faqat status o'zgaradi
- [ ] "Tushirildi" statusdagi vagondan sotish mumkin (SaleModal da ko'rinadi)
- [ ] "Yopildi" statusdagi vagon SaleModal da ko'rinmaydi
- [ ] Status badge lari ranglari to'g'ri: Yo'lda=blue, Chegarada=purple, Yetib keldi=green, Tushirildi=amber, Yopildi=slate
- [ ] `npx tsc --noEmit` — 0 xato
