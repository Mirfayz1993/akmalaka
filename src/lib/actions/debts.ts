"use server";

import { db } from "@/db";
import { debts, debtPayments, cashOperations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type DebtStatus = "active" | "partially_paid" | "paid";
export type PaymentCurrency = "USD";
export type PaymentMethod = "cash" | "bank_transfer" | "card";

export type DebtWithRelations = {
  id: number;
  clientId: number;
  saleId: number | null;
  debtType: string | null;
  supplierName: string | null;
  totalAmountUsd: number;
  paidAmountUsd: number | null;
  remainingAmountUsd: number;
  status: string | null;
  dueDate: string | null;
  notes: string | null;
  createdAt: Date | null;
  client: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  sale: {
    id: number;
    totalAmountUsd: number;
    saleDate: string;
  } | null;
  payments: DebtPayment[];
};

export type DebtPayment = {
  id: number;
  debtId: number;
  amount: number;
  currency: string;
  exchangeRate: number | null;
  amountInUsd: number;
  paymentMethod: string;
  date: string;
  notes: string | null;
  createdAt: Date | null;
};

export type CreateDebtData = {
  clientId: number;
  saleId?: number;
  totalAmountUsd: number;
  paidAmountUsd?: number;
  dueDate?: string;
  notes?: string;
};

export type MakePaymentData = {
  amount: number;
  currency: PaymentCurrency;
  exchangeRate?: number;
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
};

// ==========================================
// READ
// ==========================================

/**
 * Barcha qarzlarni qaytaradi.
 * clientId berilsa — faqat o'sha mijozniki.
 */
export async function getDebts(clientId?: number, debtType?: string): Promise<DebtWithRelations[]> {
  const conditions = [];

  if (clientId !== undefined) {
    conditions.push(eq(debts.clientId, clientId));
  }

  if (debtType !== undefined) {
    conditions.push(eq(debts.debtType, debtType));
  }

  if (conditions.length > 0) {
    return (await db.query.debts.findMany({
      where: conditions.length === 1 ? conditions[0] : and(...conditions),
      with: {
        client: { columns: { id: true, name: true, phone: true } },
        sale: { columns: { id: true, totalAmountUsd: true, saleDate: true } },
        payments: true,
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })) as DebtWithRelations[];
  }

  return (await db.query.debts.findMany({
    with: {
      client: { columns: { id: true, name: true, phone: true } },
      sale: { columns: { id: true, totalAmountUsd: true, saleDate: true } },
      payments: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })) as DebtWithRelations[];
}

/**
 * Bitta qarz tafsiloti (payments bilan).
 */
export async function getDebt(id: number): Promise<DebtWithRelations | undefined> {
  return (await db.query.debts.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      client: { columns: { id: true, name: true, phone: true } },
      sale: { columns: { id: true, totalAmountUsd: true, saleDate: true } },
      payments: {
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      },
    },
  })) as DebtWithRelations | undefined;
}

// ==========================================
// CREATE
// ==========================================

/**
 * Yangi qarz yaratadi.
 * remainingAmountUsd = totalAmountUsd - (paidAmountUsd || 0)
 * status avtomatik hisoblanadi
 */
export async function createDebt(data: CreateDebtData) {
  const paidAmount = data.paidAmountUsd ?? 0;
  const remainingAmount = data.totalAmountUsd - paidAmount;

  let status: DebtStatus = "active";
  if (remainingAmount <= 0) {
    status = "paid";
  } else if (paidAmount > 0) {
    status = "partially_paid";
  }

  const [result] = await db
    .insert(debts)
    .values({
      clientId: data.clientId,
      saleId: data.saleId ?? null,
      totalAmountUsd: data.totalAmountUsd,
      paidAmountUsd: paidAmount,
      remainingAmountUsd: remainingAmount,
      status,
      dueDate: data.dueDate ?? null,
      notes: data.notes ?? null,
    })
    .returning();

  return result;
}

// ==========================================
// MAKE PAYMENT
// ==========================================

/**
 * Qarzga to'lov qilish.
 * 1. amountInUsd hisoblaydi
 * 2. debtPayments ga yozadi
 * 3. debt ni yangilaydi (paidAmountUsd, remainingAmountUsd, status)
 * 4. Kassaga kirim yozadi (cashOperations)
 */
export async function makePayment(debtId: number, data: MakePaymentData) {
  // 1. Mavjud qarzni olish
  const existingDebt = await db.query.debts.findFirst({
    where: (t, { eq }) => eq(t.id, debtId),
  });

  if (!existingDebt) {
    throw new Error("Qarz topilmadi.");
  }

  // 2. Ortiqcha to'lovni oldini olish — faqat qolgan qarz summasigacha
  const remainingDebt = existingDebt.remainingAmountUsd ?? existingDebt.totalAmountUsd;
  if (remainingDebt <= 0) {
    throw new Error("Bu qarz allaqachon to'langan.");
  }
  const actualPayment = Math.min(data.amount, remainingDebt);

  // 3. debtPayments ga yozish (haqiqiy summa bilan)
  const [payment] = await db
    .insert(debtPayments)
    .values({
      debtId,
      amount: actualPayment,
      currency: data.currency,
      exchangeRate: data.exchangeRate ?? null,
      amountInUsd: actualPayment,
      paymentMethod: data.paymentMethod,
      date: data.date,
      notes: data.notes ?? null,
    })
    .returning();

  // 4. Qarzni yangilash
  const newPaidAmount = (existingDebt.paidAmountUsd ?? 0) + actualPayment;
  const newRemainingAmount = existingDebt.totalAmountUsd - newPaidAmount;

  let newStatus: DebtStatus;
  if (newRemainingAmount <= 0) {
    newStatus = "paid";
  } else {
    newStatus = "partially_paid";
  }

  await db
    .update(debts)
    .set({
      paidAmountUsd: newPaidAmount,
      remainingAmountUsd: Math.max(0, newRemainingAmount),
      status: newStatus,
    })
    .where(eq(debts.id, debtId));

  // 5. Kassaga faqat haqiqiy to'lov summasini yozish
  await db.insert(cashOperations).values({
    type: "income",
    category: "debt_payment",
    amount: actualPayment,
    currency: data.currency,
    relatedDebtId: debtId,
    description: `Qarz to'lovi #${debtId} ($${actualPayment.toFixed(2)})`,
    date: data.date,
    notes: data.notes ?? null,
  });

  return payment;
}

// ==========================================
// DELETE
// ==========================================

/**
 * Qarzni o'chiradi (to'lovlar ham kaskad o'chadi agar DB da cascade bo'lsa).
 */
export async function deleteDebt(id: number) {
  // Avval to'lovlarni o'chirish
  await db.delete(debtPayments).where(eq(debtPayments.debtId, id));
  // Keyin qarzni o'chirish
  await db.delete(debts).where(eq(debts.id, id));
}

// ==========================================
// AGGREGATIONS
// ==========================================

/**
 * Jami qarz summasi (faqat active + partially_paid statuslilar).
 * { totalDebt, totalPaid, totalRemaining }
 */
export async function getTotalDebt(debtType?: string): Promise<{
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
}> {
  const rows = await db.query.debts.findMany({
    where: (t, { or, eq, and: andOp }) => {
      const statusFilter = or(eq(t.status, "active"), eq(t.status, "partially_paid"));
      if (debtType) {
        return andOp(statusFilter, eq(t.debtType, debtType));
      }
      return statusFilter;
    },
  });

  const totalDebt = rows.reduce((acc, r) => acc + r.totalAmountUsd, 0);
  const totalPaid = rows.reduce((acc, r) => acc + (r.paidAmountUsd ?? 0), 0);
  const totalRemaining = rows.reduce((acc, r) => acc + r.remainingAmountUsd, 0);

  return { totalDebt, totalPaid, totalRemaining };
}
