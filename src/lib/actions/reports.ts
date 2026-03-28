"use server";

import { db } from "@/db";
import { transports, codes, cashOperations, saleItems, timbers } from "@/db/schema";
import { and, eq, gte, lte, sql, inArray } from "drizzle-orm";

// ─── WAGON REPORT ─────────────────────────────────────────────────────────────

export async function getWagonReport(dateFrom?: string, dateTo?: string) {
  // status='closed' bo'lgan transportlar
  const conditions = [eq(transports.status, "closed")];

  if (dateFrom) {
    conditions.push(gte(transports.closedAt, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(transports.closedAt, dateTo));
  }

  const closedTransports = await db.query.transports.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.closedAt)],
  });

  if (closedTransports.length === 0) return [];

  const transportIds = closedTransports.map((t) => t.id);

  // Har vagon uchun saleItems totalUsd yig'indisi (timbers orqali)
  // saleItems → timberId → timbers.transportId
  const revenueRows = await db
    .select({
      transportId: timbers.transportId,
      revenue: sql<string>`COALESCE(SUM(${saleItems.totalUsd}), 0)`,
    })
    .from(saleItems)
    .innerJoin(timbers, eq(saleItems.timberId, timbers.id))
    .where(inArray(timbers.transportId, transportIds))
    .groupBy(timbers.transportId);

  const revenueMap = new Map<number, number>();
  for (const row of revenueRows) {
    revenueMap.set(row.transportId, parseFloat(row.revenue));
  }

  return closedTransports.map((t) => {
    // Standart xarajatlar yig'indisi
    const expenses =
      parseFloat(t.expenseNds ?? "0") +
      parseFloat(t.expenseUsluga ?? "0") +
      parseFloat(t.expenseTupik ?? "0") +
      parseFloat(t.expenseXrannei ?? "0") +
      parseFloat(t.expenseOrtish ?? "0") +
      parseFloat(t.expenseTushurish ?? "0");

    // Kod xarajati: codeUzPricePerTon × tonnage + codeKzPricePerTon × tonnage
    const tonnage = parseFloat(t.tonnage ?? "0");
    const codeExpense =
      parseFloat(t.codeUzPricePerTon ?? "0") * tonnage +
      parseFloat(t.codeKzPricePerTon ?? "0") * tonnage;

    const revenue = revenueMap.get(t.id) ?? 0;
    const profit = revenue - expenses - codeExpense;

    return {
      wagonId: t.id,
      number: t.number,
      closedAt: t.closedAt,
      revenue,
      expenses,
      codeExpense,
      profit,
    };
  });
}

// ─── CODE REPORT ──────────────────────────────────────────────────────────────

export async function getCodeReport(dateFrom?: string, dateTo?: string) {
  const conditions = [eq(codes.status, "sold")];

  if (dateFrom) {
    conditions.push(
      gte(sql`COALESCE(${codes.usedAt}, ${codes.createdAt})`, dateFrom)
    );
  }
  if (dateTo) {
    conditions.push(
      lte(sql`COALESCE(${codes.usedAt}, ${codes.createdAt})`, dateTo)
    );
  }

  const soldCodes = await db.query.codes.findMany({
    where: and(...conditions),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  return soldCodes.map((c) => {
    const buyCostUsd = parseFloat(c.buyCostUsd ?? "0");
    const sellPriceUsd = parseFloat(c.sellPriceUsd ?? "0");
    const profit = sellPriceUsd - buyCostUsd;

    return {
      codeId: c.id,
      type: c.type,
      buyCostUsd,
      sellPriceUsd,
      profit,
      createdAt: c.createdAt,
    };
  });
}

// ─── CASH REPORT ──────────────────────────────────────────────────────────────

export async function getCashReport(dateFrom?: string, dateTo?: string) {
  const dateConditions = [];

  if (dateFrom) {
    dateConditions.push(gte(cashOperations.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    dateConditions.push(lte(cashOperations.createdAt, new Date(dateTo)));
  }

  const baseWhere = dateConditions.length > 0 ? and(...dateConditions) : undefined;

  // USD income
  const usdIncomeRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${cashOperations.amount}), 0)` })
    .from(cashOperations)
    .where(
      and(
        baseWhere,
        eq(cashOperations.currency, "usd"),
        eq(cashOperations.type, "income")
      )
    );

  // USD expense
  const usdExpenseRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${cashOperations.amount}), 0)` })
    .from(cashOperations)
    .where(
      and(
        baseWhere,
        eq(cashOperations.currency, "usd"),
        eq(cashOperations.type, "expense")
      )
    );

  // RUB income
  const rubIncomeRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${cashOperations.amount}), 0)` })
    .from(cashOperations)
    .where(
      and(
        baseWhere,
        eq(cashOperations.currency, "rub"),
        eq(cashOperations.type, "income")
      )
    );

  // RUB expense
  const rubExpenseRows = await db
    .select({ total: sql<string>`COALESCE(SUM(${cashOperations.amount}), 0)` })
    .from(cashOperations)
    .where(
      and(
        baseWhere,
        eq(cashOperations.currency, "rub"),
        eq(cashOperations.type, "expense")
      )
    );

  const usdIncome = parseFloat(usdIncomeRows[0]?.total ?? "0");
  const usdExpense = parseFloat(usdExpenseRows[0]?.total ?? "0");
  const rubIncome = parseFloat(rubIncomeRows[0]?.total ?? "0");
  const rubExpense = parseFloat(rubExpenseRows[0]?.total ?? "0");

  return {
    usd: {
      income: usdIncome,
      expense: usdExpense,
      net: usdIncome - usdExpense,
    },
    rub: {
      income: rubIncome,
      expense: rubExpense,
      net: rubIncome - rubExpense,
    },
  };
}

// ─── OVERALL REPORT ───────────────────────────────────────────────────────────

export async function getOverallReport(dateFrom?: string, dateTo?: string) {
  const [wagonReport, codeReport, cashReport] = await Promise.all([
    getWagonReport(dateFrom, dateTo),
    getCodeReport(dateFrom, dateTo),
    getCashReport(dateFrom, dateTo),
  ]);

  const wagonProfit = wagonReport.reduce((sum, w) => sum + w.profit, 0);
  const codeProfit = codeReport.reduce((sum, c) => sum + c.profit, 0);
  const cashNet = cashReport.usd.net;
  const total = wagonProfit + codeProfit;

  return {
    wagonProfit,
    codeProfit,
    cashNet,
    total,
  };
}
