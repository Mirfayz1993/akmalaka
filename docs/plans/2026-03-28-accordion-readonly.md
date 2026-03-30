# Accordion Read-Only — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vagon accordion (kengayuvchi qator) faqat ma'lumotlarni ko'rsatadi — Toshkent soni inline input o'rniga oddiy matn sifatida. Tahrirlash faqat ✏️ (WagonEditModal) orqali.

**Architecture:** `TimberTable.tsx` dan inline editing (input + state) olib tashlanadi. Barcha ustunlar read-only span/text ga aylanadi. `onUpdate` prop ham olib tashlanadi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/app/(dashboard)/wagons/_components/TimberTable.tsx` | MODIFY — inline editing olib tashlash, read-only |
| `src/app/(dashboard)/wagons/_components/WagonTable.tsx` | MODIFY — `onUpdate` prop va `handleTimberUpdate` olib tashlash |

---

## Task 1: `TimberTable.tsx` — read-only

**Agent:** Frontend Farid
**TZ bo'lim:** 2.1 (Yog'och jadvali)

**Files:**
- Modify: `src/app/(dashboard)/wagons/_components/TimberTable.tsx`

**SPEC:**

Hozirgi holat:
- `tashkentEdits` state bor (inline editing uchun)
- `handleTashkentChange`, `handleTashkentBlur` funksiyalari bor
- `onUpdate` prop bor
- Toshkent ustunida `<input>` bor

Yangi holat — bularning barchasini olib tashlash:

```typescript
// Olib tashlanadi:
interface TimberTableProps {
  timbers: Timber[];
  onUpdate: (id: number, data: { tashkentCount?: number; customerCount?: number }) => void;
  // ↑ onUpdate olib tashlanadi
}

// Yangi:
interface TimberTableProps {
  timbers: Timber[];
}
```

Barcha state va funksiyalar olib tashlanadi:
```typescript
// O'CHIRILADI:
const [tashkentEdits, setTashkentEdits] = useState<Record<number, string>>({});
function handleTashkentChange(...) { ... }
function handleTashkentBlur(...) { ... }
```

Toshkent ustuni — input o'rniga oddiy matn:
```tsx
// O'CHIRILADI:
<td className="py-2 px-2">
  <input
    type="number"
    className={inputClass}
    value={tashkentVal}
    onChange={(e) => handleTashkentChange(timber.id, e.target.value)}
    onBlur={() => handleTashkentBlur(timber)}
  />
</td>

// YANGI:
<td className="py-2 px-2 text-slate-700">{timber.tashkentCount ?? 0}</td>
```

Mijoz ustuni — allaqachon read-only, o'zgarmaydi.

`inputClass` konstantasi ham olib tashlanadi (endi ishlatilmaydi).

`useState` import olib tashlanadi (endi state yo'q).

**CONSTRAINTS:**
- Jami kub hisoblash (tfoot) o'zgarmaydi
- Ustun sarlavhalari o'zgarmaydi
- `"use client"` direktiva qoladi (lekin aslida kerak emas — optionally server component qilish mumkin, lekin o'zgartirma)

- [ ] **Step 1:** `TimberTable.tsx` — inline editing olib tashlash, read-only qilish
- [ ] **Step 2:** `npx tsc --noEmit` — 0 xato

---

## Task 2: `WagonTable.tsx` — `onUpdate` olib tashlash

**Agent:** Frontend Farid (Task 1 dan keyin)
**TZ bo'lim:** 2.1

**Files:**
- Modify: `src/app/(dashboard)/wagons/_components/WagonTable.tsx`

**SPEC:**

`TimberTable` endi `onUpdate` prop qabul qilmaydi — `WagonTable.tsx` dan ham olib tashlash kerak.

```typescript
// O'CHIRILADI:
async function handleTimberUpdate(id: number, data: { tashkentCount?: number; customerCount?: number }) {
  await updateTimber(id, data);
}

// O'CHIRILADI (import):
import { updateTimber } from "@/lib/actions/timbers";
```

`TimberTable` render:
```tsx
// ESKI:
<TimberTable
  timbers={transport.timbers}
  onUpdate={handleTimberUpdate}
/>

// YANGI:
<TimberTable timbers={transport.timbers} />
```

- [ ] **Step 1:** `WagonTable.tsx` — `handleTimberUpdate`, `updateTimber` import, `onUpdate` prop olib tashlash
- [ ] **Step 2:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Vagon ustiga bosish → accordion ochiladi, Toshkent soni oddiy raqam sifatida ko'rinadi (input yo'q)
- [ ] ✏️ tugmasi → WagonEditModal ochiladi, Toshkent soni hali ham tahrirlanadi
- [ ] `npx tsc --noEmit` — 0 xato
