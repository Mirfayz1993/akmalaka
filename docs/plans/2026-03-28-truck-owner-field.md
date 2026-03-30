# Yuk Mashinasi — Tonnaj o'rniga Egasi va To'lov — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yuk mashinasi yaratish modalida tonnaj maydoni o'rniga "Yuk mashina egasiga beriladigan pul" (summa $ + egasi hamkor) ko'rsatilsin. Vagon modalida tonnaj qoladi.

**Architecture:** `WagonModal.tsx` da type ga qarab conditional render. `truckOwnerId` va `truckOwnerPayment` state qo'shiladi. `createTransport` ga bu maydonlar uzatiladi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/app/(dashboard)/wagons/_components/WagonModal.tsx` | MODIFY — truck uchun tonnaj o'rniga egasi + to'lov maydoni |

---

## Task 1: `WagonModal.tsx` — truck uchun egasi va to'lov maydoni

**Agent:** Frontend Farid
**TZ bo'lim:** 2.1 (Yuk mashinasi ma'lumotlari)

**Files:**
- Modify: `src/app/(dashboard)/wagons/_components/WagonModal.tsx`

**CONTEXT:**

TZ dan:
> Yuk mashinasi: Kod UZ va Kod KZ o'rniga → **Yuk mashinasi egasi** (hamkordan tanlanadi) + **to'lov summasi ($)**

Schema da `transports` jadvalida:
- `truckOwnerId` — yuk mashinasi egasi partnerId
- `truckOwnerPayment` — to'lov summasi ($)

Partner turi: `truck_owner`

**SPEC:**

### State qo'shish:
```typescript
const [truckOwnerId, setTruckOwnerId] = useState("");
const [truckOwnerPayment, setTruckOwnerPayment] = useState("");
```

### resetForm ga qo'shish:
```typescript
setTruckOwnerId("");
setTruckOwnerPayment("");
```

### Partners filter qo'shish:
```typescript
const truckOwners = partners.filter((p) => p.type === "truck_owner");
```

### Section 1 da tonnaj maydonini shartli qilish:

Hozir tonnaj har doim ko'rinadi. Uni o'zgartirish:

```tsx
{/* Vagon uchun — tonnaj */}
{type === "wagon" && (
  <div>
    <label className={labelClass}>{t.wagons.tonnage}</label>
    <input
      type="number"
      className={inputClass}
      placeholder="65"
      value={tonnage}
      onChange={(e) => setTonnage(e.target.value)}
    />
  </div>
)}

{/* Truck uchun — egasi va to'lov, chapdan o'ngga: label | summa input | hamkor select */}
{type === "truck" && (
  <div>
    <label className={labelClass}>Yuk mashina egasiga beriladigan pul</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        className={inputClass}
        placeholder="0"
        value={truckOwnerPayment}
        onChange={(e) => setTruckOwnerPayment(e.target.value)}
      />
      <span className="text-sm text-slate-500 whitespace-nowrap">$</span>
      <select
        className={selectClass}
        value={truckOwnerId}
        onChange={(e) => setTruckOwnerId(e.target.value)}
      >
        <option value="">— Egasi —</option>
        {truckOwners.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  </div>
)}
```

### handleSubmit ga qo'shish (createTransport chaqiruvida):
```typescript
// truck uchun
truckOwnerId: type === "truck" && truckOwnerId ? parseInt(truckOwnerId) : undefined,
truckOwnerPayment: type === "truck" && truckOwnerPayment ? truckOwnerPayment : undefined,
// wagon uchun tonnaj
tonnage: type === "wagon" && tonnage ? tonnage : undefined,
```

**CONSTRAINTS:**
- Vagon modalida hech narsa o'zgarmaydi (tonnaj qoladi)
- Truck modalida tonnaj ko'rinmaydi
- `truckOwnerPayment` `createTransport` ga string sifatida uzatiladi (schema numeric)
- `npx tsc --noEmit` — 0 xato

- [ ] **Step 1:** State qo'shish (`truckOwnerId`, `truckOwnerPayment`)
- [ ] **Step 2:** `resetForm` ga yangi state larni qo'shish
- [ ] **Step 3:** `truckOwners` filter qo'shish
- [ ] **Step 4:** Tonnaj maydonini `type === "wagon"` shartiga o'rash
- [ ] **Step 5:** Truck uchun egasi + to'lov maydonini qo'shish
- [ ] **Step 6:** `handleSubmit` da `truckOwnerId`, `truckOwnerPayment`, `tonnage` shartli uzatish
- [ ] **Step 7:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] "Yuk mashinasi yaratish" → tonnaj yo'q, "Yuk mashina egasiga beriladigan pul" + $ input + egasi dropdown ko'rinadi
- [ ] "Vagon yaratish" → tonnaj ko'rinadi, egasi maydoni yo'q
- [ ] Truck yaratilganda `truckOwnerId` va `truckOwnerPayment` DB ga yoziladi
- [ ] `npx tsc --noEmit` — 0 xato
