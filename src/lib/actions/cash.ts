"use server";

import { db } from "@/db";
import { cashOperations } from "@/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type CashOperationType = "income" | "expense";

export type CashOperationCategory =
  | "sale"
  | "code_sale"
  | "partner_payment"
  | "expense"
  | "debt_payment";

export type CashCurrency = "USD" | "RUB";

export type CashOperation = {
  id: number;
  type: string;
  category: string;
  amount: number;
  currency: string;
  relatedSaleId: number | null;
  relatedExpenseId: number | null;
  relatedDebtId: number | null;
  description: string;
  date: string;
  notes: string | null;
  createdAt: Date | null;
};

export type CashOperationFilter = {
  type?: CashOperationType;
  currency?: CashCurrency;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateCashOperationData = {
  type: CashOperationType;
  category: CashOperationCategory;
  amount: number;
  currency: CashCurrency;
  description: string;
  date: string;
  notes?: string;
  relatedSaleId?: number;
  relatedExpenseId?: number;
  relatedDebtId?: number;
};

export type CashBalanceResult = {
  USD: { income: number; expense: number; balance: number };
  RUB: { income: number; expense: number; balance: number };
};

// ==========================================
// READ
// ==========================================

/**
 * Kassa operatsiyalari ro'yxati (ixtiyoriy filtr bilan).
 * Sana bo'yicha kamayish tartibida.
 */
export async function getCashOperations(
  filter?: CashOperationFilter
): Promise<CashOperation[]> {
  const conditions = [];

  if (filter?.type) {
    conditions.push(eq(cashOperations.type, filter.type));
  }

  if (filter?.currency) {
    conditions.push(eq(cashOperations.currency, filter.currency));
  }

  if (filter?.dateFrom) {
    conditions.push(gte(cashOperations.date, filter.dateFrom));
  }

  if (filter?.dateTo) {
    conditions.push(lte(cashOperations.date, filter.dateTo));
  }

  const rows = await db
    .select()
    .from(cashOperations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(cashOperations.date), desc(cashOperations.createdAt));

  return rows as CashOperation[];
}

// ==========================================
// BALANCE
// ==========================================

/**
 * Valyutalar bo'yicha kassa balansi.
 * Har bir valyuta uchun: kirim, chiqim, balans.
 */
export async function getCashBalance(): Promise<CashBalanceResult> {
  const rows = await db
    .select({
      currency: cashOperations.currency,
      income: sql<number>`SUM(CASE WHEN ${cashOperations.type} = 'income' THEN ${cashOperations.amount} ELSE 0 END)`,
      expense: sql<number>`SUM(CASE WHEN ${cashOperations.type} = 'expense' THEN ${cashOperations.amount} ELSE 0 END)`,
    })
    .from(cashOperations)
    .groupBy(cashOperations.currency);

  const result: CashBalanceResult = {
    USD: { income: 0, expense: 0, balance: 0 },
    RUB: { income: 0, expense: 0, balance: 0 },
  };

  for (const row of rows) {
    const cur = row.currency as CashCurrency;
    if (cur === "USD" || cur === "RUB") {
      const income = Number(row.income ?? 0);
      const expense = Number(row.expense ?? 0);
      result[cur] = {
        income,
        expense,
        balance: income - expense,
      };
    }
  }

  return result;
}

// ==========================================
// CREATE
// ==========================================

/**
 * Yangi kassa operatsiyasi qo'shish.
 */
export async function createCashOperation(data: CreateCashOperationData) {
  const [result] = await db
    .insert(cashOperations)
    .values({
      type: data.type,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      date: data.date,
      notes: data.notes ?? null,
      relatedSaleId: data.relatedSaleId ?? null,
      relatedExpenseId: data.relatedExpenseId ?? null,
      relatedDebtId: data.relatedDebtId ?? null,
    })
    .returning();

  return result;
}

// ==========================================
// VALYUTA ALMASHTIRISH (USD → RUB)
// ==========================================

/**
 * USD dan RUB ga konvertatsiya.
 * 2 ta kassa operatsiyasi yaratiladi:
 * 1. USD chiqim (expense)
 * 2. RUB kirim (income)
 */
export async function createCurrencyExchange(amountUsd: number, rate: number, date: string, notes?: string) {
  const amountRub = Math.round(amountUsd * rate * 100) / 100;

  // 1. USD chiqim
  await db.insert(cashOperations).values({
    type: "expense",
    category: "currency_exchange",
    amount: amountUsd,
    currency: "USD",
    description: `Valyuta almashtirish: $${amountUsd} → ₽${amountRub.toLocaleString()} (kurs: ${rate})`,
    date,
    notes: notes ?? null,
  });

  // 2. RUB kirim
  await db.insert(cashOperations).values({
    type: "income",
    category: "currency_exchange",
    amount: amountRub,
    currency: "RUB",
    description: `Valyuta almashtirish: $${amountUsd} → ₽${amountRub.toLocaleString()} (kurs: ${rate})`,
    date,
    notes: notes ?? null,
  });

  return { amountUsd, amountRub, rate };
}

// ==========================================
// DELETE
// ==========================================

/**
 * Kassa operatsiyasini o'chirish.
 */
export async function deleteCashOperation(id: number) {
  await db.delete(cashOperations).where(eq(cashOperations.id, id));
}
