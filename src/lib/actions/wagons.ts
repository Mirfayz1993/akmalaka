"use server";

import { db } from "@/db";
import {
  transports,
  transportLogs,
  partnerBalances,
  cashOperations,
  timbers,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── GET TRANSPORTS ────────────────────────────────────────────────────────────

export async function getTransports(type: "wagon" | "truck") {
  return await db.query.transports.findMany({
    where: eq(transports.type, type),
    with: {
      supplier: true,
      timbers: true,
      expenses: {
        with: {
          partner: true,
        },
      },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

// ─── GET TRANSPORT ─────────────────────────────────────────────────────────────

export async function getTransport(id: number) {
  return await db.query.transports.findFirst({
    where: eq(transports.id, id),
    with: {
      supplier: true,
      timbers: true,
      expenses: {
        with: {
          partner: true,
        },
      },
      logs: true,
    },
  });
}

// ─── CREATE TRANSPORT ──────────────────────────────────────────────────────────

export async function createTransport(
  data: typeof transports.$inferInsert
) {
  const transport = await db.transaction(async (tx) => {
    const [transport] = await tx.insert(transports).values(data).returning();

    // Log yozish
    await tx.insert(transportLogs).values({
      transportId: transport.id,
      action: "Transport yaratildi",
    });

    const tonnage = data.tonnage ? Number(data.tonnage) : 0;

    // Kod UZ uchun partner_balances yozish
    if (data.codeUzSupplierId && data.codeUzPricePerTon) {
      const pricePerTon = Number(data.codeUzPricePerTon);
      // TZ qoida #1: tonnaj × $/t (KUB EMAS)
      const amount = -(tonnage * pricePerTon);
      await tx.insert(partnerBalances).values({
        partnerId: data.codeUzSupplierId,
        amount: String(amount),
        currency: "usd",
        description: "Kod UZ xarajati",
      });
    }

    // Kod KZ uchun partner_balances yozish
    if (data.codeKzSupplierId && data.codeKzPricePerTon) {
      const pricePerTon = Number(data.codeKzPricePerTon);
      // TZ qoida #1: tonnaj × $/t (KUB EMAS)
      const amount = -(tonnage * pricePerTon);
      await tx.insert(partnerBalances).values({
        partnerId: data.codeKzSupplierId,
        amount: String(amount),
        currency: "usd",
        description: "Kod KZ xarajati",
      });
    }

    // Standart xarajatlar uchun partner_balances yozish
    type ExpenseEntry = {
      amount: typeof data.expenseNds;
      partnerId: typeof data.expenseNdsPartnerId;
      description: string;
    };

    const standardExpenses: ExpenseEntry[] = [
      {
        amount: data.expenseNds,
        partnerId: data.expenseNdsPartnerId,
        description: "NDS xarajati",
      },
      {
        amount: data.expenseUsluga,
        partnerId: data.expenseUslugaPartnerId,
        description: "Usluga xarajati",
      },
      {
        amount: data.expenseTupik,
        partnerId: data.expenseTupikPartnerId,
        description: "Tupik xarajati",
      },
      {
        amount: data.expenseXrannei,
        partnerId: data.expenseXranneiPartnerId,
        description: "Xrannei xarajati",
      },
      {
        amount: data.expenseOrtish,
        partnerId: data.expenseOrtishPartnerId,
        description: "Ortish xarajati",
      },
      {
        amount: data.expenseTushurish,
        partnerId: data.expenseTushirishPartnerId,
        description: "Tushurish xarajati",
      },
    ];

    for (const expense of standardExpenses) {
      if (expense.amount && Number(expense.amount) > 0 && expense.partnerId) {
        // manfiy — biz ularga qarz
        const amount = -Number(expense.amount);
        await tx.insert(partnerBalances).values({
          partnerId: expense.partnerId,
          amount: String(amount),
          currency: "usd",
          description: expense.description,
        });
      }
    }

    return transport;
  });

  revalidatePath("/wagons");
  return transport;
}

// ─── UPDATE TRANSPORT ──────────────────────────────────────────────────────────

export async function updateTransport(
  id: number,
  data: Partial<typeof transports.$inferInsert>
) {
  const [transport] = await db
    .update(transports)
    .set(data)
    .where(eq(transports.id, id))
    .returning();

  await db.insert(transportLogs).values({
    transportId: id,
    action: "Transport yangilandi",
  });

  revalidatePath("/wagons");
  return transport;
}

// ─── UPDATE TRANSPORT STATUS ───────────────────────────────────────────────────

const validStatuses = ["in_transit", "at_border", "arrived", "unloaded", "closed"] as const;
type TransportStatus = typeof validStatuses[number];

export async function updateTransportStatus(id: number, status: TransportStatus) {
  if (!validStatuses.includes(status)) {
    throw new Error(`Noto'g'ri status: ${status}`);
  }

  const [transport] = await db
    .update(transports)
    .set({ status: status as typeof transports.$inferInsert["status"] })
    .where(eq(transports.id, id))
    .returning();

  await db.insert(transportLogs).values({
    transportId: id,
    action: `Status o'zgartirildi: ${status}`,
  });

  revalidatePath("/wagons");
  return transport;
}

// ─── CLOSE TRANSPORT ───────────────────────────────────────────────────────────

export async function closeTransport(id: number) {
  // Transport ma'lumotlarini timbers bilan ol
  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, id),
    with: {
      timbers: true,
    },
  });

  if (!transport) {
    throw new Error("Transport topilmadi");
  }

  // TZ qoida #2: Toshkent soni bo'yicha jami kub hisoblash
  let totalCubTashkent = 0;
  for (const timber of transport.timbers) {
    const tashkentCount = timber.tashkentCount ?? 0;
    const cub =
      (timber.thicknessMm / 1000) *
      (timber.widthMm / 1000) *
      Number(timber.lengthM) *
      tashkentCount;
    totalCubTashkent += cub;
  }

  const rubPricePerCubic = Number(transport.rubPricePerCubic ?? 0);
  const totalRub = totalCubTashkent * rubPricePerCubic;

  // TZ qoida #10: RUB kassa balansini tekshirish
  const rubOpsResult = await db
    .select({ totalAmount: sql<string>`COALESCE(SUM(${cashOperations.amount}), 0)` })
    .from(cashOperations)
    .where(eq(cashOperations.currency, "rub"));

  const rubBalance = Number(rubOpsResult[0]?.totalAmount ?? 0);

  if (rubBalance < totalRub) {
    throw new Error("RUB kassada yetarli mablag' yo'q");
  }

  // TZ qoida #3: Weighted average kurs hisoblash
  // Barcha RUB income operatsiyalaridan o'rtacha kurs topamiz
  // avgRate = Σ(amount) / Σ(amount/exchangeRate) — faqat income va ijobiy amount uchun
  const rubIncomeOps = await db
    .select({
      amount: cashOperations.amount,
      exchangeRate: cashOperations.exchangeRate,
    })
    .from(cashOperations)
    .where(eq(cashOperations.currency, "rub"));

  let totalRubAmount = 0;
  let totalUsdEquivalent = 0;

  for (const op of rubIncomeOps) {
    const opAmount = Number(op.amount);
    const opRate = Number(op.exchangeRate ?? 0);
    if (opAmount > 0 && opRate > 0) {
      totalRubAmount += opAmount;
      totalUsdEquivalent += opAmount / opRate;
    }
  }

  let avgRate = totalUsdEquivalent > 0 ? totalRubAmount / totalUsdEquivalent : 1;

  // Agar kurs topilmasa, xato
  if (avgRate <= 0) {
    throw new Error("RUB kassada kurs ma'lumoti topilmadi");
  }

  const totalUsd = totalRub / avgRate;

  await db.transaction(async (tx) => {
    // RUB kassasidan chiqim yozish
    await tx.insert(cashOperations).values({
      currency: "rub",
      type: "expense",
      amount: String(-totalRub),
      transportId: id,
      description: `Vagon yopildi — Rossiya ta'minotchisi to'lovi`,
    });

    // Rossiya ta'minotchisi partner_balances da qarzni yopish
    if (transport.supplierId) {
      // musbat — ular bizga qarz emas endi (qarzni yopamiz)
      await tx.insert(partnerBalances).values({
        partnerId: transport.supplierId,
        amount: String(totalUsd),
        currency: "usd",
        description: `Vagon yopildi — to'lov amalga oshirildi`,
      });
    }

    // Transport ni yangilash
    await tx
      .update(transports)
      .set({
        status: "closed",
        closedAt: new Date().toISOString().split("T")[0],
        rubExchangeRate: String(avgRate),
      })
      .where(eq(transports.id, id));

    // Log yozish
    await tx.insert(transportLogs).values({
      transportId: id,
      action: `Vagon yopildi. RUB: ${totalRub.toFixed(2)}, $: ${totalUsd.toFixed(2)}, Kurs: ${avgRate.toFixed(2)}`,
    });
  });

  revalidatePath("/wagons");
  return { totalRub, totalUsd, avgRate };
}

// ─── DELETE TRANSPORT ──────────────────────────────────────────────────────────

export async function deleteTransport(id: number) {
  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, id),
  });

  if (!transport) {
    throw new Error("Transport topilmadi");
  }

  if (transport.status !== "in_transit") {
    throw new Error("Faqat yo'ldagi transportni o'chirish mumkin");
  }

  await db.delete(transports).where(eq(transports.id, id));
  revalidatePath("/wagons");
}
