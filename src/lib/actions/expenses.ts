"use server";

import { db } from "@/db";
import { expenses, cashOperations } from "@/db/schema";
import { eq, sum, and } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type ExpenseCategory =
  | "transport"
  | "unloading"
  | "broker"
  | "customs"
  | "other";

export type ExpenseWithRelations = {
  id: number;
  wagonId: number | null;
  shipmentId: number | null;
  category: string;
  description: string;
  amountUsd: number;
  date: string;
  notes: string | null;
  createdAt: Date | null;
  wagon: {
    id: number;
    wagonNumber: string;
    shipmentId: number;
  } | null;
  shipment: {
    id: number;
    name: string;
  } | null;
};

export type CreateExpenseData = {
  wagonId?: number;
  shipmentId?: number;
  category: ExpenseCategory;
  description: string;
  amountUsd: number;
  date: string;
  notes?: string;
};

export type UpdateExpenseData = {
  wagonId?: number | null;
  shipmentId?: number | null;
  category?: ExpenseCategory;
  description?: string;
  amountUsd?: number;
  date?: string;
  notes?: string | null;
};

export type ExpenseFilters = {
  wagonId?: number;
  shipmentId?: number;
  category?: ExpenseCategory;
};

// ==========================================
// READ
// ==========================================

/**
 * Barcha xarajatlarni qaytaradi.
 * Ixtiyoriy filtrlar: wagonId, shipmentId, category.
 * wagon va shipment ma'lumotlari with: orqali birga keladi.
 */
export async function getExpenses(
  filters?: ExpenseFilters
): Promise<ExpenseWithRelations[]> {
  // Filtr yo'q — hammasi
  if (!filters || (!filters.wagonId && !filters.shipmentId && !filters.category)) {
    return (await db.query.expenses.findMany({
      with: {
        wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
        shipment: { columns: { id: true, name: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })) as ExpenseWithRelations[];
  }

  // Filtr bilan
  const conditions = [];

  if (filters.wagonId !== undefined) {
    conditions.push(eq(expenses.wagonId, filters.wagonId));
  }

  if (filters.shipmentId !== undefined) {
    conditions.push(eq(expenses.shipmentId, filters.shipmentId));
  }

  if (filters.category !== undefined) {
    conditions.push(eq(expenses.category, filters.category));
  }

  return (await db.query.expenses.findMany({
    where: conditions.length === 1 ? conditions[0] : and(...conditions),
    with: {
      wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
      shipment: { columns: { id: true, name: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })) as ExpenseWithRelations[];
}

/**
 * Bitta xarajatni ID bo'yicha qaytaradi.
 */
export async function getExpense(
  id: number
): Promise<ExpenseWithRelations | undefined> {
  return (await db.query.expenses.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
      shipment: { columns: { id: true, name: true } },
    },
  })) as ExpenseWithRelations | undefined;
}

/**
 * Berilgan partiyaga (shipmentId) tegishli barcha xarajatlar.
 * Ham to'g'ridan-to'g'ri shipmentId = X bo'lganlar,
 * ham shu partiyadagi vagonlarga bog'liq xarajatlar.
 * Faqat shipmentId ustuni bo'yicha filtr.
 */
export async function getExpensesByShipment(
  shipmentId: number
): Promise<ExpenseWithRelations[]> {
  return (await db.query.expenses.findMany({
    where: (t, { eq }) => eq(t.shipmentId, shipmentId),
    with: {
      wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
      shipment: { columns: { id: true, name: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })) as ExpenseWithRelations[];
}

/**
 * Berilgan vagonga (wagonId) tegishli barcha xarajatlar.
 */
export async function getExpensesByWagon(
  wagonId: number
): Promise<ExpenseWithRelations[]> {
  return (await db.query.expenses.findMany({
    where: (t, { eq }) => eq(t.wagonId, wagonId),
    with: {
      wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
      shipment: { columns: { id: true, name: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })) as ExpenseWithRelations[];
}

// ==========================================
// CREATE
// ==========================================

/**
 * Yangi xarajat qo'shadi.
 * Validatsiya: wagonId YOKI shipmentId dan kamida biri bo'lishi shart.
 */
export async function createExpense(data: CreateExpenseData) {
  if (!data.wagonId && !data.shipmentId) {
    throw new Error(
      "Xarajat uchun wagonId yoki shipmentId dan kamida biri ko'rsatilishi shart."
    );
  }

  const [result] = await db
    .insert(expenses)
    .values({
      wagonId: data.wagonId ?? null,
      shipmentId: data.shipmentId ?? null,
      category: data.category,
      description: data.description,
      amountUsd: data.amountUsd,
      date: data.date,
      notes: data.notes ?? null,
    })
    .returning();

  const newExpense = result;

  // Kassaga xarajat yozish
  await db.insert(cashOperations).values({
    type: "expense",
    category: "expense",
    amount: data.amountUsd,
    currency: "USD",
    description: data.description,
    date: data.date,
    relatedExpenseId: newExpense.id,
  });

  return result;
}

// ==========================================
// UPDATE
// ==========================================

/**
 * Mavjud xarajatni yangilaydi.
 */
export async function updateExpense(
  id: number,
  data: UpdateExpenseData
) {
  const [result] = await db
    .update(expenses)
    .set(data)
    .where(eq(expenses.id, id))
    .returning();

  return result;
}

// ==========================================
// DELETE
// ==========================================

/**
 * Xarajatni o'chiradi.
 */
export async function deleteExpense(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id));
}

// ==========================================
// AGGREGATIONS
// ==========================================

/**
 * Jami xarajatlar summasi (USD).
 * shipmentId berilsa — faqat shu partiyanikini hisoblaydi.
 * berilmasa — barcha xarajatlar yig'indisi.
 */
export async function getTotalExpenses(
  shipmentId?: number
): Promise<number> {
  const query = shipmentId !== undefined
    ? db
        .select({ total: sum(expenses.amountUsd) })
        .from(expenses)
        .where(eq(expenses.shipmentId, shipmentId))
    : db
        .select({ total: sum(expenses.amountUsd) })
        .from(expenses);

  const [row] = await query;
  return Number(row?.total ?? 0);
}

/**
 * Vagon bo'yicha jami xarajatlar summasi (USD).
 */
export async function getTotalExpensesByWagon(
  wagonId: number
): Promise<number> {
  const [row] = await db
    .select({ total: sum(expenses.amountUsd) })
    .from(expenses)
    .where(eq(expenses.wagonId, wagonId));

  return Number(row?.total ?? 0);
}

/**
 * Kategoriya bo'yicha guruhlab jami xarajatlarni qaytaradi.
 * shipmentId berilsa — shu partiya uchun; berilmasa — hammasi.
 */
export async function getExpenseSummaryByCategory(
  shipmentId?: number
): Promise<{ category: string; total: number }[]> {
  // db.select().groupBy() bilan aggregate
  const rows = await (shipmentId !== undefined
    ? db
        .select({
          category: expenses.category,
          total: sum(expenses.amountUsd),
        })
        .from(expenses)
        .where(eq(expenses.shipmentId, shipmentId))
        .groupBy(expenses.category)
    : db
        .select({
          category: expenses.category,
          total: sum(expenses.amountUsd),
        })
        .from(expenses)
        .groupBy(expenses.category));

  return rows.map((r) => ({
    category: r.category,
    total: Number(r.total ?? 0),
  }));
}
