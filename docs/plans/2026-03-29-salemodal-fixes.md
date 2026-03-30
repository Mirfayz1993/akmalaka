# SaleModal — Mijoz va Vagon filter fixes

**Goal:** SaleModal da mijoz dropdown barcha wood_buyer hamkorlarni ko'rsatsin; vagon dropdown faqat "yetib kelgan" va "tushirilgan" vagonlarni ko'rsatsin.

**Files:** `src/app/(dashboard)/sales/_components/SaleModal.tsx` only

---

## Fix 1: Vagon filter

`availableTransports` ni o'zgartir:

```ts
// ESKI:
const availableTransports = transports.filter(t => t.status !== "closed");

// YANGI:
const availableTransports = transports.filter(
  t => t.status === "arrived" || t.status === "unloaded"
);
```

## Fix 2: Mijoz dropdown — majburiy UX

Mijoz label ga `*` qo'sh va bo'sh holda xabar ko'rsat:

```tsx
<label className="block text-sm font-medium text-slate-700 mb-1">
  Mijoz <span className="text-red-500">*</span>
</label>
<select
  value={customerId}
  onChange={e => setCustomerId(e.target.value ? Number(e.target.value) : "")}
  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
    !customerId ? "border-slate-300" : "border-blue-400"
  }`}
>
  <option value="">— Mijozni tanlang —</option>
  {woodBuyers.length === 0 ? (
    <option disabled value="">Hamkorlar bo'limida "Yog'och xaridor" qo'shing</option>
  ) : (
    woodBuyers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
  )}
</select>
```

## Fix 3: sales/page.tsx — yuk mashinalarini ham yuklash

Hozir faqat `getTransports("wagon")` — yuk mashinalarini ham qo'sh:

```ts
const [salesData, partnersData, wagonsData, trucksData, warehouseData] = await Promise.all([
  getSales(),
  getPartners(),
  getTransports("wagon"),
  getTransports("truck"),
  getWarehouse(),
]);
setTransports([...wagonsData, ...trucksData] as unknown as TransportItem[]);
```

---

## Tekshirish

```bash
npx tsc --noEmit
```
