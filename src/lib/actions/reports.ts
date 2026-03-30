"use server";

import { db } from "@/db";
import { transports, codes, cashOperations, saleItems, timbers, partners, partnerBalances } from "@/db/schema";
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
    with: { timbers: true },
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
    const expenses =
      parseFloat(t.expenseNds ?? "0") +
      parseFloat(t.expenseUsluga ?? "0") +
      parseFloat(t.expenseTupik ?? "0") +
      parseFloat(t.expenseXrannei ?? "0") +
      parseFloat(t.expenseOrtish ?? "0") +
      parseFloat(t.expenseTushurish ?? "0");

    const tonnage = parseFloat(t.tonnage ?? "0");
    const codeExpense =
      parseFloat(t.codeUzPricePerTon ?? "0") * tonnage +
      parseFloat(t.codeKzPricePerTon ?? "0") * tonnage;

    // RUB xarid narxi USD da
    const rubPricePerCubic = parseFloat(t.rubPricePerCubic ?? "0");
    const rubExchangeRate = parseFloat(t.rubExchangeRate ?? "0");
    const totalTashkentCub = t.timbers.reduce((sum, tb) => {
      const tashkentCount = tb.tashkentCount ?? 0;
      return (
        sum +
        (tb.thicknessMm / 1000) *
          (tb.widthMm / 1000) *
          parseFloat(tb.lengthM) *
          tashkentCount
      );
    }, 0);
    const rubCostUsd =
      rubExchangeRate > 0
        ? (rubPricePerCubic * totalTashkentCub) / rubExchangeRate
        : 0;

    // Truck to'lovi (wagon uchun 0)
    const truckCost = parseFloat(t.truckOwnerPayment ?? "0");

    const revenue = revenueMap.get(t.id) ?? 0;
    const profit = revenue - expenses - codeExpense - rubCostUsd - truckCost;

    return {
      wagonId: t.id,
      number: t.number,
      closedAt: t.closedAt,
      revenue,
      expenses,
      codeExpense,
      rubCostUsd,
      truckCost,
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

// ─── PARTNER REPORT ───────────────────────────────────────────────────────────

export async function getPartnerReport() {
  const allPartners = await db.query.partners.findMany({
    with: { balances: true },
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  return allPartners.map((p) => {
    const totalBalance = p.balances.reduce(
      (sum, b) => sum + parseFloat(b.amount),
      0
    );
    return {
      partnerId: p.id,
      name: p.name,
      type: p.type,
      balance: totalBalance, // musbat = ular bizga qarz, manfiy = biz ularga qarz
      operationsCount: p.balances.length,
    };
  });
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
