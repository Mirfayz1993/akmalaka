"use server";

import { db } from "@/db";
import {
  wagons,
  wagonTimber,
  sales,
  expenses,
  customsCodes,
  codeSales,
  cashOperations,
} from "@/db/schema";
import { eq, ne, sql, and, gte, lte, sum } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type ShipmentProfitReport = WagonProfitReport; // backward compat alias

export type WagonProfitReport = {
  revenue: {
    sales: number;
    codeSales: number;
    total: number;
  };
  costs: {
    purchase: number;
    transport: number;
    unloading: number;
    codes: number;
    expenses: number;
    total: number;
  };
  profit: number;
};

export type DebtReportRow = {
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
};

export type WarehouseReportRow = {
  id: number;
  wagonId: number;
  wagonNumber: string;
  widthMm: number;
  thicknessMm: number;
  lengthM: number;
  quantity: number;
  remainingQuantity: number;
  cubicMeters: number;
  remainingCubicMeters: number;
  percentRemaining: number;
};

export type WarehouseReport = {
  rows: WarehouseReportRow[];
  totalCubic: number;
  totalQuantity: number;
  totalRemainingCubic: number;
  totalRemainingQuantity: number;
};

export type CurrencyTotal = {
  currency: string;
  income: number;
  expense: number;
  balance: number;
};

export type OverallReport = {
  byCurrency: CurrencyTotal[];
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
};

// ==========================================
// 1. PARTIYA FOYDA/ZARAR HISOBI
// ==========================================

/**
 * Berilgan wagonId uchun foyda/zarar hisobini qaytaradi.
 *
 * Daromad:
 *   - sotuvlar: sales → wagonTimber → wagon
 *   - kod sotish: codeSales → customsCode → wagon
 *
 * Xarajat:
 *   - xarid narxi: wagonTimber.cubicMeters * pricePerCubicUsd
 *   - transport: wagons.transportCostUsd
 *   - tushirish: wagons.unloadingCostUsd
 *   - kodlar: customsCodes.obshiyTarif
 *   - boshqa xarajatlar: expenses.amountUsd (wagonId orqali)
 */
export async function getWagonProfitReport(
  wagonId: number
): Promise<WagonProfitReport> {
  // --- Vagonni olish ---
  const wagon = await db.query.wagons.findFirst({
    where: (t, { eq }) => eq(t.id, wagonId),
  });

  if (!wagon) {
    throw new Error("Vagon topilmadi");
  }

  // --- Daromad 1: Sotuvlar ---
  let salesRevenue = 0;
  const timberRows = await db
    .select({ id: wagonTimber.id })
    .from(wagonTimber)
    .where(eq(wagonTimber.wagonId, wagonId));

  const timberIds = timberRows.map((t) => t.id);

  if (timberIds.length > 0) {
    const salesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${sales.totalAmountUsd}), 0)`,
      })
      .from(sales)
      .where(
        sql`${sales.wagonTimberId} IN (${sql.join(
          timberIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
    salesRevenue = Number(salesResult[0]?.total ?? 0);
  }

  // --- Daromad 2: Kod sotish ---
  let codeSalesRevenue = 0;
  const codesRows = await db
    .select({ id: customsCodes.id })
    .from(customsCodes)
    .where(eq(customsCodes.wagonId, wagonId));

  const codeIds = codesRows.map((c) => c.id);

  if (codeIds.length > 0) {
    const codeSalesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${codeSales.saleAmountUsd}), 0)`,
      })
      .from(codeSales)
      .where(
        sql`${codeSales.customsCodeId} IN (${sql.join(
          codeIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
    codeSalesRevenue = Number(codeSalesResult[0]?.total ?? 0);
  }

  // --- Xarajat 1: Xarid narxi (wagonTimber.cubicMeters * pricePerCubicUsd) ---
  let purchaseCost = 0;
  const purchaseResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${wagonTimber.cubicMeters} * ${wagonTimber.pricePerCubicUsd}), 0)`,
    })
    .from(wagonTimber)
    .where(eq(wagonTimber.wagonId, wagonId));
  purchaseCost = Number(purchaseResult[0]?.total ?? 0);

  // --- Xarajat 2: Transport ---
  const transportCost = Number(wagon.transportCostUsd ?? 0);

  // --- Xarajat 3: Tushirish ---
  const unloadingCost = Number(wagon.unloadingCostUsd ?? 0);

  // --- Xarajat 4: Kodlar ---
  let codesCost = 0;
  if (codeIds.length > 0) {
    const codesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${customsCodes.obshiyTarif}), 0)`,
      })
      .from(customsCodes)
      .where(eq(customsCodes.wagonId, wagonId));
    codesCost = Number(codesResult[0]?.total ?? 0);
  }

  // --- Xarajat 5: Boshqa xarajatlar (expenses) ---
  let otherExpenses = 0;
  const expensesByWagonResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amountUsd}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.wagonId, wagonId),
        ne(expenses.category, "customs")
      )
    );
  otherExpenses = Number(expensesByWagonResult[0]?.total ?? 0);

  // --- Hisoblash ---
  const totalRevenue = salesRevenue + codeSalesRevenue;
  const totalCosts =
    purchaseCost +
    transportCost +
    unloadingCost +
    codesCost +
    otherExpenses;
  const profit = totalRevenue - totalCosts;

  return {
    revenue: {
      sales: salesRevenue,
      codeSales: codeSalesRevenue,
      total: totalRevenue,
    },
    costs: {
      purchase: purchaseCost,
      transport: transportCost,
      unloading: unloadingCost,
      codes: codesCost,
      expenses: otherExpenses,
      total: totalCosts,
    },
    profit,
  };
}

/** @deprecated Use getWagonProfitReport instead */
export const getShipmentProfitReport = getWagonProfitReport;

// ==========================================
// 2. QARZ HISOBOTI (mijoz bo'yicha)
// ==========================================

/**
 * Har bir mijoz uchun jami qarz, to'langan va qolgan summani qaytaradi.
 * Faqat qolgan qarz > 0 bo'lganlarni ko'rsatadi.
 */
export async function getDebtReport(): Promise<DebtReportRow[]> {
  const allClients = await db.query.clients.findMany({
    with: {
      debts: true,
    },
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  const rows: DebtReportRow[] = [];

  for (const client of allClients) {
    const totalDebt = client.debts.reduce(
      (acc, d) => acc + (d.totalAmountUsd ?? 0),
      0
    );
    const totalPaid = client.debts.reduce(
      (acc, d) => acc + (d.paidAmountUsd ?? 0),
      0
    );
    const totalRemaining = client.debts.reduce(
      (acc, d) => acc + (d.remainingAmountUsd ?? 0),
      0
    );

    if (totalRemaining > 0) {
      rows.push({
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone ?? null,
        totalDebt,
        totalPaid,
        totalRemaining,
      });
    }
  }

  return rows;
}

// ==========================================
// 3. OMBOR QOLDIG'I
// ==========================================

/**
 * Omborda qolgan taxtalar (remainingQuantity > 0) ro'yxatini qaytaradi.
 * Har bir qator bilan vagon raqami, o'lchamlar, jami va qolgan dona/kub.
 */
export async function getWarehouseReport(): Promise<WarehouseReport> {
  const rows = await db.query.wagonTimber.findMany({
    where: (t, { gt }) => gt(t.remainingQuantity, 0),
    with: {
      wagon: {
        columns: { id: true, wagonNumber: true },
      },
    },
    orderBy: (t, { asc }) => [asc(t.wagonId)],
  });

  const reportRows: WarehouseReportRow[] = rows.map((row) => {
    const remaining = row.remainingQuantity ?? 0;
    const total = row.quantity;
    const cubicPerUnit = row.cubicMeters / (total > 0 ? total : 1);
    const remainingCubic = cubicPerUnit * remaining;
    const percentRemaining = total > 0 ? (remaining / total) * 100 : 0;

    return {
      id: row.id,
      wagonId: row.wagonId,
      wagonNumber: row.wagon?.wagonNumber ?? "-",
      widthMm: row.widthMm,
      thicknessMm: row.thicknessMm,
      lengthM: row.lengthM,
      quantity: row.quantity,
      remainingQuantity: remaining,
      cubicMeters: row.cubicMeters,
      remainingCubicMeters: remainingCubic,
      percentRemaining,
    };
  });

  const totalCubic = reportRows.reduce((acc, r) => acc + r.cubicMeters, 0);
  const totalQuantity = reportRows.reduce((acc, r) => acc + r.quantity, 0);
  const totalRemainingCubic = reportRows.reduce(
    (acc, r) => acc + r.remainingCubicMeters,
    0
  );
  const totalRemainingQuantity = reportRows.reduce(
    (acc, r) => acc + r.remainingQuantity,
    0
  );

  return {
    rows: reportRows,
    totalCubic,
    totalQuantity,
    totalRemainingCubic,
    totalRemainingQuantity,
  };
}

// ==========================================
// 4. UMUMIY FOYDA/ZARAR HISOBOTI
// ==========================================

/**
 * Umumiy kassa kirim/chiqim va qarz holati.
 * dateFrom / dateTo: "YYYY-MM-DD" formatida ixtiyoriy filter.
 */
export async function getOverallReport(
  dateFrom?: string,
  dateTo?: string
): Promise<OverallReport> {
  // Kassa operatsiyalarini olish
  let query = db.select().from(cashOperations).$dynamic();

  if (dateFrom && dateTo) {
    query = query.where(
      and(
        gte(cashOperations.date, dateFrom),
        lte(cashOperations.date, dateTo)
      )
    );
  } else if (dateFrom) {
    query = query.where(gte(cashOperations.date, dateFrom));
  } else if (dateTo) {
    query = query.where(lte(cashOperations.date, dateTo));
  }

  const allOps = await query;

  // Valyuta bo'yicha guruhlash
  const currencyMap: Record<
    string,
    { income: number; expense: number }
  > = {};

  for (const op of allOps) {
    const cur = op.currency;
    if (!currencyMap[cur]) {
      currencyMap[cur] = { income: 0, expense: 0 };
    }
    if (op.type === "income") {
      currencyMap[cur].income += op.amount;
    } else {
      currencyMap[cur].expense += op.amount;
    }
  }

  const byCurrency: CurrencyTotal[] = Object.entries(currencyMap).map(
    ([currency, data]) => ({
      currency,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    })
  );

  // Qarz umumiy holati
  const debtRows = await db.query.debts.findMany();

  const totalDebt = debtRows.reduce(
    (acc, d) => acc + (d.totalAmountUsd ?? 0),
    0
  );
  const totalPaid = debtRows.reduce(
    (acc, d) => acc + (d.paidAmountUsd ?? 0),
    0
  );
  const totalRemaining = debtRows.reduce(
    (acc, d) => acc + (d.remainingAmountUsd ?? 0),
    0
  );

  // Xarajatlar jami summasi
  const expensesQuery = dateFrom || dateTo
    ? db
        .select({ total: sum(expenses.amountUsd) })
        .from(expenses)
        .where(
          and(
            dateFrom ? gte(expenses.date, dateFrom) : undefined,
            dateTo ? lte(expenses.date, dateTo) : undefined
          )
        )
    : db.select({ total: sum(expenses.amountUsd) }).from(expenses);

  const [expensesRow] = await expensesQuery;
  const totalExpenses = Number(expensesRow?.total ?? 0);

  return {
    byCurrency,
    totalDebt,
    totalPaid,
    totalRemaining,
    totalExpenses,
  };
}
