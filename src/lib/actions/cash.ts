"use server";

import { db } from "@/db";
import { cashOperations, partnerBalances } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── GET: USD balance ─────────────────────────────────────────────────────────

export async function getUsdBalance(): Promise<number> {
  const rows = await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "usd"),
  });
  return rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
}

// ─── GET: RUB state (balance + weighted average rate) ────────────────────────

export async function getRubState(): Promise<{
  rubBalance: number;
  avgRate: number;
}> {
  const rows = await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "rub"),
  });

  const rubBalance = rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

  // Weighted average rate — only income rows with exchangeRate > 0
  const incomeRows = rows.filter(
    (row) =>
      row.type === "income" &&
      parseFloat(row.amount) > 0 &&
      row.exchangeRate !== null &&
      row.exchangeRate !== undefined &&
      parseFloat(row.exchangeRate) > 0
  );

  let avgRate = 0;
  if (incomeRows.length > 0) {
    const sumAmount = incomeRows.reduce(
      (sum, row) => sum + parseFloat(row.amount),
      0
    );
    const sumAmountDivRate = incomeRows.reduce(
      (sum, row) => sum + parseFloat(row.amount) / parseFloat(row.exchangeRate!),
      0
    );
    avgRate = sumAmountDivRate > 0 ? sumAmount / sumAmountDivRate : 0;
  }

  return { rubBalance, avgRate };
}

// ─── GET: USD operations list ─────────────────────────────────────────────────

export async function getUsdOperations() {
  return await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "usd"),
    with: { partner: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

// ─── GET: RUB operations list ─────────────────────────────────────────────────

export async function getRubOperations() {
  return await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "rub"),
    with: { partner: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

// ─── GET: Exchange history ────────────────────────────────────────────────────

export async function getExchangeHistory() {
  return await db.query.cashOperations.findMany({
    where: eq(cashOperations.type, "exchange"),
    with: { partner: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

// ─── WRITE: Record USD operation ─────────────────────────────────────────────

export async function recordUsdOperation(data: {
  type: "income" | "expense";
  amount: number;
  partnerId?: number;
  description?: string;
  docNumber?: string;
}) {
  const signedAmount = data.type === "income" ? data.amount : -data.amount;

  await db.transaction(async (tx) => {
    await tx.insert(cashOperations).values({
      currency: "usd",
      type: data.type,
      amount: String(signedAmount),
      partnerId: data.partnerId ?? null,
      description: data.description ?? null,
      docNumber: data.docNumber ?? null,
    });

    if (data.partnerId) {
      // income → they paid us → positive (they owe us less / we gained)
      // expense → we paid them → negative (we owe them / their receivable)
      const balanceAmount = data.type === "income" ? data.amount : -data.amount;
      await tx.insert(partnerBalances).values({
        partnerId: data.partnerId,
        amount: String(balanceAmount),
        currency: "usd",
        description: data.description ?? null,
        docNumber: data.docNumber ?? null,
      });
    }
  });

  revalidatePath("/cash");
}

// ─── WRITE: Delete cash operation ────────────────────────────────────────────

export async function deleteCashOperation(id: number) {
  await db.delete(cashOperations).where(eq(cashOperations.id, id));
  revalidatePath("/cash");
}

// ─── WRITE: Record exchange ($ → RUB) ────────────────────────────────────────

export async function recordExchange(data: {
  usdAmount: number;
  rubAmount: number;
  rate: number;
  partnerId?: number;
  description?: string;
}) {
  if (data.usdAmount <= 0 || data.rubAmount <= 0) {
    throw new Error("usdAmount va rubAmount musbat bo'lishi kerak");
  }

  await db.transaction(async (tx) => {
    // USD kassasidan chiqim
    await tx.insert(cashOperations).values({
      currency: "usd",
      type: "exchange",
      amount: String(-data.usdAmount),
      partnerId: data.partnerId ?? null,
      exchangeRate: String(data.rate),
      description: data.description ?? null,
    });

    // RUB kassasiga kirim
    await tx.insert(cashOperations).values({
      currency: "rub",
      type: "income",
      amount: String(data.rubAmount),
      partnerId: data.partnerId ?? null,
      exchangeRate: String(data.rate),
      description: data.description ?? null,
    });

    // Ayrboshlash: biz hamkorga dollar berdik → partnerBalances ga yoziladi
    if (data.partnerId) {
      await tx.insert(partnerBalances).values({
        partnerId: data.partnerId,
        amount: String(-data.usdAmount),
        currency: "usd",
        description: data.description ?? "Pul ayrboshlash",
      });
    }
  });

  revalidatePath("/cash");
}
