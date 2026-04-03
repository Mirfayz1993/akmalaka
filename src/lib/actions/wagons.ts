"use server";

import { db } from "@/db";
import {
  transports,
  transportLogs,
  partnerBalances,
  cashOperations,
  timbers,
  transportExpenses,
  warehouse,
  saleItems,
  codes,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addToWarehouse, backfillWarehouseFromClosedWagons } from "./warehouse";

// ─── STATUS TIZIMI ─────────────────────────────────────────────────────────────
// NOTE: "use server" fayldan faqat async funksiyalar export qilinadi.
// Konstant va tiplar bu yerda emas, balki alohida faylda bo'lishi kerak.

type TransportStatus = "in_transit" | "at_border" | "arrived" | "unloaded" | "closed";

// Faqat bitta keyingi statusga o'tish mumkin
const NEXT_STATUS_MAP: Record<string, TransportStatus> = {
  in_transit: "arrived",
  arrived: "unloaded",
  unloaded: "closed",
};

function getNextStatus(current: string): TransportStatus | null {
  return NEXT_STATUS_MAP[current] ?? null;
}

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
      logs: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 100,
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

type TimberInput = {
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  russiaCount: number;
};

export async function createTransport(
  data: typeof transports.$inferInsert,
  timberRows?: TimberInput[]
) {
  const transport = await db.transaction(async (tx) => {
    const [transport] = await tx.insert(transports).values({
      ...data,
      status: "in_transit",
    }).returning();

    // Timber qatorlarini saqlash
    if (timberRows && timberRows.length > 0) {
      const validTimbers = timberRows.filter(
        (r) => r.thicknessMm > 0 && r.widthMm > 0 && r.lengthM > 0 && r.russiaCount > 0
      );
      if (validTimbers.length > 0) {
        await tx.insert(timbers).values(
          validTimbers.map((r) => ({
            transportId: transport.id,
            thicknessMm: r.thicknessMm,
            widthMm: r.widthMm,
            lengthM: String(r.lengthM),
            russiaCount: r.russiaCount,
          }))
        );
      }
    }

    await tx.insert(transportLogs).values({
      transportId: transport.id,
      action: "Transport yaratildi (Yo'lda statusida)",
    });

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

// ─── ARRIVE TRANSPORT (Yo'lda → Yetib kelgan) ─────────────────────────────────

export async function arriveTransport(id: number) {
  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, id),
    with: { timbers: true },
  });

  if (!transport) throw new Error("Transport topilmadi");
  if (transport.status !== "in_transit") {
    throw new Error("Faqat 'Yo'lda' statusidagi transportni 'Yetib kelgan'ga o'tkazish mumkin");
  }

  const today = new Date().toISOString().split("T")[0];
  const tonnage = Number(transport.tonnage ?? 0);

  await db.transaction(async (tx) => {
    // Statusni o'zgartirish
    await tx
      .update(transports)
      .set({ status: "arrived", arrivedAt: transport.arrivedAt ?? today })
      .where(eq(transports.id, id));

    // Kod UZ uchun partner_balances
    if (transport.codeUzSupplierId && transport.codeUzPricePerTon) {
      const amount = -(tonnage * Number(transport.codeUzPricePerTon));
      await tx.insert(partnerBalances).values({
        partnerId: transport.codeUzSupplierId,
        amount: String(amount),
        currency: "usd",
        description: "Kod UZ xarajati",
        transportId: id,
      });
    }

    // Kod KZ uchun partner_balances
    if (transport.codeKzSupplierId && transport.codeKzPricePerTon) {
      const amount = -(tonnage * Number(transport.codeKzPricePerTon));
      await tx.insert(partnerBalances).values({
        partnerId: transport.codeKzSupplierId,
        amount: String(amount),
        currency: "usd",
        description: "Kod KZ xarajati",
        transportId: id,
      });
    }

    // Yuk mashina egasi uchun partner_balances (faqat truck)
    if (transport.type === "truck" && transport.truckOwnerId && transport.truckOwnerPayment) {
      const amount = -Number(transport.truckOwnerPayment);
      await tx.insert(partnerBalances).values({
        partnerId: transport.truckOwnerId,
        amount: String(amount),
        currency: "usd",
        description: "Yuk mashina egasiga to'lov",
        transportId: id,
      });
    }

    // Toshkent sonlarini rossiya sonidan default to'ldirish
    for (const timber of transport.timbers) {
      if ((timber.tashkentCount ?? 0) === 0 && timber.russiaCount > 0) {
        await tx
          .update(timbers)
          .set({ tashkentCount: timber.russiaCount })
          .where(eq(timbers.id, timber.id));
      }
    }

    await tx.insert(transportLogs).values({
      transportId: id,
      action: "Status o'zgartirildi: Yetib kelgan",
    });
  });

  revalidatePath("/wagons");
}

// ─── UNLOAD TRANSPORT (Yetib kelgan → Tushurilgan) ─────────────────────────────

export async function unloadTransport(id: number) {
  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, id),
    with: { timbers: true },
  });

  if (!transport) throw new Error("Transport topilmadi");
  if (transport.status !== "arrived") {
    throw new Error("Faqat 'Yetib kelgan' statusidagi transportni 'Tushurilgan'ga o'tkazish mumkin");
  }

  const today = new Date().toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    // Standart xarajatlar balanslarini yaratish
    type ExpenseEntry = {
      amount: typeof transport.expenseNds;
      partnerId: typeof transport.expenseNdsPartnerId;
      description: string;
    };

    const standardExpenses: ExpenseEntry[] = [
      { amount: transport.expenseNds, partnerId: transport.expenseNdsPartnerId, description: "NDS xarajati" },
      { amount: transport.expenseUsluga, partnerId: transport.expenseUslugaPartnerId, description: "Usluga xarajati" },
      { amount: transport.expenseTupik, partnerId: transport.expenseTupikPartnerId, description: "Tupik xarajati" },
      { amount: transport.expenseXrannei, partnerId: transport.expenseXranneiPartnerId, description: "Xrannei xarajati" },
      { amount: transport.expenseOrtish, partnerId: transport.expenseOrtishPartnerId, description: "Ortish xarajati" },
      { amount: transport.expenseTushurish, partnerId: transport.expenseTushirishPartnerId, description: "Tushurish xarajati" },
    ];

    for (const expense of standardExpenses) {
      if (expense.amount && Number(expense.amount) > 0 && expense.partnerId) {
        await tx.insert(partnerBalances).values({
          partnerId: expense.partnerId,
          amount: String(-Number(expense.amount)),
          currency: "usd",
          description: expense.description,
          transportId: id,
        });
      }
    }

    // SupplierCount ni tashkentCount dan default to'ldirish
    for (const timber of transport.timbers) {
      if ((timber.supplierCount ?? 0) === 0 && (timber.tashkentCount ?? 0) > 0) {
        await tx
          .update(timbers)
          .set({ supplierCount: timber.tashkentCount })
          .where(eq(timbers.id, timber.id));
      }
    }

    // Status o'zgartirish
    await tx
      .update(transports)
      .set({ status: "unloaded", unloadedAt: today })
      .where(eq(transports.id, id));

    await tx.insert(transportLogs).values({
      transportId: id,
      action: "Status o'zgartirildi: Tushurilgan",
    });
  });

  revalidatePath("/wagons");
}

// ─── CLOSE TRANSPORT (Tushurilgan → Yopilgan) ──────────────────────────────────

export async function closeTransport(id: number) {
  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, id),
    with: { timbers: true },
  });

  if (!transport) throw new Error("Transport topilmadi");
  if (transport.status !== "unloaded") {
    throw new Error("Faqat 'Tushurilgan' statusidagi transportni 'Yopilgan'ga o'tkazish mumkin");
  }

  const today = new Date().toISOString().split("T")[0];

  // Ta'minotchi soni (supplierCount) bo'yicha RUB to'lov hisoblash
  let totalCubSupplier = 0;
  for (const timber of transport.timbers) {
    const supplierCount = timber.supplierCount ?? timber.tashkentCount ?? 0;
    totalCubSupplier += (timber.thicknessMm / 1000) * (timber.widthMm / 1000) * Number(timber.lengthM) * supplierCount;
  }

  const rubPricePerCubic = Number(transport.rubPricePerCubic ?? 0);
  const totalRub = totalCubSupplier * rubPricePerCubic;

  // O'rtacha RUB kursi hisoblash
  const rubIncomeOps = await db
    .select({ amount: cashOperations.amount, exchangeRate: cashOperations.exchangeRate })
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
  const avgRate = totalUsdEquivalent > 0 ? totalRubAmount / totalUsdEquivalent : 1;

  await db.transaction(async (tx) => {
    // RUB kassadan ta'minotchiga to'lov
    if (totalRub > 0) {
      await tx.insert(cashOperations).values({
        currency: "rub",
        type: "expense",
        amount: String(-totalRub),
        exchangeRate: String(avgRate),
        transportId: id,
        description: `Ta'minotchiga to'lov — transport #${transport.number ?? id}`,
      });

      // Rossiya ta'minotchisi balansi (USD ekvivalenti)
      if (transport.supplierId && avgRate > 0) {
        const totalUsd = totalRub / avgRate;
        await tx.insert(partnerBalances).values({
          partnerId: transport.supplierId,
          amount: String(-totalUsd),
          currency: "usd",
          transportId: id,
          description: `Yog'och to'lovi (ta'minotchi soni) — transport #${transport.number ?? id}`,
        });
      }
    }

    await tx
      .update(transports)
      .set({ status: "closed", closedAt: today })
      .where(eq(transports.id, id));

    await tx.insert(transportLogs).values({
      transportId: id,
      action: "Status o'zgartirildi: Yopilgan",
    });
  });

  await backfillWarehouseFromClosedWagons();

  revalidatePath("/wagons");
  revalidatePath("/warehouse");
}

// ─── DELETE TRANSPORT ──────────────────────────────────────────────────────────

export async function deleteTransport(id: number) {
  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, id),
  });

  if (!transport) {
    throw new Error("Transport topilmadi");
  }

  if (transport.status !== "in_transit" && transport.status !== "at_border") {
    throw new Error("Faqat yo'ldagi transportni o'chirish mumkin");
  }

  await db.transaction(async (tx) => {
    // FK bog'liq yozuvlarni cascade o'chirish (schema da CASCADE yo'q joylar)
    await tx.delete(partnerBalances).where(eq(partnerBalances.transportId, id));
    await tx.delete(cashOperations).where(eq(cashOperations.transportId, id));
    await tx.delete(saleItems).where(eq(saleItems.transportId, id));
    await tx.delete(warehouse).where(eq(warehouse.transportId, id));
    // codes.usedInTransportId ni NULL ga o'rnatish (o'chirmaslik)
    await tx.update(codes).set({ usedInTransportId: null }).where(eq(codes.usedInTransportId, id));
    // timbers, transportExpenses, transportLogs — schema da CASCADE bor, avtomatik o'chadi
    await tx.delete(transports).where(eq(transports.id, id));
  });

  revalidatePath("/wagons");
}

// ─── ADD TRANSPORT EXPENSE ─────────────────────────────────────────────────────

export async function addTransportExpense(
  transportId: number,
  data: { name: string; amount: string; partnerId?: number }
) {
  const [expense] = await db
    .insert(transportExpenses)
    .values({
      transportId,
      name: data.name,
      amount: data.amount,
      partnerId: data.partnerId,
    })
    .returning();
  revalidatePath("/wagons");
  return expense;
}

// ─── DELETE TRANSPORT EXPENSE ──────────────────────────────────────────────────

export async function deleteTransportExpense(id: number) {
  await db.delete(transportExpenses).where(eq(transportExpenses.id, id));
  revalidatePath("/wagons");
}

// ─── GET TRANSPORT SALE ITEMS ──────────────────────────────────────────────────

export async function getTransportSaleItems(transportId: number) {
  const { saleItems, sales, partners, timbers: timbersTable } = await import("@/db/schema");
  const { and } = await import("drizzle-orm");

  return await db.query.saleItems.findMany({
    where: eq(saleItems.transportId, transportId),
    with: {
      sale: {
        with: { customer: true },
      },
      timber: true,
      warehouse: true,
    },
    orderBy: (si, { desc }) => [desc(si.createdAt)],
  });
}
