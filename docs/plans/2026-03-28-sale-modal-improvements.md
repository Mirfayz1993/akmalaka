# Savdo Modali — Qo'lda Yog'och + Toshkent Soni UX

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SaleModal.tsx da ikkita UX yaxshilanishi: (1) tashkentCount=0 bo'lgan taxtalar uchun "Toshkent soni kiritilmagan" ogohlantirishi, (2) vagon bilan bog'liq bo'lmagan yog'ochni qo'lda savdoga qo'shish imkoni.

**Architecture:** Faqat frontend o'zgaradi. Backend `saleItems.timberId` allaqachon nullable, `SaleItemInput.timberId?: number` optional — hech narsa o'zgarmaydi. `CartItem` type da `timberId` optional qilinadi, yangi 5 ta state va `handleAddManual()` qo'shiladi. Remove va key logikasi index-based ga o'zgaradi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/app/(dashboard)/sales/_components/SaleModal.tsx` | MODIFY — CartItem type, 5 state, handleAddManual, UX badge, UI section, resetForm, remove/key fix |

---

## Task 1: SaleModal.tsx

**Files:**
- Modify: `src/app/(dashboard)/sales/_components/SaleModal.tsx`

- [ ] **Step 1:** `CartItem` type da `timberId` ni optional qilish (line 31)

```typescript
type CartItem = {
  timberId?: number;        // undefined = qo'lda kiritilgan
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  available: number;
  sentCount: number;
  pricePerCubicUsd: number;
};
```

- [ ] **Step 2:** `handleRemoveFromCart` ni index-based ga o'zgartirish (line 110-112)

Hozirgi:
```typescript
function handleRemoveFromCart(timberId: number) {
  setCart(cart.filter((c) => c.timberId !== timberId));
}
```
Yangi:
```typescript
function handleRemoveFromCart(index: number) {
  setCart(cart.filter((_, i) => i !== index));
}
```

- [ ] **Step 3:** Cart jadvalida `key` va `onClick` ni index-based ga o'zgartirish (line 396-420)

Hozirgi:
```tsx
{cart.map((item) => {
  ...
  <tr key={item.timberId} ...>
  ...
  <button onClick={() => handleRemoveFromCart(item.timberId)}>
```
Yangi:
```tsx
{cart.map((item, index) => {
  ...
  <tr key={index} ...>
  ...
  <button onClick={() => handleRemoveFromCart(index)}>
```

- [ ] **Step 4:** 5 ta yangi manual state qo'shish (boshqa state lar qatoriga, line ~58 atrofida)

```typescript
const [manualThickness, setManualThickness] = useState("");
const [manualWidth, setManualWidth] = useState("");
const [manualLength, setManualLength] = useState("");
const [manualCount, setManualCount] = useState("");
const [manualPrice, setManualPrice] = useState("");
```

- [ ] **Step 5:** `handleAddManual` funksiyasi qo'shish (handleAddToCart dan keyin)

```typescript
function handleAddManual() {
  const t = parseInt(manualThickness);
  const w = parseInt(manualWidth);
  const l = parseFloat(manualLength);
  const cnt = parseInt(manualCount);
  const price = parseFloat(manualPrice);
  if (!t || !w || !l || !cnt || !price) return;
  setCart((prev) => [
    ...prev,
    {
      timberId: undefined,
      thicknessMm: t,
      widthMm: w,
      lengthM: l,
      available: Infinity,
      sentCount: cnt,
      pricePerCubicUsd: price,
    },
  ]);
  setManualThickness("");
  setManualWidth("");
  setManualLength("");
  setManualCount("");
  setManualPrice("");
}
```

- [ ] **Step 6:** Timber jadvalida "Mavjud" ustunini toshkentCount=0 uchun UX badge bilan yangilash (line 313-315)

Hozirgi:
```tsx
<td className="px-3 py-2 text-right text-slate-600">
  {available} dona
</td>
```
Yangi:
```tsx
<td className="px-3 py-2 text-right text-slate-600">
  {timber.tashkentCount === 0 ? (
    <span className="text-xs text-amber-600">Toshkent soni kiritilmagan</span>
  ) : (
    <span>{available} dona</span>
  )}
</td>
```

- [ ] **Step 7:** "Qo'lda qo'shish" UI bo'limi qo'shish — Step 2 ichida, vagon timbers blokidan KEYIN, Cart blokidan OLDIN (line ~376 atrofida)

```tsx
{/* ── Qo'lda qo'shish ──────────────────────────────── */}
<div className="pt-4 border-t border-slate-200">
  <p className="text-sm font-medium text-slate-700 mb-2">Qo'lda qo'shish</p>
  <div className="flex items-center gap-2 flex-wrap">
    <input type="number" placeholder="Qalinlik mm"
      value={manualThickness} onChange={(e) => setManualThickness(e.target.value)}
      className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
    <input type="number" placeholder="Kenglik mm"
      value={manualWidth} onChange={(e) => setManualWidth(e.target.value)}
      className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
    <input type="number" placeholder="Uzunlik m"
      value={manualLength} onChange={(e) => setManualLength(e.target.value)}
      className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
    <input type="number" placeholder="Miqdor"
      value={manualCount} onChange={(e) => setManualCount(e.target.value)}
      className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
    <input type="number" placeholder="$/m³"
      value={manualPrice} onChange={(e) => setManualPrice(e.target.value)}
      className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
    />
    <button type="button" onClick={handleAddManual}
      className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800"
    >
      + Qo'shish
    </button>
  </div>
</div>
```

- [ ] **Step 8:** `handleClose` funksiyasiga yangi state tozalash qo'shish (line 147-158)

```typescript
setManualThickness("");
setManualWidth("");
setManualLength("");
setManualCount("");
setManualPrice("");
```

- [ ] **Step 9:** `npx tsc --noEmit` ishlatib 0 xato ekanini tekshir

---

## Tekshirish

- [ ] Savdo → vagon tanlash → tashkentCount=0 bo'lgan taxta qatorida "Toshkent soni kiritilmagan" (amber rang) ko'rinadi
- [ ] Savdo → "Yog'och qo'shish" tab → pastda "Qo'lda qo'shish" bo'limi ko'rinadi
- [ ] 5 inputni to'ldirib "+ Qo'shish" → cart ga qo'shiladi
- [ ] Cart dan o'chirish ishlaydi (manual va wagon itemlari uchun ham)
- [ ] Saqlash → savdo yaratiladi, timberId=null bo'lgan item ham saqlanadi
- [ ] `npx tsc --noEmit` — 0 xato
