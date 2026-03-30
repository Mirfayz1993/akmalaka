# SaleModal UI Redesign — Tabs olib tashlanib, qo'lda yog'och kiritish

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SaleModal.tsx ni qayta yozish: tabs yo'q, customer yuqorida, WagonModal uslubida timber qatorlari (qo'lda dimensions + vagon selector + global $/m³ narx), "Jami kub jo'natiladigan", "Yog'och sotuvi" section.

**Architecture:** Faqat frontend o'zgaradi. Backend `createSale` → `SaleItemInput.transportId?: number` qo'shiladi (optional). Har bir timber qatorida: Qalinligi, Eni, Uzunligi, Yuborish soni, Vagon (optional select), Kub. Global $/m³ narx. "Ombordan qo'shish" section pastda saqlanadi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/lib/actions/sales.ts` | MODIFY — `SaleItemInput` ga `transportId?: number` qo'shish |
| `src/app/(dashboard)/sales/_components/SaleModal.tsx` | MODIFY — to'liq qayta yozish |

---

## Task 1: Backend — sales.ts (Backend Botir)

**Files:**
- Modify: `src/lib/actions/sales.ts`

**SPEC:**

`SaleItemInput` type ga `transportId?: number` qo'shish:

```typescript
type SaleItemInput = {
  timberId?: number;
  warehouseId?: number;
  transportId?: number;   // YANGI — qaysi vagondan ekanligini ko'rsatadi
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sentCount: number;
  pricePerCubicUsd: number;
};
```

`createSale` ichida `saleItems.insert` da `transportId` ni ham qo'shish. `saleItems` jadvalida `transportId` kolonnasi YO'Q — shu sababli bu maydon saqlanmaydi, faqat log/note uchun ishlatiladi (frontend reference).

**MUHIM:** `saleItems` jadvalida `transport_id` kolonnasi yo'q (schema.ts:237-252). Shuning uchun backend `SaleItemInput.transportId` ni qabul qiladi lekin DB ga saqlamaydi. Bu faqat frontend state uchun.

- [ ] **Step 1:** `SaleItemInput` ga `transportId?: number` qo'shish
- [ ] **Step 2:** `npx tsc --noEmit` — 0 xato

---

## Task 2: Frontend — SaleModal.tsx (Frontend Farid)

**Files:**
- Modify: `src/app/(dashboard)/sales/_components/SaleModal.tsx`

**CONTEXT:**

Hozirgi SaleModal:
- 2 tab (Step 1: Asosiy, Step 2: Yog'och qo'shish)
- Step 1: customer, paymentType
- Step 2: wagon selector → timber table → add form; ombordan qo'shish; qo'lda qo'shish; cart

Yangi SaleModal — BITTA forma:

```
Yangi savdo
├── Mijoz [dropdown]
├── To'lov turi [radio: Naqd / Qarz / Aralash]
├── ─── Yog'ochlar ───────────────────────────────
│   ├── [Header]: Qalinligi | Eni | Uzunligi | Yuborish soni | Vagon | Kub m³ | [x]
│   ├── [Row 1]: [input] | [input] | [input] | [input] | [wagon select] | 0.000 | [trash]
│   ├── [Row 2]: ...
│   ├── + Qator qo'shish
│   └── Jami kub jo'natiladigan: 0.000 m³
├── ─── Yog'och sotuvi ───────────────────────────
│   ├── $/m³: [input]
│   └── Jami: $0.00
├── ─── Ombordan qo'shish ─── (agar warehouseItems.length > 0)
│   ├── [O'lcham dropdown] [Miqdor] [$/m³] [+ Ombor button]
├── [Error]
└── [Bekor qilish] [Saqlash]
```

**SPEC:**

### Type o'zgarishlari

```typescript
type SaleRow = {
  thicknessMm: string;
  widthMm: string;
  lengthM: string;
  sentCount: string;
  transportId: string;  // vagon id string yoki ""
};

type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};

type TransportItem = {
  id: number;
  number: string | null;
  status: string;
  timbers: Array<{
    id: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: string | number;
    tashkentCount: number;
    customerCount: number;
  }>;
};
```

### Props

```typescript
interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: Partner[];
  transports: TransportItem[];
  warehouseItems: WarehouseItem[];
}
```

### State lar

```typescript
const [customerId, setCustomerId] = useState<number | "">("");
const [paymentType, setPaymentType] = useState<"cash" | "debt" | "mixed">("cash");
const [pricePerCubicUsd, setPricePerCubicUsd] = useState("");  // global narx
const [rows, setRows] = useState<SaleRow[]>([
  { thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "" },
]);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);

// Ombordan qo'shish state lar
const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "">("");
const [warehouseSentCount, setWarehouseSentCount] = useState(1);
const [warehousePrice, setWarehousePrice] = useState(0);
// Ombor cart (alohida, asosiy rows dan ajratilgan)
const [warehouseCart, setWarehouseCart] = useState<CartItem[]>([]);
```

### Yordamchi funksiyalar

```typescript
function calcCub(thicknessMm: string, widthMm: string, lengthM: string, count: string): number {
  const t = parseFloat(thicknessMm) || 0;
  const w = parseFloat(widthMm) || 0;
  const l = parseFloat(lengthM) || 0;
  const c = parseFloat(count) || 0;
  return (t / 1000) * (w / 1000) * l * c;
}

const totalCubRows = rows.reduce(
  (sum, row) => sum + calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount),
  0
);

const totalCubWarehouse = warehouseCart.reduce(
  (sum, item) => sum + calcCub(
    String(item.thicknessMm), String(item.widthMm), String(item.lengthM), String(item.sentCount)
  ), 0
);

const totalCub = totalCubRows + totalCubWarehouse;

const globalPrice = parseFloat(pricePerCubicUsd) || 0;

const totalUsd = rows.reduce((sum, row) => {
  return sum + calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount) * globalPrice;
}, 0) + warehouseCart.reduce((sum, item) => {
  const kub = calcCub(String(item.thicknessMm), String(item.widthMm), String(item.lengthM), String(item.sentCount));
  return sum + kub * item.pricePerCubicUsd;
}, 0);
```

### Vagon filtri

```typescript
const availableWagons = transports.filter((t) => t.status !== "closed");
const woodBuyers = partners.filter((p) => p.type === "wood_buyer");
```

### Row boshqaruv funksiyalari

```typescript
function handleRowChange(idx: number, field: keyof SaleRow, value: string) {
  setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
}

function handleAddRow() {
  setRows((prev) => [
    ...prev,
    { thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "" },
  ]);
}

function handleRemoveRow(idx: number) {
  setRows((prev) => prev.filter((_, i) => i !== idx));
}
```

### Ombordan qo'shish

```typescript
// CartItem type (ombor uchun)
type CartItem = {
  warehouseId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  available: number;
  sentCount: number;
  pricePerCubicUsd: number;
};

function handleAddFromWarehouse() {
  const wItem = warehouseItems.find((w) => w.id === selectedWarehouseId);
  if (!wItem || warehouseSentCount < 1 || warehouseSentCount > wItem.quantity || warehousePrice <= 0) return;
  setWarehouseCart((prev) => [
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

### handleSubmit

```typescript
async function handleSubmit() {
  if (!customerId) { setError("Mijozni tanlang"); return; }

  const validRows = rows.filter((r) => r.thicknessMm && r.widthMm && r.lengthM && r.sentCount);
  if (validRows.length === 0 && warehouseCart.length === 0) {
    setError("Kamida bitta yog'och qo'shing");
    return;
  }
  if (!pricePerCubicUsd || parseFloat(pricePerCubicUsd) <= 0) {
    setError("$/m³ narxini kiriting");
    return;
  }

  setSaving(true);
  setError(null);
  try {
    await createSale({
      customerId: Number(customerId),
      paymentType,
      items: [
        ...validRows.map((row) => ({
          thicknessMm: parseInt(row.thicknessMm),
          widthMm: parseInt(row.widthMm),
          lengthM: parseFloat(row.lengthM),
          sentCount: parseInt(row.sentCount),
          pricePerCubicUsd: parseFloat(pricePerCubicUsd),
          transportId: row.transportId ? parseInt(row.transportId) : undefined,
        })),
        ...warehouseCart.map((item) => ({
          warehouseId: item.warehouseId,
          thicknessMm: item.thicknessMm,
          widthMm: item.widthMm,
          lengthM: item.lengthM,
          sentCount: item.sentCount,
          pricePerCubicUsd: item.pricePerCubicUsd,
        })),
      ],
    });
    handleClose();
    onSuccess();
  } catch (e) {
    setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
  } finally {
    setSaving(false);
  }
}
```

### handleClose (resetForm)

```typescript
function handleClose() {
  setCustomerId("");
  setPaymentType("cash");
  setPricePerCubicUsd("");
  setRows([{ thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "" }]);
  setSaving(false);
  setError(null);
  setSelectedWarehouseId("");
  setWarehouseSentCount(1);
  setWarehousePrice(0);
  setWarehouseCart([]);
  onClose();
}
```

### JSX tuzilishi

```tsx
<Modal isOpen={isOpen} onClose={handleClose} title="Yangi savdo" size="xl">
  <div className="space-y-5">
    {/* Mijoz */}
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Mijoz</label>
      <select value={customerId} onChange={...} className={selectClass}>
        <option value="">— Mijozni tanlang —</option>
        {woodBuyers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>

    {/* To'lov turi */}
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">To&apos;lov turi</label>
      <div className="flex gap-4">
        {(["cash", "debt", "mixed"] as const).map((type) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value={type} checked={paymentType === type} onChange={() => setPaymentType(type)} className="text-blue-600" />
            <span className="text-sm text-slate-700">
              {type === "cash" ? "Naqd" : type === "debt" ? "Qarz" : "Aralash"}
            </span>
          </label>
        ))}
      </div>
    </div>

    {/* Yog'ochlar section */}
    <section>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">Yog&apos;ochlar</h3>
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 font-medium px-1">
          <span>Qalinligi (mm)</span>
          <span>Eni (mm)</span>
          <span>Uzunligi (m)</span>
          <span>Yuborish soni</span>
          <span>Vagon</span>
          <span>Kub m³</span>
          <span></span>
        </div>

        {rows.map((row, idx) => {
          const cub = calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount);
          return (
            <div key={idx} className="grid grid-cols-7 gap-2 items-center">
              <NumberInput className={inputClass} placeholder="50" value={row.thicknessMm}
                onChange={(e) => handleRowChange(idx, "thicknessMm", e.target.value)} />
              <NumberInput className={inputClass} placeholder="100" value={row.widthMm}
                onChange={(e) => handleRowChange(idx, "widthMm", e.target.value)} />
              <NumberInput className={inputClass} placeholder="6" value={row.lengthM}
                onChange={(e) => handleRowChange(idx, "lengthM", e.target.value)} />
              <NumberInput className={inputClass} placeholder="100" value={row.sentCount}
                onChange={(e) => handleRowChange(idx, "sentCount", e.target.value)} />
              <select className={selectClass} value={row.transportId}
                onChange={(e) => handleRowChange(idx, "transportId", e.target.value)}>
                <option value="">— Vagon —</option>
                {availableWagons.map((w) => (
                  <option key={w.id} value={w.id}>{w.number ?? `#${w.id}`}</option>
                ))}
              </select>
              <span className="text-sm text-slate-700 font-medium">{cub.toFixed(3)}</span>
              <button onClick={() => handleRemoveRow(idx)}
                disabled={rows.length === 1}
                className="p-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}

        <button onClick={handleAddRow}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mt-2">
          <Plus size={15} />
          Qator qo&apos;shish
        </button>

        {/* Jami kub */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-sm text-slate-600">
            Jami kub jo&apos;natiladigan:{" "}
            <span className="font-semibold text-slate-800">{totalCub.toFixed(3)} m³</span>
          </span>
        </div>
      </div>
    </section>

    {/* Yog'och sotuvi section */}
    <section>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">
        Yog&apos;och sotuvi
      </h3>
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-slate-600 mb-1">$/m³</label>
          <NumberInput className={inputClass} placeholder="50" value={pricePerCubicUsd}
            onChange={(e) => setPricePerCubicUsd(e.target.value)} />
        </div>
        <div className="text-sm text-slate-600">
          Jami:{" "}
          <span className="font-semibold text-slate-800">${totalUsd.toFixed(2)}</span>
        </div>
      </div>
    </section>

    {/* Ombordan qo'shish (agar mavjud bo'lsa) */}
    {warehouseItems.filter((w) => w.quantity > 0).length > 0 && (
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">
          Ombordan qo&apos;shish
        </h3>
        {/* ... ombordan qo'shish UI (hozirgi kod) ... */}
        {/* warehouseCart items + add form */}
      </section>
    )}

    {/* Error */}
    {error && (
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    )}

    {/* Footer */}
    <div className="flex justify-end gap-3 pt-4 border-t">
      <button onClick={handleClose} disabled={saving}
        className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50">
        Bekor qilish
      </button>
      <button onClick={handleSubmit}
        disabled={saving || !customerId}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? "Saqlanmoqda..." : "Saqlash"}
      </button>
    </div>
  </div>
</Modal>
```

**MUHIM:**
- `Plus` va `Trash2` iconlarni `lucide-react` dan import qilish
- `NumberInput` import: `import NumberInput from "@/components/ui/NumberInput";`
- `inputClass` va `selectClass` konstantalari WagonModal dan ko'chirilsin:
  ```typescript
  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
  const selectClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white";
  ```
- "Ombordan qo'shish" — hozirgi `warehouseItems` filterlash va cart logikasi saqlanadi, lekin `warehouseCart` alohida array, `rows` ga qo'shilmaydi
- `step` state va tab UI OLIB TASHLANADI
- Eski `cart` array → `warehouseCart` (faqat warehouse items uchun)
- Eski `handleAddToCart`, `handleAddManual`, `selectedTimberId` — OLIB TASHLANADI

- [ ] **Step 1:** `step` state va tab UI ni olib tashlab, `rows: SaleRow[]` state qo'shish
- [ ] **Step 2:** Yangi state lar: `pricePerCubicUsd`, `rows`, `warehouseCart`
- [ ] **Step 3:** `handleRowChange`, `handleAddRow`, `handleRemoveRow` funksiyalari
- [ ] **Step 4:** `handleAddFromWarehouse` ni `warehouseCart` ga yozadigan qilish
- [ ] **Step 5:** `handleSubmit` yangilash — validRows + warehouseCart
- [ ] **Step 6:** `handleClose` (resetForm) yangilash
- [ ] **Step 7:** JSX — single form, Yog'ochlar section (grid rows), Yog'och sotuvi section, Ombordan qo'shish section
- [ ] **Step 8:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Modal ochilganda bitta sahifa (tab yo'q)
- [ ] Mijoz dropdown yuqorida
- [ ] Yog'ochlar jadvalida: Qalinligi, Eni, Uzunligi, Yuborish soni, Vagon, Kub
- [ ] "+ Qator qo'shish" ishlaydi
- [ ] Vagon dropdown da yopilmagan vagonlar ko'rinadi
- [ ] "Jami kub jo'natiladigan" to'g'ri hisoblanadi
- [ ] "Yog'och sotuvi" da $/m³ kiritilganda "Jami $" hisoblanadi
- [ ] Ombordan qo'shish section ishlaydi
- [ ] Saqlash → savdo yaratiladi
- [ ] `npx tsc --noEmit` — 0 xato
