# Savdo — Ombordan Sotish + Qabulda Yangi Yog'och

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Savdo yaratishda ombordagi yog'ochni ham tanlash imkoni. (2) Qabul qilishda savdoda bo'lmagan yangi yog'och (ombordagi) qo'shish imkoni.

**Architecture:**
- Feature 1 (ombordan sotish): Backend tayyor (`warehouseId` allaqachon saleItems da bor). Faqat frontend: page.tsx da `getWarehouse()`, SaleModal da warehouse section.
- Feature 2 (qabulda yangi item): Backend `receiveSale` ga `newItems` parametri qo'shiladi. Frontend SaleReceiveModal da warehouse selector + newItems list.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/lib/actions/sales.ts` | MODIFY — `receiveSale` ga `newItems` qo'shish |
| `src/app/(dashboard)/sales/page.tsx` | MODIFY — `getWarehouse()` yuklash, modallarga uzatish |
| `src/app/(dashboard)/sales/_components/SaleModal.tsx` | MODIFY — warehouse items section qo'shish |
| `src/app/(dashboard)/sales/_components/SaleReceiveModal.tsx` | MODIFY — yangi items qo'shish UI |

---

## Task 1: Backend — receiveSale yangilash (Backend Botir)

**Files:**
- Modify: `src/lib/actions/sales.ts`

**CONTEXT:**

Hozirgi `receiveSale` (sales.ts:123-125):
```typescript
export async function receiveSale(
  saleId: number,
  items: { itemId: number; receivedCount: number }[]
)
```

`saleItems` jadvali: `id, saleId, timberId?, warehouseId?, thicknessMm, widthMm, lengthM, sentCount, receivedCount, pricePerCubicUsd, totalUsd`

`SaleItemInput` type (sales.ts:17-25):
```typescript
type SaleItemInput = {
  timberId?: number;
  warehouseId?: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sentCount: number;
  pricePerCubicUsd: number;
};
```

**SPEC:**

`receiveSale` signatureni yangilash — `newItems` optional parametr:
```typescript
export async function receiveSale(
  saleId: number,
  items: { itemId: number; receivedCount: number }[],
  newItems?: SaleItemInput[]
)
```

Transaction ichida, mavjud items loop dan KEYIN (line ~174 atrofida), newItems ni qayta ishlash:
```typescript
// Yangi items qo'shish (qabul paytida qo'shilgan)
if (newItems && newItems.length > 0) {
  for (const newItem of newItems) {
    const kub =
      (newItem.thicknessMm / 1000) *
      (newItem.widthMm / 1000) *
      newItem.lengthM *
      newItem.sentCount;
    const totalUsd = kub * newItem.pricePerCubicUsd;

    // saleItems ga insert (sentCount = receivedCount — darhol qabul)
    await tx.insert(saleItems).values({
      saleId,
      timberId: newItem.timberId ?? null,
      warehouseId: newItem.warehouseId ?? null,
      thicknessMm: newItem.thicknessMm,
      widthMm: newItem.widthMm,
      lengthM: String(newItem.lengthM),
      sentCount: newItem.sentCount,
      receivedCount: newItem.sentCount,
      pricePerCubicUsd: String(newItem.pricePerCubicUsd),
      totalUsd: String(totalUsd),
    });

    // warehouseId bo'lsa → warehouse.quantity -= sentCount
    if (newItem.warehouseId) {
      const warehouseItem = await tx.query.warehouse.findFirst({
        where: eq(warehouse.id, newItem.warehouseId),
      });
      if (!warehouseItem || warehouseItem.quantity < newItem.sentCount) {
        throw new Error("Omborda yetarli miqdor yo'q");
      }
      await tx
        .update(warehouse)
        .set({ quantity: sql`${warehouse.quantity} - ${newItem.sentCount}` })
        .where(eq(warehouse.id, newItem.warehouseId));
    }

    // totalReceivedUsd ga qo'shish
    totalReceivedUsd += totalUsd;
  }
}
```

Muhim: `totalReceivedUsd` variable transaction ichida declare qilingan — yangi items unga qo'shiladi, keyin `sales` table yangilanadi.

- [ ] **Step 1:** `receiveSale` signature ga `newItems?: SaleItemInput[]` qo'shish
- [ ] **Step 2:** Transaction ichida newItems loop qo'shish (mavjud items dan keyin, totalReceivedUsd hisoblashdan oldin emas — KEYIN ham qo'shish)
- [ ] **Step 3:** `npx tsc --noEmit` — 0 xato

---

## Task 2: Frontend — page.tsx + SaleModal + SaleReceiveModal (Frontend Farid)

**Files:**
- Modify: `src/app/(dashboard)/sales/page.tsx`
- Modify: `src/app/(dashboard)/sales/_components/SaleModal.tsx`
- Modify: `src/app/(dashboard)/sales/_components/SaleReceiveModal.tsx`

**CONTEXT:**

`getWarehouse()` (warehouse.ts:8-16) — warehouse items bilan transport va timber qaytaradi:
```typescript
// Return type: Array<{ id, timberId, transportId, thicknessMm, widthMm, lengthM (string), quantity, transport: {...}, timber: {...} }>
```

Hozirgi page.tsx `loadData`:
```typescript
const [salesData, partnersData, transportsData] = await Promise.all([
  getSales(), getPartners(), getTransports("wagon"),
]);
```

`SaleModal` props: `partners`, `transports`
`SaleReceiveModal` props: `sale`

Hozirgi `SaleModal` da `CartItem`:
```typescript
type CartItem = {
  timberId?: number;
  thicknessMm: number; widthMm: number; lengthM: number;
  available: number; sentCount: number; pricePerCubicUsd: number;
};
```

---

### Step 1: page.tsx — getWarehouse import va state qo'shish

Import qo'shish:
```typescript
import { getWarehouse } from "@/lib/actions/warehouse";
```

State qo'shish:
```typescript
const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
```

Type qo'shish:
```typescript
type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};
```

`loadData` ga qo'shish:
```typescript
const [salesData, partnersData, transportsData, warehouseData] = await Promise.all([
  getSales(), getPartners(), getTransports("wagon"), getWarehouse(),
]);
setWarehouseItems(warehouseData as WarehouseItem[]);
```

### Step 2: page.tsx — SaleModal va SaleReceiveModal ga warehouseItems uzatish

`SaleModal` ga:
```tsx
<SaleModal
  ...
  warehouseItems={warehouseItems}
/>
```

`SaleReceiveModal` ga:
```tsx
<SaleReceiveModal
  ...
  warehouseItems={warehouseItems}
/>
```

---

### Step 3: SaleModal.tsx — warehouseItems prop va CartItem.warehouseId

Props interface ga qo'shish:
```typescript
interface SaleModalProps {
  isOpen: boolean; onClose: () => void; onSuccess: () => void;
  partners: Partner[];
  transports: TransportItem[];
  warehouseItems: WarehouseItem[];  // YANGI
}
```

Type qo'shish (TransportItem dan oldin):
```typescript
type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};
```

`CartItem` ga `warehouseId` qo'shish:
```typescript
type CartItem = {
  timberId?: number;
  warehouseId?: number;   // YANGI
  thicknessMm: number; widthMm: number; lengthM: number;
  available: number; sentCount: number; pricePerCubicUsd: number;
};
```

### Step 4: SaleModal.tsx — Warehouse items UI (Step 2 da, vagon timbers jadvalidan KEYIN, "Qo'lda qo'shish" dan OLDIN)

State qo'shish:
```typescript
const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "">("");
const [warehouseSentCount, setWarehouseSentCount] = useState(1);
const [warehousePrice, setWarehousePrice] = useState(0);
```

`handleAddFromWarehouse` funksiyasi:
```typescript
function handleAddFromWarehouse() {
  const wItem = warehouseItems.find((w) => w.id === selectedWarehouseId);
  if (!wItem || warehouseSentCount < 1 || warehouseSentCount > wItem.quantity || warehousePrice <= 0) return;
  setCart((prev) => [
    ...prev,
    {
      warehouseId: wItem.id,
      thicknessMm: wItem.thicknessMm,
      widthMm: wItem.widthMm,
      lengthM: parseFloat(wItem.lengthM),
      available: wItem.quantity,
      sentCount: warehouseSentCount,
      pricePerCubicUsd: warehousePrice,
    },
  ]);
  setSelectedWarehouseId("");
  setWarehouseSentCount(1);
  setWarehousePrice(0);
}
```

`resetForm` ga qo'shish:
```typescript
setSelectedWarehouseId("");
setWarehouseSentCount(1);
setWarehousePrice(0);
```

UI — vagon timbers dan keyin, "Qo'lda qo'shish" dan oldin:
```tsx
{/* ── Ombordan qo'shish ──────────────────────────────── */}
{warehouseItems.filter((w) => w.quantity > 0).length > 0 && (
  <div className="pt-4 border-t border-slate-200">
    <p className="text-sm font-medium text-slate-700 mb-2">Ombordan qo'shish</p>
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={selectedWarehouseId}
        onChange={(e) => {
          setSelectedWarehouseId(e.target.value ? Number(e.target.value) : "");
          setWarehouseSentCount(1);
        }}
        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— O'lcham tanlang —</option>
        {warehouseItems.filter((w) => w.quantity > 0).map((w) => (
          <option key={w.id} value={w.id}>
            {w.thicknessMm}×{w.widthMm}×{w.lengthM}m ({w.quantity} dona)
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Miqdor"
        min={1}
        max={warehouseItems.find((w) => w.id === selectedWarehouseId)?.quantity ?? 1}
        value={warehouseSentCount}
        onChange={(e) => setWarehouseSentCount(Number(e.target.value))}
        className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="number"
        placeholder="$/m³"
        min={0}
        step={0.01}
        value={warehousePrice || ""}
        onChange={(e) => setWarehousePrice(Number(e.target.value))}
        className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={handleAddFromWarehouse}
        disabled={!selectedWarehouseId || warehouseSentCount < 1 || warehousePrice <= 0}
        className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Ombor
      </button>
    </div>
  </div>
)}
```

### Step 5: SaleModal.tsx — handleSubmit da warehouseId uzatish

`createSale` items map da `warehouseId` qo'shish:
```typescript
items: cart.map((item) => ({
  timberId: item.timberId,
  warehouseId: item.warehouseId,   // YANGI
  thicknessMm: item.thicknessMm,
  widthMm: item.widthMm,
  lengthM: item.lengthM,
  sentCount: item.sentCount,
  pricePerCubicUsd: item.pricePerCubicUsd,
})),
```

---

### Step 6: SaleReceiveModal.tsx — warehouseItems prop va yangi items UI

Props interface ga qo'shish:
```typescript
interface SaleReceiveModalProps {
  isOpen: boolean; onClose: () => void; onSuccess: () => void;
  sale: SaleDetail | null;
  warehouseItems: WarehouseItem[];  // YANGI
}
```

Type qo'shish:
```typescript
type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};

type NewReceiveItem = {
  warehouseId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sentCount: number;
  pricePerCubicUsd: number;
};
```

State lar:
```typescript
const [newItems, setNewItems] = useState<NewReceiveItem[]>([]);
const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "">("");
const [newItemCount, setNewItemCount] = useState(1);
const [newItemPrice, setNewItemPrice] = useState(0);
```

`handleAddNewItem` funksiyasi:
```typescript
function handleAddNewItem() {
  const wItem = warehouseItems.find((w) => w.id === selectedWarehouseId);
  if (!wItem || newItemCount < 1 || newItemCount > wItem.quantity || newItemPrice <= 0) return;
  setNewItems((prev) => [
    ...prev,
    {
      warehouseId: wItem.id,
      thicknessMm: wItem.thicknessMm,
      widthMm: wItem.widthMm,
      lengthM: parseFloat(wItem.lengthM),
      sentCount: newItemCount,
      pricePerCubicUsd: newItemPrice,
    },
  ]);
  setSelectedWarehouseId("");
  setNewItemCount(1);
  setNewItemPrice(0);
}
```

`handleClose` da reset:
```typescript
setNewItems([]);
setSelectedWarehouseId("");
setNewItemCount(1);
setNewItemPrice(0);
```

`handleSubmit` da newItems uzatish:
```typescript
await receiveSale(
  sale.id,
  sale.items.map((item) => ({
    itemId: item.id,
    receivedCount: receivedCounts[item.id] ?? 0,
  })),
  newItems.length > 0 ? newItems : undefined
);
```

UI — mavjud "Qabul soni" jadvalidan KEYIN, error dan OLDIN:

```tsx
{/* ── Ombordan yangi item qo'shish ───────────────────── */}
{warehouseItems.filter((w) => w.quantity > 0).length > 0 && (
  <div className="pt-4 border-t border-slate-200">
    <p className="text-sm font-semibold text-slate-700 mb-3">Qo'shimcha qabul (ombordan)</p>

    {/* Qo'shilgan yangi items */}
    {newItems.length > 0 && (
      <div className="mb-3 space-y-1">
        {newItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-slate-700">{item.thicknessMm}×{item.widthMm}×{item.lengthM}m — {item.sentCount} dona</span>
            <button
              onClick={() => setNewItems((prev) => prev.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-600 ml-3"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    )}

    {/* Yangi item qo'shish form */}
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={selectedWarehouseId}
        onChange={(e) => {
          setSelectedWarehouseId(e.target.value ? Number(e.target.value) : "");
          setNewItemCount(1);
        }}
        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— O'lcham tanlang —</option>
        {warehouseItems.filter((w) => w.quantity > 0).map((w) => (
          <option key={w.id} value={w.id}>
            {w.thicknessMm}×{w.widthMm}×{w.lengthM}m ({w.quantity} dona)
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Miqdor"
        min={1}
        max={warehouseItems.find((w) => w.id === selectedWarehouseId)?.quantity ?? 1}
        value={newItemCount}
        onChange={(e) => setNewItemCount(Number(e.target.value))}
        className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="number"
        placeholder="$/m³"
        min={0}
        step={0.01}
        value={newItemPrice || ""}
        onChange={(e) => setNewItemPrice(Number(e.target.value))}
        className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={handleAddNewItem}
        disabled={!selectedWarehouseId || newItemCount < 1 || newItemPrice <= 0}
        className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Qo'shish
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 1:** page.tsx — `WarehouseItem` type, `warehouseItems` state, `getWarehouse` import+load
- [ ] **Step 2:** page.tsx — `warehouseItems` ni SaleModal va SaleReceiveModal ga uzatish
- [ ] **Step 3:** SaleModal.tsx — `WarehouseItem` type, props ga qo'shish, `CartItem.warehouseId`
- [ ] **Step 4:** SaleModal.tsx — warehouse state lar, `handleAddFromWarehouse`, UI section, resetForm
- [ ] **Step 5:** SaleModal.tsx — `handleSubmit` da `warehouseId` uzatish
- [ ] **Step 6:** SaleReceiveModal.tsx — types, props, state lar, `handleAddNewItem`, `handleClose`, `handleSubmit`
- [ ] **Step 7:** SaleReceiveModal.tsx — yangi items UI qo'shish
- [ ] **Step 8:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Savdo → "Yog'och qo'shish" → "Ombordan qo'shish" bo'limi ko'rinadi (ombor bo'sh bo'lmasa)
- [ ] Ombordan item tanlash → miqdor va narx kiritib "+ Ombor" → cart ga qo'shiladi (`warehouseId` bilan)
- [ ] Saqlash → savdo yaratiladi, ombor itemlarining `warehouseId` bor
- [ ] Qabul qilish modal → "Qo'shimcha qabul (ombordan)" bo'limi ko'rinadi
- [ ] Ombordan item qo'shib "Qabul tasdiqlash" → savdoga yangi `saleItem` qo'shiladi, ombor `quantity` kamayadi
- [ ] `npx tsc --noEmit` — 0 xato
