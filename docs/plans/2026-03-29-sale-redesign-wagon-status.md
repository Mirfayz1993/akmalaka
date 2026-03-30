# SaleModal Redesign + Wagon Status System Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan.

**Goal:** SaleModal ni bitta forma qilib qayta yozish (2-step o'rniga), vagonga optional havola bilan manual timber qatorlari; WagonTable ga status badge va "Tushurish" tugmasi qo'shish.

**Architecture:** Backend: `saleItems` jadvaliga `transportId` qo'shish. Frontend: SaleModal — WagonModal uslubidagi jadval qatorlari, vagon selector. WagonTable — status badge + unload dialog.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Drizzle ORM, PostgreSQL

---

## TASK 1 (Backend): `saleItems` jadvaliga `transportId` qo'shish

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/lib/actions/sales.ts`
- Create migration via: `npx drizzle-kit generate` then `npx drizzle-kit migrate`

### Steps:

- [ ] **Step 1: `saleItems` sxemasiga `transportId` qo'shish**

`src/db/schema.ts` — `saleItems` tablosiga quyidagini qo'sh (`warehouseId` dan keyin):
```ts
transportId: integer("transport_id").references(() => transports.id),
```

- [ ] **Step 2: `saleItemsRelations` ga transport relation qo'shish**

`src/db/schema.ts` — `saleItemsRelations` ichiga:
```ts
transport: one(transports, {
  fields: [saleItems.transportId],
  references: [transports.id],
}),
```

- [ ] **Step 3: `transportsRelations` ga `saleItems` many qo'shish**

`src/db/schema.ts` — `transportsRelations` ichiga (agar yo'q bo'lsa):
```ts
saleItems: many(saleItems),
```

- [ ] **Step 4: `SaleItemInput` typega `transportId` qo'shish**

`src/lib/actions/sales.ts`:
```ts
type SaleItemInput = {
  timberId?: number;
  warehouseId?: number;
  transportId?: number;   // ← QO'SH
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sentCount: number;
  pricePerCubicUsd: number;
};
```

- [ ] **Step 5: `createSale` ichida `transportId` ni saqlash**

`src/lib/actions/sales.ts` — `saleItems` insert qismida:
```ts
await tx.insert(saleItems).values({
  saleId: newSale.id,
  timberId: item.timberId ?? null,
  warehouseId: item.warehouseId ?? null,
  transportId: item.transportId ?? null,   // ← QO'SH
  thicknessMm: item.thicknessMm,
  ...
});
```

- [ ] **Step 6: Migration yaratish va ishlatish**
```bash
cd "c:\Users\user\Desktop\akmal aka\wood-erp"
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## TASK 2 (Frontend): SaleModal to'liq qayta yozish

**Files:**
- Modify: `src/app/(dashboard)/sales/_components/SaleModal.tsx`

### Yangi dizayn:

**Forma tuzilishi (single form, no tabs):**
1. Mijoz (Müjoz) — select (wood_buyer)
2. To'lov turi — radio (naqd/qarz/aralash)
3. "Yog'och sotuvi" bo'limi — timber qatorlar jadvali
4. "Ombordan qo'shish" bo'limi — mavjud, o'zgarishsiz
5. Jami + Saqlash tugmasi

**Yangi `CartItem` tipi:**
```ts
type CartItem = {
  thicknessMm: string;
  widthMm: string;
  lengthM: string;
  sentCount: string;
  transportId: string;    // wagon/truck id yoki ""
  pricePerCubicUsd: string;
  warehouseId?: number;   // ombordan qo'shilgan bo'lsa
};
```

**State o'zgarishlari:**
- Olib tashlash: `step`, `selectedWagonId`, `selectedTimberId`, `sentCount` (number), `pricePerCubicUsd` (number), `manualThickness/Width/Length/Count/Price`
- Qoldirish: `customerId`, `paymentType`, `cart` (CartItem[]), `saving`, `error`
- Ombordan o'zgarishsiz: `selectedWarehouseId`, `warehouseSentCount`, `warehousePrice`

**Yangi timber jadvali UI:**

```tsx
{/* Yog'och sotuvi */}
<div>
  <div className="flex items-center justify-between mb-2">
    <p className="text-sm font-semibold text-slate-700">Yog&apos;och sotuvi</p>
    <button onClick={handleAddRow} className="text-xs text-blue-600 hover:text-blue-800">
      + Qator qo&apos;shish
    </button>
  </div>
  <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200">
        <th className="px-2 py-2 text-left text-slate-600">Qalinlik mm</th>
        <th className="px-2 py-2 text-left text-slate-600">Eni mm</th>
        <th className="px-2 py-2 text-left text-slate-600">Uzunlik m</th>
        <th className="px-2 py-2 text-left text-slate-600">Yuborish soni</th>
        <th className="px-2 py-2 text-left text-slate-600">Vagon</th>
        <th className="px-2 py-2 text-left text-slate-600">$/m³</th>
        <th className="px-2 py-2 text-left text-slate-600">Kub m³</th>
        <th className="px-2 py-2"></th>
      </tr>
    </thead>
    <tbody>
      {cart.map((row, idx) => {
        const kub = calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount);
        return (
          <tr key={idx} className="border-b border-slate-100">
            <td><NumberInput value={row.thicknessMm} onChange={e => handleRowChange(idx, "thicknessMm", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none" /></td>
            <td><NumberInput value={row.widthMm} onChange={e => handleRowChange(idx, "widthMm", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none" /></td>
            <td><NumberInput value={row.lengthM} onChange={e => handleRowChange(idx, "lengthM", e.target.value)} className="w-14 border border-slate-300 rounded px-1 py-1 text-xs outline-none" /></td>
            <td><NumberInput value={row.sentCount} onChange={e => handleRowChange(idx, "sentCount", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none" /></td>
            <td>
              <select value={row.transportId} onChange={e => handleRowChange(idx, "transportId", e.target.value)}
                className="border border-slate-300 rounded px-1 py-1 text-xs outline-none w-28">
                <option value="">— Ixtiyoriy —</option>
                {availableTransports.map(tr => (
                  <option key={tr.id} value={tr.id}>{tr.number ?? `#${tr.id}`}</option>
                ))}
              </select>
            </td>
            <td><NumberInput value={row.pricePerCubicUsd} onChange={e => handleRowChange(idx, "pricePerCubicUsd", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none" /></td>
            <td className="px-2 text-slate-500">{kub.toFixed(3)}</td>
            <td>
              <button onClick={() => handleRemoveRow(idx)} className="text-red-400 hover:text-red-600 px-1">✕</button>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>

  {/* Jami */}
  <div className="flex justify-between items-center mt-2 text-xs text-slate-600">
    <span>Jami kub jo&apos;natiladigan: <b>{totalCub.toFixed(3)} m³</b></span>
    <span className="text-green-700 font-semibold">Jami: ${totalUsd.toFixed(2)}</span>
  </div>
</div>
```

**Yangi funksiyalar:**
```ts
function handleAddRow() {
  setCart(prev => [...prev, { thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "", pricePerCubicUsd: "" }]);
}

function handleRemoveRow(idx: number) {
  setCart(prev => prev.filter((_, i) => i !== idx));
}

function handleRowChange(idx: number, field: keyof CartItem, value: string) {
  setCart(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
}
```

**`calcCub` string version:**
```ts
function calcCub(t: string, w: string, l: string, c: string): number {
  return (parseFloat(t)||0)/1000 * (parseFloat(w)||0)/1000 * (parseFloat(l)||0) * (parseFloat(c)||0);
}
```

**`totalCub` va `totalUsd` hisob:**
```ts
const totalCub = cart.reduce((sum, row) => sum + calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount), 0);
const totalUsd = cart.reduce((sum, row) => {
  const kub = calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount);
  return sum + kub * (parseFloat(row.pricePerCubicUsd) || 0);
}, 0);
```

**`availableTransports`:**
```ts
const availableTransports = transports.filter(t => t.status !== "closed");
```

**handleSubmit:**
```ts
items: cart
  .filter(row => parseFloat(row.sentCount) > 0 && parseFloat(row.pricePerCubicUsd) > 0)
  .map(row => ({
    thicknessMm: parseInt(row.thicknessMm) || 0,
    widthMm: parseInt(row.widthMm) || 0,
    lengthM: parseFloat(row.lengthM) || 0,
    sentCount: parseInt(row.sentCount) || 0,
    pricePerCubicUsd: parseFloat(row.pricePerCubicUsd) || 0,
    transportId: row.transportId ? parseInt(row.transportId) : undefined,
  })),
```

**handleClose: cart = []** (1 boshlang'ich qator bilan)
```ts
setCart([{ thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "", pricePerCubicUsd: "" }]);
```

**Olib tashlanadigan qismlar:**
- `step` state va tab UI
- `selectedWagonId`, `selectedTimberId` state
- `handleAddToCart`, `handleAddManual` funksiyalar
- Manual inputs (manualThickness/Width/Length/Count/Price)
- Wagon selector → timber list → "Savatga qo'shish" UI bloki

**Qoldirilgan qismlar (o'zgarmaydi):**
- Ombordan qo'shish bo'limi (selectedWarehouseId, warehouseSentCount, warehousePrice)
- handleAddFromWarehouse — faqat ombordan cartga qo'shadi (wareouseId bilan)

**Ombordan cart item turi:**
```ts
// Ombor cart itemlari type dan farq qilmaydi, lekin warehouseId bor va thicknessMm/widthMm/lengthM string sifatida
```
Ombordan qo'shishda `handleAddFromWarehouse`:
```ts
function handleAddFromWarehouse() {
  const wItem = warehouseItems.find(w => w.id === selectedWarehouseId);
  if (!wItem || warehouseSentCount < 1 || warehouseSentCount > wItem.quantity || warehousePrice <= 0) return;
  setCart(prev => [...prev, {
    thicknessMm: String(wItem.thicknessMm),
    widthMm: String(wItem.widthMm),
    lengthM: wItem.lengthM,
    sentCount: String(warehouseSentCount),
    transportId: "",
    pricePerCubicUsd: String(warehousePrice),
    warehouseId: wItem.id,
  }]);
  setSelectedWarehouseId("");
  setWarehouseSentCount(1);
  setWarehousePrice(0);
}
```

**Validatsiya (handleSubmit):**
```ts
const validItems = cart.filter(row =>
  parseInt(row.thicknessMm) > 0 &&
  parseInt(row.widthMm) > 0 &&
  parseFloat(row.lengthM) > 0 &&
  parseInt(row.sentCount) > 0 &&
  parseFloat(row.pricePerCubicUsd) > 0
);
if (validItems.length === 0) { setError("Kamida bitta to'liq yog'och qatori kiriting"); return; }
```

---

## TASK 3 (Frontend): Wagon status badges + Unload dialog

**Files:**
- Modify: `src/app/(dashboard)/wagons/_components/WagonTable.tsx`
- Modify: `src/app/(dashboard)/wagons/page.tsx`

### Step 1: WagonTable — status badge qo'shish

Status badge funksiyasi:
```ts
function StatusBadge({ status }: { status: TransportStatus }) {
  const map: Record<TransportStatus, { label: string; className: string }> = {
    in_transit: { label: "Yo'lda", className: "bg-yellow-100 text-yellow-700" },
    at_border: { label: "Chegara", className: "bg-orange-100 text-orange-700" },
    arrived: { label: "Yetib kelgan", className: "bg-blue-100 text-blue-700" },
    unloaded: { label: "Tushirilgan", className: "bg-purple-100 text-purple-700" },
    closed: { label: "Yopilgan", className: "bg-slate-100 text-slate-500" },
  };
  const s = map[status];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>;
}
```

WagonTable jadval headeriga "Status" ustuni qo'sh (location ustunidan keyin):
```tsx
<th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
  Status
</th>
```

Har transport qatoriga status badge:
```tsx
<td className="px-4 py-3">
  <StatusBadge status={transport.status} />
</td>
```

### Step 2: WagonTable — "Tushurish" tugmasi qo'shish

`WagonTableProps` ga prop qo'sh:
```ts
onUnload: (transport: Transport) => void;
```

Tugmalar qismida (`!isClosed` bloki ichida, `arrived` statusda):
```tsx
{transport.status === "arrived" && (
  <button
    onClick={() => onUnload(transport)}
    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
    title="Tushurish"
  >
    <PackageOpen size={14} />
  </button>
)}
```
Import: `import { Pencil, Trash2, ChevronDown, ChevronUp, Lock, PackageOpen } from "lucide-react";`

### Step 3: wagons/page.tsx — UnloadChoiceDialog qo'shish

Yangi state va handler:
```ts
const [unloadTarget, setUnloadTarget] = useState<Transport | null>(null);
const [isUnloadLoading, setIsUnloadLoading] = useState(false);
const [unloadChoice, setUnloadChoice] = useState<"close" | "unload" | null>(null);
```

```ts
function handleUnloadRequest(transport: Transport) {
  setUnloadTarget(transport);
}

async function handleUnloadConfirm(choice: "close" | "unload") {
  if (!unloadTarget) return;
  setIsUnloadLoading(true);
  try {
    if (choice === "close") {
      await closeTransport(unloadTarget.id);
    } else {
      await unloadTransport(unloadTarget.id);
    }
    setUnloadTarget(null);
    await loadData();
  } catch (err) {
    console.error("Tushirishda xato:", err);
  } finally {
    setIsUnloadLoading(false);
  }
}
```

`unloadTransport` importini qo'sh:
```ts
import { getTransports, deleteTransport, closeTransport, getTransport, unloadTransport } from "@/lib/actions/wagons";
```

WagonTable ga prop qo'sh:
```tsx
<WagonTable
  transports={allTransports}
  onEdit={handleEdit}
  onDelete={handleDeleteRequest}
  onClose={handleCloseRequest}
  onUnload={handleUnloadRequest}   // ← QO'SH
/>
```

**UnloadChoiceDialog** — Modal bilan quyidagi UI:
```tsx
{/* Tushurish dialog */}
{unloadTarget && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
      <h3 className="text-base font-semibold text-slate-800 mb-2">Vagonni tushirish</h3>
      <p className="text-sm text-slate-600 mb-4">
        {unloadTarget.number ?? `Vagon #${unloadTarget.id}`} — qanday holat tanlaysiz?
      </p>
      <div className="space-y-2">
        <button
          disabled={isUnloadLoading}
          onClick={() => handleUnloadConfirm("unload")}
          className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Tushirilgan rejimga o&apos;tkazish
        </button>
        <button
          disabled={isUnloadLoading}
          onClick={() => handleUnloadConfirm("close")}
          className="w-full px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          Yopilsin (barcha yog&apos;ochlar jo&apos;natilgan)
        </button>
        <button
          disabled={isUnloadLoading}
          onClick={() => setUnloadTarget(null)}
          className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Bekor qilish
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Tekshirish

Har TASK tugagach:
```bash
cd "c:\Users\user\Desktop\akmal aka\wood-erp"
npx tsc --noEmit
```

0 TypeScript xato bo'lishi kerak.
