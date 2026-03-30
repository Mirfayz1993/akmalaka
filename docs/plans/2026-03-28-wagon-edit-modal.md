# Vagon Tahrirlash Modali — To'liq Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vagon ✏️ tugmasini bosganda to'liq tahrirlash modali chiqsin — Yog'ochlar + Yog'och xaridi + Xarajatlar bo'limlari bilan; Mijoz soni savdolardan avtomatik yig'iladi (qo'lda kiritilmaydi).

**Architecture:** Yangi `WagonEditModal.tsx` komponenti yaratiladi (WagonModal.tsx ga o'xshash tuzilma, lekin mavjud ma'lumotlarni yuklaydi va `updateTransport` orqali saqlaydi). `timbers.ts` server actions yaratiladi. `wagons/page.tsx` yangilanadi — eski oddiy timber-only modal o'chiriladi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · Server Actions

---

## Fayl strukturasi

| Fayl | O'zgarish | Javobgarlik |
|------|-----------|-------------|
| `src/lib/actions/timbers.ts` | CREATE | Backend Botir |
| `src/lib/actions/wagons.ts` | MODIFY — `updateTimber` olib tashlash | Backend Botir |
| `src/app/(dashboard)/wagons/_components/WagonEditModal.tsx` | CREATE | Frontend Farid |
| `src/app/(dashboard)/wagons/page.tsx` | MODIFY | Frontend Farid |

---

## Task 1: Backend — `timbers.ts` yaratish va `wagons.ts` tuzatish

**Agent:** Backend Botir
**TZ bo'lim:** 2.1 (Yog'och jadvali), 3 (Biznes qoida #5: Mijoz soni savdolardan)

**Files:**
- Create: `src/lib/actions/timbers.ts`
- Modify: `src/lib/actions/wagons.ts`

**CONTEXT:**

`WagonTable.tsx` allaqachon `import { updateTimber } from "@/lib/actions/timbers"` qilmoqda — lekin bu fayl mavjud emas! Shuning uchun `timbers.ts` yaratish shart.

`wagons.ts` da `updateTimber` funksiyasi bor (men qo'shganman) — uni olib tashlash kerak, chunki `timbers.ts` da bo'ladi.

`wagons/page.tsx` da ham `updateTimber` importi bor (`wagons.ts` dan) — uni ham `timbers.ts` ga o'zgartirish kerak.

**SPEC — `timbers.ts`:**

```typescript
"use server";

import { db } from "@/db";
import { timbers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateTimber(
  id: number,
  data: { tashkentCount?: number | null; customerCount?: number | null }
) {
  const [timber] = await db
    .update(timbers)
    .set(data)
    .where(eq(timbers.id, id))
    .returning();
  revalidatePath("/wagons");
  return timber;
}

export async function createTimber(data: {
  transportId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  russiaCount: number;
}) {
  const [timber] = await db.insert(timbers).values(data).returning();
  revalidatePath("/wagons");
  return timber;
}

export async function deleteTimber(id: number) {
  await db.delete(timbers).where(eq(timbers.id, id));
  revalidatePath("/wagons");
}
```

**SPEC — `wagons.ts` tuzatish:**

`wagons.ts` dan `updateTimber` funksiyasini BUTUNLAY olib tashlash (endi `timbers.ts` da).

**CONSTRAINTS:**
- `wagons/page.tsx` da `updateTimber` import qatori ham `timbers` ga o'zgartirilsin:
  `import { updateTimber } from "@/lib/actions/timbers";`
- Modal importi (`import Modal from "@/components/ui/Modal"`) ham `page.tsx` dan olib tashlanadi (Task 3 da)
- `npx tsc --noEmit` — 0 xato bo'lishi shart

**BIZNES QOIDALARI:**
- TZ qoida #5: Mijoz soni jo'natilgan sondan farq qilishi mumkin — savdodan yig'iladi
- `customerCount` HECH QACHON `timbers.ts` da qo'lda o'zgartirilmaydi (faqat `receiveSale` orqali)

- [ ] **Step 1:** `src/lib/actions/timbers.ts` yaratish (yuqoridagi kod)
- [ ] **Step 2:** `src/lib/actions/wagons.ts` — `updateTimber` funksiyasini olib tashlash (faqat shu funksiya, boshqalari qoladi)
- [ ] **Step 3:** `src/app/(dashboard)/wagons/page.tsx` — `updateTimber` importini `wagons` dan `timbers` ga o'zgartirish
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato

---

## Task 2: Frontend — `WagonEditModal.tsx` yaratish

**Agent:** Frontend Farid
**TZ bo'lim:** 2.1 (Vagonlar — barcha seksiyalar), 0 (Dizayn qoidalari)

**Files:**
- Create: `src/app/(dashboard)/wagons/_components/WagonEditModal.tsx`

**CONTEXT:**

`WagonModal.tsx` yangi vagon yaratadi. `WagonEditModal.tsx` mavjud vagonni tahrirlaydi.
Dizayn `WagonModal.tsx` ga IDENTIK — xuddi shu seksiyalar, xuddi shu stillar.

Farq: WagonEditModal mavjud ma'lumotlarni `useState` boshlang'ich qiymat sifatida oladi,
va "Saqlash" da `updateTransport()` chaqiradi (create emas).

Yog'ochlar seksiyasida:
- Mavjud taxtalar DB dan keladi (transport.timbers)
- Har bir taxta: Rossiya (read-only), Toshkent (editable, blur da `updateTimber` chaqiradi), Mijoz (read-only, badge)
- O'chirish: `deleteTimber(id)` + local state dan olib tashlash
- Yangi qo'shish: `createTimber()` + local state ga qo'shish

**SPEC:**

```typescript
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { updateTransport } from "@/lib/actions/wagons";
import { updateTimber, createTimber, deleteTimber } from "@/lib/actions/timbers";

interface Partner { id: number; name: string; type: string; }

interface TimberItem {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  russiaCount: number;
  tashkentCount: number | null;
  customerCount: number | null;
}

interface FullTransport {
  id: number;
  type: "wagon" | "truck";
  number: string | null;
  sentAt: string | null;
  arrivedAt: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  tonnage: string | null;
  supplierId: number | null;
  codeUzPricePerTon: string | null;
  codeUzSupplierId: number | null;
  codeKzPricePerTon: string | null;
  codeKzSupplierId: number | null;
  rubPricePerCubic: string | null;
  expenseNds: string | null;
  expenseNdsPartnerId: number | null;
  expenseUsluga: string | null;
  expenseUslugaPartnerId: number | null;
  expenseTupik: string | null;
  expenseTupikPartnerId: number | null;
  expenseXrannei: string | null;
  expenseXranneiPartnerId: number | null;
  expenseOrtish: string | null;
  expenseOrtishPartnerId: number | null;
  expenseTushurish: string | null;
  expenseTushirishPartnerId: number | null;
  timbers: TimberItem[];
}

interface WagonEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transport: FullTransport | null;
  partners: Partner[];
  onSuccess: () => void;
}
```

**Section 1 — Asosiy ma'lumotlar** (WagonModal Section 1 bilan bir xil layout):
- Barcha inputlar `transport.*` qiymatlar bilan `useState` boshlang'ich qiymat sifatida
- `useEffect(() => { if (transport) { setNumber(transport.number ?? ""); ... } }, [transport])`

**Section 2 — Kodlar** (faqat `transport.type === "wagon"` uchun):
- Kod UZ $/t + ta'minotchi (mavjud qiymatlar bilan)
- Kod KZ $/t + ta'minotchi (mavjud qiymatlar bilan)
- Jami avtomatik: `tonnage × $/t`

**Section 3 — Yog'ochlar** (mavjud + yangi qo'shish):

```typescript
const [timberList, setTimberList] = useState<TimberItem[]>([]);
// transport o'zgarganda useEffect da: setTimberList(transport.timbers)

// Yangi qo'shish uchun bo'sh qator state:
const [newTimber, setNewTimber] = useState({ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" });

async function handleAddTimber() {
  if (!transport) return;
  const t = newTimber;
  if (!t.thicknessMm || !t.widthMm || !t.lengthM || !t.russiaCount) return;
  const created = await createTimber({
    transportId: transport.id,
    thicknessMm: parseInt(t.thicknessMm),
    widthMm: parseInt(t.widthMm),
    lengthM: t.lengthM,
    russiaCount: parseInt(t.russiaCount),
  });
  setTimberList(prev => [...prev, { ...created, tashkentCount: null, customerCount: null }]);
  setNewTimber({ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" });
}

async function handleDeleteTimber(id: number) {
  await deleteTimber(id);
  setTimberList(prev => prev.filter(t => t.id !== id));
}

async function handleTashkentBlur(timberId: number, value: string) {
  const num = value === "" ? null : parseInt(value, 10);
  const val = num !== null && isNaN(num) ? null : num;
  await updateTimber(timberId, { tashkentCount: val });
  setTimberList(prev => prev.map(t => t.id === timberId ? { ...t, tashkentCount: val } : t));
}
```

Jadval ko'rinishi (har bir mavjud taxta uchun):
```
| {thicknessMm}×{widthMm}×{lengthM}m | Rossiya: {russiaCount} | Toshkent: [input] | Mijoz: {customerCount ?? 0} | [🗑] |
```

Toshkent input: `type="number"`, `defaultValue={timber.tashkentCount ?? ""}`, `onBlur`

Mijoz: read-only, oddiy matn sifatida ko'rsatiladi (badge yoki span):
```tsx
<span className="text-xs text-slate-500">{timber.customerCount ?? 0}</span>
```

Yangi taxta qo'shish: 4 ta input (Qalinlik | Eni | Uzunlik | Rossiya) + "Qo'shish" tugmasi

Jami kub (Rossiya) va Jami kub (Toshkent) avtomatik hisob.

**Section 4 — Yog'och xaridi (RUB):**
- `rubPricePerCubic` mavjud qiymat bilan
- Jami RUB = Toshkent kub × narx (TZ qoida #2)

**Section 5 — Xarajatlar (USD):**
- 6 ta xarajat (NDS, Usluga, Tupik, Xrannei, Ortish, Tushurish) mavjud qiymatlar bilan
- Har biri: summa input + service_provider dropdown

**Footer:**
- "Bekor qilish" + "Saqlash" tugmalari
- "Saqlash" `updateTransport(transport.id, { ... })` chaqiradi (timberlar EMAS — ular allaqachon real vaqtda saqlanadi)

**CONSTRAINTS:**
- `"use client"` direktiva
- Hardcoded matn yo'q — `@/i18n/uz` dan
- customerCount hech qachon input sifatida ko'rsatilmaydi — faqat read-only
- Toshkent soni blur da avtomatik saqlanadi (Saqlash tugmasisiz)
- Yangi taxta "Qo'shish" bosilganda DB ga yoziladi va list yangilanadi

- [ ] **Step 1:** `WagonEditModal.tsx` yaratish — barcha seksiyalar
- [ ] **Step 2:** `npx tsc --noEmit` — 0 xato

---

## Task 3: Frontend — `wagons/page.tsx` yangilash

**Agent:** Frontend Farid
**TZ bo'lim:** 2.1

**Files:**
- Modify: `src/app/(dashboard)/wagons/page.tsx`

**CONTEXT:**

Hozirgi `page.tsx` da Task 0 (oldingi sessiyada) qilingan oddiy `Modal` bilan timber-only edit mavjud.
Bu endi `WagonEditModal` bilan almashtiriladi.

**SPEC — olib tashlash:**
```typescript
// Bu importlarni olib tashlash:
import { getTransports, getTransport, deleteTransport, closeTransport, updateTimber } from "@/lib/actions/wagons";
import Modal from "@/components/ui/Modal";

// Bu state larni olib tashlash:
const [editingWagonId, setEditingWagonId] = useState<number | null>(null);
const [editTimberList, setEditTimberList] = useState<Timber[]>([]);

// Bu funksiyalarni olib tashlash:
async function handleTimberBlur(...) { ... }

// JSX dan bu blokni olib tashlash:
<Modal isOpen={editingWagonId !== null} ...>
  ...
</Modal>
```

**SPEC — qo'shish:**
```typescript
// Yangi importlar:
import { getTransports, getTransport, deleteTransport, closeTransport } from "@/lib/actions/wagons";
import WagonEditModal from "./_components/WagonEditModal";

// Yangi type (getTransport dan keladi):
type FullTransport = Awaited<ReturnType<typeof getTransport>>;

// Yangi state:
const [editingTransport, setEditingTransport] = useState<FullTransport | null>(null);

// handleEdit yangilash:
async function handleEdit(transport: Transport) {
  const data = await getTransport(transport.id);
  if (data) setEditingTransport(data);
}

// JSX ga qo'shish:
<WagonEditModal
  isOpen={editingTransport !== null}
  onClose={() => setEditingTransport(null)}
  transport={editingTransport ?? null}
  partners={partners}
  onSuccess={() => { setEditingTransport(null); loadData(); }}
/>
```

**CONSTRAINTS:**
- Transport interfeysi o'zgarishsiz qoladi (WagonTable uchun)
- `updateTimber` import `page.tsx` dan BUTUNLAY olib tashlanadi (endi faqat WagonEditModal ichida)

- [ ] **Step 1:** `page.tsx` yangilash — eski modal olib tashlash + WagonEditModal integratsiya
- [ ] **Step 2:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish checklist

- [ ] ✏️ tugmasini bosish → to'liq tahrirlash modali ochiladi
- [ ] Barcha maydonlar mavjud qiymatlar bilan to'ldirilgan (vagon raqami, sanalar, ta'minotchi, kodlar, RUB narxi, xarajatlar)
- [ ] Yog'ochlar ro'yxati ko'rinadi (Rossiya, Toshkent, Mijoz ustunlari)
- [ ] Toshkent sonini o'zgartirib Tab → DB ga saqlanadi (modal yopilmasdan)
- [ ] Mijoz soni read-only (input yo'q, faqat matn)
- [ ] Yangi taxta qo'shish ishlaydi
- [ ] Taxta o'chirish ishlaydi
- [ ] "Saqlash" → asosiy ma'lumotlar, kodlar, RUB narxi, xarajatlar saqlanadi
- [ ] Yangi vagon yaratish (WagonModal) hali ham ishlaydi (o'zgarmagan)
- [ ] `npx tsc --noEmit` — 0 xato
