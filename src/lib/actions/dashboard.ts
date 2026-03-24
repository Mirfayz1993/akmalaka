"use server";

import { db } from "@/db";
import {
  wagons,
  sales,
  cashOperations,
  debts,
} from "@/db/schema";
import { sql, ne, desc, and, eq } from "drizzle-orm";

export async function getDashboardStats() {
  // 1. activeWagons — status != "unloaded" bo'lgan vagonlar soni
  const activeWagonsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wagons)
    .where(ne(wagons.status, "unloaded"));

  const activeWagons = activeWagonsResult[0]?.count ?? 0;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;

  // 2. monthlySales — shu oydagi sotuvlar soni
  const monthlySalesResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .where(sql`${sales.createdAt} >= ${monthStart}::date`);

  const monthlySales = monthlySalesResult[0]?.count ?? 0;

  // 3. totalDebt
  const totalDebtResult = await db
    .select({
      total: sql<number>`coalesce(sum(${debts.remainingAmountUsd}), 0)`,
    })
    .from(debts)
    .where(ne(debts.status, "paid"));

  const totalDebt = totalDebtResult[0]?.total ?? 0;

  // 4. monthlyRevenue

  const monthlyRevenueResult = await db
    .select({
      total: sql<number>`coalesce(sum(${cashOperations.amount}), 0)`,
    })
    .from(cashOperations)
    .where(
      and(
        eq(cashOperations.type, "income"),
        eq(cashOperations.currency, "USD"),
        sql`${cashOperations.date} >= ${monthStart}::date`
      )
    );

  const monthlyRevenue = monthlyRevenueResult[0]?.total ?? 0;

  // 5. cashBalanceUsd — USD income - expense
  const cashIncomeResult = await db
    .select({
      total: sql<number>`coalesce(sum(${cashOperations.amount}), 0)`,
    })
    .from(cashOperations)
    .where(
      and(
        eq(cashOperations.type, "income"),
        eq(cashOperations.currency, "USD")
      )
    );

  const cashExpenseResult = await db
    .select({
      total: sql<number>`coalesce(sum(${cashOperations.amount}), 0)`,
    })
    .from(cashOperations)
    .where(
      and(
        eq(cashOperations.type, "expense"),
        eq(cashOperations.currency, "USD")
      )
    );

  const cashBalanceUsd =
    (cashIncomeResult[0]?.total ?? 0) - (cashExpenseResult[0]?.total ?? 0);

  // 6. cashBalanceRub — RUB income - expense
  const cashIncomeRubResult = await db
    .select({
      total: sql<number>`coalesce(sum(${cashOperations.amount}), 0)`,
    })
    .from(cashOperations)
    .where(
      and(
        eq(cashOperations.type, "income"),
        eq(cashOperations.currency, "RUB")
      )
    );

  const cashExpenseRubResult = await db
    .select({
      total: sql<number>`coalesce(sum(${cashOperations.amount}), 0)`,
    })
    .from(cashOperations)
    .where(
      and(
        eq(cashOperations.type, "expense"),
        eq(cashOperations.currency, "RUB")
      )
    );

  const cashBalanceRub =
    (cashIncomeRubResult[0]?.total ?? 0) - (cashExpenseRubResult[0]?.total ?? 0);

  // 7. activeClients — status != "paid" bo'lgan qarzdagi distinct clientId soni
  const activeClientsResult = await db
    .select({
      count: sql<number>`count(distinct ${debts.clientId})::int`,
    })
    .from(debts)
    .where(ne(debts.status, "paid"));

  const activeClients = activeClientsResult[0]?.count ?? 0;

  return {
    activeWagons,
    monthlySales,
    totalDebt: Math.round(totalDebt * 100) / 100,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    cashBalanceUsd: Math.round(cashBalanceUsd * 100) / 100,
    cashBalanceRub: Math.round(cashBalanceRub * 100) / 100,
    activeClients,
  };
}

export type RecentOperation = {
  id: number;
  type: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
};

export async function getRecentOperations(
  limit = 10
): Promise<RecentOperation[]> {
  const rows = await db
    .select({
      id: cashOperations.id,
      type: cashOperations.type,
      category: cashOperations.category,
      amount: cashOperations.amount,
      currency: cashOperations.currency,
      description: cashOperations.description,
      date: cashOperations.date,
    })
    .from(cashOperations)
    .orderBy(desc(cashOperations.date), desc(cashOperations.id))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    date: String(r.date),
  }));
}

export type WagonStatuses = {
  in_transit: number;
  at_border: number;
  arrived: number;
  unloaded: number;
};

export async function getWagonStatuses(): Promise<WagonStatuses> {
  const rows = await db
    .select({
      status: wagons.status,
      count: sql<number>`count(*)::int`,
    })
    .from(wagons)
    .groupBy(wagons.status);

  const result: WagonStatuses = {
    in_transit: 0,
    at_border: 0,
    arrived: 0,
    unloaded: 0,
  };

  for (const row of rows) {
    const s = row.status as keyof WagonStatuses;
    if (s in result) {
      result[s] = row.count;
    }
  }

  return result;
}
