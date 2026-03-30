# WagonEditModal — Truck Maydonlari + Qo'shimcha Xarajatlar

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WagonEditModal da (1) truck uchun egasi va to'lov maydonlari, (2) dinamik qo'shimcha xarajatlar bo'limi (transport_expenses jadvaliga).

**Architecture:** Backend — 2 ta yangi server action (`addTransportExpense`, `deleteTransportExpense`). Frontend — WagonEditModal.tsx ga truck maydonlari + dinamik expenses UI (real-time add/delete, `transport.expenses` dan yuklanadi).

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/lib/actions/wagons.ts` | MODIFY — 2 ta yangi server action qo'shish |
| `src/app/(dashboard)/wagons/_components/WagonEditModal.tsx` | MODIFY — truck maydonlari + qo'shimcha xarajatlar UI |

---

## Task 1: Backend — server actions (Backend Botir)

**Files:**
- Modify: `src/lib/actions/wagons.ts`

**CONTEXT:**

`transportExpenses` jadvali (schema.ts:150-160):
```typescript
export const transportExpenses = pgTable("transport_expenses", {
  id: serial("id").primaryKey(),
  transportId: integer("transport_id").references(() => transports.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  partnerId: integer("partner_id").references(() => partners.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

`updateTransport` (wagons.ts:184-201) — `Partial<typeof transports.$inferInsert>` qabul qiladi, demak `truckOwnerId` va `truckOwnerPayment` allaqachon ishlaydi — backend o'zgartirish kerak emas.

**SPEC:**

`transportExpenses` import qo'shish (agar yo'q bo'lsa):
```typescript
import { transports, transportLogs, partnerBalances, cashOperations, timbers, transportExpenses } from "@/db/schema";
```

### `addTransportExpense` server action:
```typescript
export async function addTransportExpense(
  transportId: number,
  data: { name: string; amount: string; partnerId?: number }
) {
  const [expense] = await db
    .insert(transportExpenses)
    .values({
      transportId,
      name: data.name,
      amount: data.amount,
      partnerId: data.partnerId,
    })
    .returning();
  revalidatePath("/wagons");
  return expense;
}
```

### `deleteTransportExpense` server action:
```typescript
export async function deleteTransportExpense(id: number) {
  await db.delete(transportExpenses).where(eq(transportExpenses.id, id));
  revalidatePath("/wagons");
}
```

- [ ] **Step 1:** `transportExpenses` ni import qatoriga qo'shish (agar yo'q bo'lsa)
- [ ] **Step 2:** `addTransportExpense` server action yozish
- [ ] **Step 3:** `deleteTransportExpense` server action yozish
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato

---

## Task 2: Frontend — WagonEditModal.tsx (Frontend Farid)

**Files:**
- Modify: `src/app/(dashboard)/wagons/_components/WagonEditModal.tsx`

**CONTEXT:**

`getTransport` (wagons.ts:35-49) `expenses` relationni qaytaradi — ya'ni `transport.expenses` allaqachon mavjud, lekin `FullTransport` interface da yo'q.

Hozirgi `FullTransport` interface da `truckOwnerId`, `truckOwnerPayment`, `expenses` MAVJUD EMAS.

Hozirgi imports (line 6):
```typescript
import { updateTransport } from "@/lib/actions/wagons";
```

**SPEC:**

### O'zgarish 1: FullTransport interface ga yangi maydonlar qo'shish

```typescript
interface ExpenseItem {
  id: number;
  name: string;
  amount: string;
  partnerId: number | null;
}

interface FullTransport {
  id: number;
  type: string;
  number: string | null;
  sentAt: string | null;
  arrivedAt: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  tonnage: string | null;
  supplierId: number | null;
  truckOwnerId: number | null;       // YANGI
  truckOwnerPayment: string | null;  // YANGI
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
  expenses: ExpenseItem[];           // YANGI
  timbers: TimberItem[];
}
```

### O'zgarish 2: Import yangilash

```typescript
import { updateTransport, addTransportExpense, deleteTransportExpense } from "@/lib/actions/wagons";
```

### O'zgarish 3: Yangi state lar (boshqa state lar qatoriga, line ~84 atrofida)

```typescript
// Truck fields
const [truckOwnerId, setTruckOwnerId] = useState("");
const [truckOwnerPayment, setTruckOwnerPayment] = useState("");

// Dynamic expenses
const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
const [newExpenseName, setNewExpenseName] = useState("");
const [newExpenseAmount, setNewExpenseAmount] = useState("");
const [newExpensePartnerId, setNewExpensePartnerId] = useState("");
```

### O'zgarish 4: useEffect ga yangi state larni to'ldirish (line ~138 atrofida)

```typescript
setTruckOwnerId(transport.truckOwnerId ? String(transport.truckOwnerId) : "");
setTruckOwnerPayment(transport.truckOwnerPayment ?? "");
setExpenses(transport.expenses ?? []);
```

### O'zgarish 5: Truck filter qo'shish (boshqa filterlar qatoriga, line ~174 atrofida)

```typescript
const truckOwners = partners.filter((p) => p.type === "truck_owner");
```

### O'zgarish 6: `handleAddExpense` va `handleDeleteExpense` funksiyalari

```typescript
async function handleAddExpense() {
  if (!transport || !newExpenseName.trim() || !newExpenseAmount) return;
  const expense = await addTransportExpense(transport.id, {
    name: newExpenseName.trim(),
    amount: newExpenseAmount,
    partnerId: newExpensePartnerId ? parseInt(newExpensePartnerId) : undefined,
  });
  setExpenses((prev) => [...prev, expense]);
  setNewExpenseName("");
  setNewExpenseAmount("");
  setNewExpensePartnerId("");
}

async function handleDeleteExpense(id: number) {
  await deleteTransportExpense(id);
  setExpenses((prev) => prev.filter((e) => e.id !== id));
}
```

### O'zgarish 7: `handleSave` ga truck maydonlari qo'shish (line ~233 atrofida `updateTransport` ichida)

```typescript
truckOwnerId: truckOwnerId ? parseInt(truckOwnerId) : undefined,
truckOwnerPayment: truckOwnerPayment || undefined,
```

### O'zgarish 8: Section 1 da truck uchun yangi UI (type === "truck" bo'lsa tonnaj o'rniga)

`{transport?.type === "wagon" && (...)}` Kodlar bo'limidan OLDIN, tonnaj maydonidan keyin qo'shish:

```tsx
{/* Truck uchun: egasi va to'lov */}
{transport?.type === "truck" && (
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

**Muhim:** Hozirgi `tonnage` maydoni ham faqat wagon uchun ko'rsatilishi kerak. Hozirgi `tonnage` input blokini `{transport?.type === "wagon" && (...)}` bilan o'rab qo'yish kerak.

### O'zgarish 9: Section 5 da dinamik xarajatlar (mavjud xarajatlar jadvalidan keyin, line ~748 atrofida, `</section>` dan oldin)

```tsx
{/* Mavjud qo'shimcha xarajatlar */}
{expenses.map((exp) => (
  <div key={exp.id} className="border border-slate-200 rounded-lg p-3 space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-600">{exp.name}</span>
      <button
        onClick={() => handleDeleteExpense(exp.id)}
        className="p-1 text-red-400 hover:text-red-600"
      >
        <Trash2 size={14} />
      </button>
    </div>
    <p className="text-sm text-slate-700">${Number(exp.amount).toFixed(2)}</p>
  </div>
))}

{/* Yangi qo'shimcha xarajat qo'shish */}
<div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
  <p className="text-xs font-medium text-slate-500">Qo'shimcha xarajat qo'shish</p>
  <input
    className={inputClass}
    placeholder="Nomi"
    value={newExpenseName}
    onChange={(e) => setNewExpenseName(e.target.value)}
  />
  <input
    type="number"
    className={inputClass}
    placeholder="Summa ($)"
    value={newExpenseAmount}
    onChange={(e) => setNewExpenseAmount(e.target.value)}
  />
  <select
    className={selectClass}
    value={newExpensePartnerId}
    onChange={(e) => setNewExpensePartnerId(e.target.value)}
  >
    <option value="">— {t.wagons.partner} —</option>
    {serviceProviders.map((p) => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
  <button
    onClick={handleAddExpense}
    disabled={!newExpenseName.trim() || !newExpenseAmount}
    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Plus size={15} />
    Qo'shish
  </button>
</div>
```

- [ ] **Step 1:** `ExpenseItem` interface va `FullTransport` ga yangi maydonlar qo'shish
- [ ] **Step 2:** Import yangilash (`addTransportExpense`, `deleteTransportExpense`)
- [ ] **Step 3:** Yangi state lar qo'shish (truckOwnerId, truckOwnerPayment, expenses va 3 ta newExpense state)
- [ ] **Step 4:** `useEffect` ga state to'ldirish
- [ ] **Step 5:** `truckOwners` filter qo'shish
- [ ] **Step 6:** `handleAddExpense` va `handleDeleteExpense` funksiyalari
- [ ] **Step 7:** `handleSave` ga truck maydonlari qo'shish
- [ ] **Step 8:** Section 1 da tonnage ni wagon-only qilish + truck UI qo'shish
- [ ] **Step 9:** Section 5 da dinamik xarajatlar UI qo'shish
- [ ] **Step 10:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Vagon tahrirlash → barcha oldingi maydonlar ishlaydi
- [ ] Vagon tahrirlash → Section 5 pastida "Qo'shimcha xarajat qo'shish" form ko'rinadi
- [ ] Yuk mashinasi tahrirlash → "Yuk mashina egasiga beriladigan pul" va egasi dropdown ko'rinadi (tonnage yo'q)
- [ ] Yuk mashinasi tahrirlash → Section 5 da ham qo'shimcha xarajatlar bo'limi ko'rinadi
- [ ] Xarajat qo'shish → ro'yxatda paydo bo'ladi, DB ga saqlanadi
- [ ] Xarajat o'chirish → ro'yxatdan yo'qoladi, DB dan o'chadi
- [ ] `npx tsc --noEmit` — 0 xato
