"use server";

import { db } from "@/db";
import { cashOperations, partnerBalances } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── GET: USD balance ─────────────────────────────────────────────────────────

export async function getUsdBalance(): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${cashOperations.amount}), 0)` })
    .from(cashOperations)
    .where(eq(cashOperations.currency, "usd"));
  return parseFloat(result[0]?.total ?? "0");
}

// ─── GET: RUB state (balance + weighted average rate) ────────────────────────

export async function getRubState(): Promise<{
  rubBalance: number;
  avgRate: number;
}> {
  // Barcha RUB operatsiyalarni xronologik tartibda olish
  const allOps = await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "rub"),
    columns: { amount: true, exchangeRate: true, type: true },
    orderBy: (t, { asc }) => [asc(t.id)],
  });

  // USD tracking: har kirim uchun aniq USD hisoblanadi, chiqimda proporsional kamaytirish
  let rubRunning = 0;
  let usdRunning = 0;

  for (const op of allOps) {
    const amount = parseFloat(op.amount);
    if (amount > 0) {
      const rate = op.exchangeRate ? parseFloat(op.exchangeRate) : 0;
      if (rate > 0) {
        usdRunning += amount / rate;
        rubRunning += amount;
      } else {
        rubRunning += amount;
      }
    } else {
      if (rubRunning > 0) {
        const fraction = (rubRunning + amount) / rubRunning;
        usdRunning *= fraction;
        rubRunning += amount;
        if (rubRunning <= 0) { rubRunning = 0; usdRunning = 0; }
      }
    }
  }

  const runningAvgRate = usdRunning > 0 ? rubRunning / usdRunning : 0;

  // Haqiqiy balans (manfiy bo'lishi mumkin — kassadan qarz bo'lsa)
  const rubBalance = allOps.reduce((s, op) => s + parseFloat(op.amount), 0);

  return { rubBalance, avgRate: runningAvgRate };
}

// ─── GET: USD operations list ─────────────────────────────────────────────────

export async function getUsdOperations() {
  return await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "usd"),
    with: { partner: true },
    orderBy: (t, { desc }) => [desc(t.id)],
  });
}

// ─── GET: RUB operations list ─────────────────────────────────────────────────

export async function getRubOperations() {
  return await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "rub"),
    with: { partner: true },
    orderBy: (t, { desc }) => [desc(t.id)],
  });
}

// ─── GET: Exchange history ────────────────────────────────────────────────────

export async function getExchangeHistory() {
  return await db.query.cashOperations.findMany({
    where: eq(cashOperations.type, "exchange"),
    with: { partner: true },
    orderBy: (t, { desc }) => [desc(t.id)],
  });
}

// ─── WRITE: Record RUB operation ─────────────────────────────────────────────

export async function recordRubOperation(data: {
  type: "income" | "expense";
  amount: number;
  partnerId?: number;
  description?: string;
}) {
  const signedAmount = data.type === "income" ? data.amount : -data.amount;

  await db.transaction(async (tx) => {
    await tx.insert(cashOperations).values({
      currency: "rub",
      type: data.type,
      amount: String(signedAmount),
      partnerId: data.partnerId ?? null,
      description: data.description ?? null,
    });

    if (data.partnerId) {
      const balanceAmount = data.type === "income" ? data.amount : -data.amount;
      await tx.insert(partnerBalances).values({
        partnerId: data.partnerId,
        amount: String(balanceAmount),
        currency: "rub",
        description: data.description ?? null,
      });
    }
  });

  revalidatePath("/cash");
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

// ─── WRITE: Boshlang'ich qoldiqlar ───────────────────────────────────────────

export async function setOpeningBalances(data: {
  usdCash: number;
  rubCash: number;
  rubRate?: number;
  partners: Array<{ partnerId: number; usdAmount: number; rubAmount: number; description?: string }>;
}) {
  await db.transaction(async (tx) => {
    if (data.usdCash !== 0) {
      await tx.insert(cashOperations).values({
        currency: "usd",
        type: data.usdCash > 0 ? "income" : "expense",
        amount: String(data.usdCash),
        description: "Boshlang'ich qoldiq",
      });
    }
    if (data.rubCash !== 0) {
      await tx.insert(cashOperations).values({
        currency: "rub",
        type: data.rubCash > 0 ? "income" : "expense",
        amount: String(data.rubCash),
        exchangeRate: data.rubRate && data.rubRate > 0 ? String(data.rubRate) : null,
        description: "Boshlang'ich qoldiq",
      });
    }
    for (const p of data.partners) {
      const desc = p.description || "Boshlang'ich qoldiq";
      if (p.usdAmount !== 0) {
        await tx.insert(partnerBalances).values({
          partnerId: p.partnerId,
          amount: String(p.usdAmount),
          currency: "usd",
          description: desc,
        });
      }
      if (p.rubAmount !== 0) {
        await tx.insert(partnerBalances).values({
          partnerId: p.partnerId,
          amount: String(p.rubAmount),
          currency: "rub",
          description: desc,
        });
      }
    }
  });
  revalidatePath("/cash");
  revalidatePath("/partners");
  revalidatePath("/sozlamalar");
}

// ─── WRITE: Record exchange ($ → RUB) ────────────────────────────────────────

export async function recordExchange(data: {
  usdAmount: number;
  rubAmount: number;
  rate: number;
  partnerId?: number;
  description?: string;
  date?: string;
}) {
  if (data.usdAmount <= 0 || data.rubAmount <= 0) {
    throw new Error("usdAmount va rubAmount musbat bo'lishi kerak");
  }

  const createdAt = data.date ? new Date(data.date) : undefined;

  await db.transaction(async (tx) => {
    // USD kassasidan chiqim
    await tx.insert(cashOperations).values({
      currency: "usd",
      type: "exchange",
      amount: String(-data.usdAmount),
      partnerId: data.partnerId ?? null,
      exchangeRate: String(data.rate),
      description: data.description ?? null,
      ...(createdAt ? { createdAt } : {}),
    });

    // RUB kassasiga kirim
    await tx.insert(cashOperations).values({
      currency: "rub",
      type: "income",
      amount: String(data.rubAmount),
      partnerId: data.partnerId ?? null,
      exchangeRate: String(data.rate),
      description: data.description ?? null,
      ...(createdAt ? { createdAt } : {}),
    });

    // Ayrboshlash to'liq tranzaksiya: dollar berdik + rubl oldik → qarz yo'q, balance o'zgarmaydi
  });

  revalidatePath("/cash");
}
