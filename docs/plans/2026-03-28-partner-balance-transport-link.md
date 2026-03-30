# Hamkor Operatsiyalarda Vagon/Truck Raqami — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hamkorlar bo'limidagi operatsiyalar ro'yxatida har bir yozuvda qaysi vagon yoki yuk mashinasi bilan bog'liq ekanligini ko'rsatish.

**Architecture:** `partnerBalances` jadvaliga `transportId` ustuni qo'shiladi. `createTransport` va `closeTransport` da balance yozuvlari `transportId` bilan saqlanadi. `getPartnerWithBalance` transport relation ni qaytaradi. `PartnerDetail.tsx` da transport number ko'rsatiladi.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL

---

## Fayl strukturasi

| Fayl | O'zgarish |
|------|-----------|
| `src/db/schema.ts` | MODIFY — `partnerBalances` ga `transportId` ustuni + relation |
| `src/lib/actions/wagons.ts` | MODIFY — `createTransport`, `closeTransport` da `transportId` uzatish |
| `src/lib/actions/partners.ts` | MODIFY — `getPartnerWithBalance` transport bilan, `recordPayment` ga optional transportId |
| `src/app/(dashboard)/partners/_components/PartnerDetail.tsx` | MODIFY — transport number ko'rsatish |

---

## Task 1: DB Schema + Migration

**Agent:** Backend Botir

**Files:**
- Modify: `src/db/schema.ts`

**SPEC:**

### `partnerBalances` jadvaliga ustun qo'shish:

```typescript
// partnerBalances ichiga (docNumber dan keyin):
transportId: integer("transport_id").references(() => transports.id),
```

`partnerBalances` hozirgi holat (line ~70-82):
```typescript
export const partnerBalances = pgTable("partner_balances", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("usd"),
  description: text("description"),
  notes: text("notes"),
  docNumber: varchar("doc_number", { length: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Yangi holat:
```typescript
export const partnerBalances = pgTable("partner_balances", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("usd"),
  description: text("description"),
  notes: text("notes"),
  docNumber: varchar("doc_number", { length: 4 }),
  transportId: integer("transport_id").references(() => transports.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### `partnerBalancesRelations` ga transport relation qo'shish:

`partnerBalancesRelations` ni topib, `transport: one(transports, ...)` qo'shish:
```typescript
export const partnerBalancesRelations = relations(partnerBalances, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerBalances.partnerId],
    references: [partners.id],
  }),
  transport: one(transports, {
    fields: [partnerBalances.transportId],
    references: [transports.id],
  }),
}));
```

### Migration:
```bash
cd "c:\Users\user\Desktop\akmal aka\wood-erp"
npx drizzle-kit push --force
```

### TypeScript check:
```bash
npx tsc --noEmit
```

- [ ] **Step 1:** `partnerBalances` ga `transportId` ustun qo'shish
- [ ] **Step 2:** `partnerBalancesRelations` ga `transport` relation qo'shish
- [ ] **Step 3:** `npx drizzle-kit push --force`
- [ ] **Step 4:** `npx tsc --noEmit` — 0 xato

---

## Task 2: Backend — createTransport va closeTransport yangilash

**Agent:** Backend Botir (Task 1 tugagandan keyin)

**Files:**
- Modify: `src/lib/actions/wagons.ts`

**CONTEXT:**

`createTransport` da `partnerBalances` insertlar `transportId` uzatmaydi. `closeTransport` da ham shunday.

`transport.id` allaqachon mavjud (transport yaratilgandan keyin returning() orqali olinadi).

**SPEC:**

### `createTransport` ichida barcha `tx.insert(partnerBalances).values({...})` ga `transportId: transport.id` qo'shish:

1. **Kod UZ** partner balance (line ~97-103):
```typescript
await tx.insert(partnerBalances).values({
  partnerId: data.codeUzSupplierId,
  amount: String(amount),
  currency: "usd",
  description: "Kod UZ xarajati",
  transportId: transport.id,  // YANGI
});
```

2. **Kod KZ** partner balance (line ~109-115):
```typescript
await tx.insert(partnerBalances).values({
  partnerId: data.codeKzSupplierId,
  amount: String(amount),
  currency: "usd",
  description: "Kod KZ xarajati",
  transportId: transport.id,  // YANGI
});
```

3. **Standart xarajatlar** loop ichida (line ~158-168):
```typescript
await tx.insert(partnerBalances).values({
  partnerId: expense.partnerId,
  amount: String(amount),
  currency: "usd",
  description: expense.description,
  transportId: transport.id,  // YANGI
});
```

### `closeTransport` ichida supplier partner balance ga `transportId: id` qo'shish (line ~309-317):
```typescript
await tx.insert(partnerBalances).values({
  partnerId: transport.supplierId,
  amount: String(totalUsd),
  currency: "usd",
  description: `Vagon yopildi — to'lov amalga oshirildi`,
  transportId: id,  // YANGI
});
```

- [ ] **Step 1:** `createTransport` da barcha 3 ta `partnerBalances` insertga `transportId: transport.id` qo'shish
- [ ] **Step 2:** `closeTransport` da supplier balance insertga `transportId: id` qo'shish
- [ ] **Step 3:** `npx tsc --noEmit` — 0 xato

---

## Task 3: Backend — getPartnerWithBalance yangilash

**Agent:** Backend Botir (Task 2 tugagandan keyin)

**Files:**
- Modify: `src/lib/actions/partners.ts`

**SPEC:**

`getPartnerWithBalance` da `partnerBalances` ni transport bilan olish:

Hozirgi holat (line ~27-38):
```typescript
const balances = await db
  .select()
  .from(partnerBalances)
  .where(eq(partnerBalances.partnerId, id));
```

Yangi holat:
```typescript
const balances = await db.query.partnerBalances.findMany({
  where: eq(partnerBalances.partnerId, id),
  with: {
    transport: true,
  },
  orderBy: (b, { desc }) => [desc(b.createdAt)],
});
```

Return type yangilanadi — `balances` endi `transport: { id, number, type } | null` maydoniga ega bo'ladi.

- [ ] **Step 1:** `getPartnerWithBalance` da `db.query.partnerBalances.findMany` + `with: { transport: true }`
- [ ] **Step 2:** `npx tsc --noEmit` — 0 xato

---

## Task 4: Frontend — PartnerDetail transport number ko'rsatish

**Agent:** Frontend Farid (Task 3 tugagandan keyin)

**Files:**
- Modify: `src/app/(dashboard)/partners/_components/PartnerDetail.tsx`

**CONTEXT:**

Hozirgi `PartnerDetail.tsx` da `balances` type:
```typescript
balances: Array<{
  id: number;
  amount: string;
  currency: string | null;
  description: string | null;
  createdAt: Date | string | null;
}>;
```

`getPartnerWithBalance` endi transport qaytaradi — type yangilanishi kerak.

**SPEC:**

### Type yangilash:
```typescript
balances: Array<{
  id: number;
  amount: string;
  currency: string | null;
  description: string | null;
  createdAt: Date | string | null;
  transport: { id: number; number: string | null; type: string } | null;  // YANGI
}>;
```

### Operatsiyalar ro'yxatida transport number ko'rsatish:

Hozirgi qator (description ko'rsatadi):
```tsx
<span className="text-slate-600">
  {b.description ?? "—"}
</span>
```

Yangi holat — description + transport number/badge:
```tsx
<div className="flex items-center gap-2">
  <span className="text-slate-600">
    {b.description ?? "—"}
  </span>
  {b.transport?.number && (
    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
      {b.transport.number}
    </span>
  )}
</div>
```

- [ ] **Step 1:** `PartnerWithBalance` type ga `transport` qo'shish
- [ ] **Step 2:** Operatsiyalar ro'yxatida transport number badge ko'rsatish
- [ ] **Step 3:** `npx tsc --noEmit` — 0 xato

---

## Tekshirish

- [ ] Hamkorlar → NDS Xizmati → operatsiyalar ro'yxatida "NDS xarajati" yonida vagon raqami (masalan: `11111111`) ko'rinadi
- [ ] Rossiya ta'minotchisi → "Vagon yopildi — to'lov..." yonida vagon raqami ko'rinadi
- [ ] Qo'lda kiritilgan to'lovlar (transport yo'q) — faqat description ko'rinadi, transport badge yo'q
- [ ] `npx tsc --noEmit` — 0 xato
