# Number Input UX — Spinner olib tashlash + Zero clearing

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loyihadagi barcha `<input type="number">` larda: (1) o'ng tomondagi yuqori/pastga strelkalar (spinners) olib tashlanadi, (2) input ga focus kelganda qiymat 0 bo'lsa avtomatik tozalanadi.

**Architecture:**
- Spinner: `globals.css` da bir marta CSS qo'shiladi — barcha number inputlarga global ta'sir qiladi.
- Zero clearing: `src/components/ui/NumberInput.tsx` yangi komponent yaratiladi. Barcha 8 ta fayldagi `<input type="number">` `<NumberInput>` bilan almashtiriladi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/app/globals.css` | MODIFY — spinner CSS qo'shish |
| `src/components/ui/NumberInput.tsx` | CREATE — yangi komponent |
| `src/app/(dashboard)/sales/_components/SaleModal.tsx` | MODIFY — NumberInput bilan almashtirish |
| `src/app/(dashboard)/sales/_components/SaleReceiveModal.tsx` | MODIFY — NumberInput bilan almashtirish |
| `src/app/(dashboard)/wagons/_components/WagonModal.tsx` | MODIFY — NumberInput bilan almashtirish |
| `src/app/(dashboard)/wagons/_components/WagonEditModal.tsx` | MODIFY — NumberInput bilan almashtirish |
| `src/app/(dashboard)/partners/_components/PaymentModal.tsx` | MODIFY — NumberInput bilan almashtirish |
| `src/app/(dashboard)/cash/page.tsx` | MODIFY — NumberInput bilan almashtirish |
| `src/app/(dashboard)/codes/_components/CodeSellModal.tsx` | MODIFY — NumberInput bilan almashtirish |
| `src/app/(dashboard)/codes/_components/CodeBuyModal.tsx` | MODIFY — NumberInput bilan almashtirish |

---

## Task 1: globals.css — Spinner CSS (Frontend Farid)

**Files:**
- Modify: `src/app/globals.css`

**SPEC:**

Mavjud CSS ga qo'shish:
```css
/* Number input spinners olib tashlash */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
```

- [ ] **Step 1:** CSS qo'shish

---

## Task 2: NumberInput komponent (Frontend Farid)

**Files:**
- Create: `src/components/ui/NumberInput.tsx`

**SPEC:**

```tsx
"use client";

import { InputHTMLAttributes } from "react";

type NumberInputProps = InputHTMLAttributes<HTMLInputElement>;

export default function NumberInput({ onFocus, ...props }: NumberInputProps) {
  return (
    <input
      type="number"
      onFocus={(e) => {
        if (e.target.value === "0") {
          e.target.value = "";
        }
        onFocus?.(e);
      }}
      {...props}
    />
  );
}
```

**Izoh:** `e.target.value = ""` — to'g'ridan-to'g'ri DOM manipulation. Foydalanuvchi yozganda `onChange` chaqiriladi va parent state yangilanadi. Agar foydalanuvchi hech narsa yozmay blur qilsa, React state (0) qaytib keladi — bu to'g'ri xulq-atvor.

- [ ] **Step 2:** `NumberInput.tsx` yaratish

---

## Task 3: Barcha fayllarni almashtirish (Frontend Farid)

Har faylda:
1. `import NumberInput from "@/components/ui/NumberInput";` qo'shish (agar fayl `"use client"` bo'lsa)
2. Barcha `<input type="number"` → `<NumberInput` bilan almashtirish (`type="number"` atributi olib tashlanadi — komponent o'zi qo'shadi)

**MUHIM:** Boshqa barcha proplar (`className`, `value`, `onChange`, `min`, `max`, `step`, `placeholder`, `disabled`, `required` va h.k.) o'ZGARMAYDI — shunchaki tag nomi o'zgaradi.

### 3a. `SaleModal.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`
- `type="number"` atributini olib tashlash

### 3b. `SaleReceiveModal.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`

### 3c. `WagonModal.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`

### 3d. `WagonEditModal.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`

### 3e. `PaymentModal.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`

### 3f. `cash/page.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`

### 3g. `CodeSellModal.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`

### 3h. `CodeBuyModal.tsx`
- Import qo'shish
- `<input type="number"` → `<NumberInput`

- [ ] **Step 3a:** SaleModal.tsx — almashtirish
- [ ] **Step 3b:** SaleReceiveModal.tsx — almashtirish
- [ ] **Step 3c:** WagonModal.tsx — almashtirish
- [ ] **Step 3d:** WagonEditModal.tsx — almashtirish
- [ ] **Step 3e:** PaymentModal.tsx — almashtirish
- [ ] **Step 3f:** cash/page.tsx — almashtirish
- [ ] **Step 3g:** CodeSellModal.tsx — almashtirish
- [ ] **Step 3h:** CodeBuyModal.tsx — almashtirish

- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Istalgan number inputga sichqoncha olib kelganda strelkalar ko'rinmaydi
- [ ] Qiymat 0 bo'lgan inputga bosish — 0 yo'qoladi, foydalanuvchi yangi qiymat yoza oladi
- [ ] 0 emas qiymat bo'lsa (masalan 150) — focus qilganda o'zgarmaydi
- [ ] `npx tsc --noEmit` — 0 xato
- [ ] `npm run lint` — 0 xato
