"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { codes, partnerBalances, transports, cashOperations } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── GET: Mavjud kodlar (status = 'available') ────────────────────────────────

export async function getCodeInventory() {
  return await db.query.codes.findMany({
    where: eq(codes.status, "available"),
    with: {
      supplier: true,
    },
    orderBy: (t, { asc, desc }) => [asc(t.type), desc(t.createdAt)],
  });
}

// ─── GET: Barcha kodlar tarixi ────────────────────────────────────────────────

export async function getCodeHistory() {
  return await db.query.codes.findMany({
    where: (t, { ne }) => ne(t.status, "available"),
    with: {
      supplier: true,
      usedInTransport: true,
      soldToPartner: true,
    },
    orderBy: (t, { asc }) => [asc(t.id)],
    limit: 100,
  });
}

// ─── BUY: Yangi kodlar xaridi ─────────────────────────────────────────────────

export async function buyCode(data: {
  type: "kz" | "uz" | "afgon";
  supplierId: number;
  quantity: number;
  date?: string;
}) {
  const createdAt = data.date ? new Date(data.date) : undefined;
  const rows = Array.from({ length: data.quantity }, () => ({
    type: data.type,
    supplierId: data.supplierId,
    status: "available" as const,
    buyPricePerTon: null,
    ...(createdAt ? { createdAt } : {}),
  }));
  await db.insert(codes).values(rows);
  revalidatePath("/codes");
}

// ─── USE: Kodni transportda ishlatish ────────────────────────────────────────

export async function useCodeInTransport(data: {
  codeId: number;
  transportId: number;
  buyPricePerTon: number;
}) {
  await db.transaction(async (tx) => {
    // Transportni topib tonnajini ol
    const transport = await tx.query.transports.findFirst({
      where: eq(transports.id, data.transportId),
    });

    if (!transport) {
      throw new Error("Transport topilmadi");
    }

    const tonnage = parseFloat(transport.tonnage ?? "0");
    if (tonnage <= 0) {
      throw new Error("Transport tonnaji noto'g'ri");
    }

    // TZ qoida #1: buyCostUsd = tonnage × buyPricePerTon
    const buyCostUsd = tonnage * data.buyPricePerTon;

    // TZ qoida #4: sellPriceUsd = buyCostUsd (foyda = 0)
    const sellPriceUsd = buyCostUsd;

    // Kodni topib supplierId ni ol (balans uchun)
    const code = await tx.query.codes.findFirst({
      where: eq(codes.id, data.codeId),
    });

    if (!code) {
      throw new Error("Kod topilmadi");
    }

    // Kodni yangilash
    await tx
      .update(codes)
      .set({
        status: "used",
        usedAt: new Date(),
        usedInTransportId: data.transportId,
        buyPricePerTon: String(data.buyPricePerTon),
        buyCostUsd: String(buyCostUsd),
        sellPriceUsd: String(sellPriceUsd),
      })
      .where(eq(codes.id, data.codeId));

    // Ta'minotchi balansida manfiy yozuv: biz ularga qarz
    await tx.insert(partnerBalances).values({
      partnerId: code.supplierId,
      amount: String(-buyCostUsd),
      currency: "usd",
      description: `Kod transportda ishlatildi (transport #${data.transportId})`,
    });
  });

  revalidatePath("/codes");
}

// ─── SELL: Kodni sotish ───────────────────────────────────────────────────────

export async function sellCode(data: {
  codeId: number;
  customerId: number;
  tonnage: number;
  buyPricePerTon: number;
  sellPricePerTon: number;
  wagonNumber?: string;
  date?: string;
}) {
  const wagonInfo = data.wagonNumber ? ` — Vagon #${data.wagonNumber}` : "";
  const soldAt = data.date ? new Date(data.date) : new Date();

  await db.transaction(async (tx) => {
    const code = await tx.query.codes.findFirst({
      where: eq(codes.id, data.codeId),
    });

    if (!code) throw new Error("Kod topilmadi");

    const buyCostUsd = data.tonnage * data.buyPricePerTon;
    const sellPriceUsd = data.tonnage * data.sellPricePerTon;

    await tx
      .update(codes)
      .set({
        status: "sold",
        tonnage: String(data.tonnage),
        buyPricePerTon: String(data.buyPricePerTon),
        buyCostUsd: String(buyCostUsd),
        sellPriceUsd: String(sellPriceUsd),
        sellPricePerTon: String(data.sellPricePerTon),
        soldToPartnerId: data.customerId,
        usedAt: soldAt,
      })
      .where(eq(codes.id, data.codeId));

    // Ta'minotchiga qarz (biz ularga to'laymiz)
    await tx.insert(partnerBalances).values({
      partnerId: code.supplierId,
      amount: String(-buyCostUsd),
      currency: "usd",
      description: `Kod xarajati${wagonInfo}`,
      createdAt: soldAt,
    });

    // Mijozdan daromad (ular bizga to'laydi)
    await tx.insert(partnerBalances).values({
      partnerId: data.customerId,
      amount: String(sellPriceUsd),
      currency: "usd",
      description: `Kod sotuvi${wagonInfo}`,
      createdAt: soldAt,
    });
  });

  revalidatePath("/codes");
}

// ─── SELL BATCH: Bir nechta kodni bitta operatsiyada sotish ──────────────────

export async function sellCodesBatch(data: {
  items: Array<{
    codeId: number;
    type: "kz" | "uz" | "afgon";
    tonnage: number;
    buyPricePerTon: number;
    sellPricePerTon: number;
  }>;
  customerId: number;
  wagonNumber?: string;
  date?: string;
}) {
  const wagonInfo = data.wagonNumber ? ` — Vagon #${data.wagonNumber}` : "";
  const soldAt = data.date ? new Date(data.date) : new Date();
  const batchId = `${Date.now()}${data.wagonNumber ? `|${data.wagonNumber}` : ""}`;

  await db.transaction(async (tx) => {
    // Har bir kodni alohida yangilash + supplier bo'yicha xarajatni yig'ish
    const supplierTotals: Record<number, number> = {};
    let totalSellPrice = 0;

    for (const item of data.items) {
      const code = await tx.query.codes.findFirst({ where: eq(codes.id, item.codeId) });
      if (!code) throw new Error(`Kod #${item.codeId} topilmadi`);

      const buyCostUsd = item.tonnage * item.buyPricePerTon;
      const sellPriceUsd = item.tonnage * item.sellPricePerTon;

      await tx.update(codes).set({
        status: "sold",
        tonnage: String(item.tonnage),
        buyPricePerTon: String(item.buyPricePerTon),
        buyCostUsd: String(buyCostUsd),
        sellPriceUsd: String(sellPriceUsd),
        sellPricePerTon: String(item.sellPricePerTon),
        soldToPartnerId: data.customerId,
        usedAt: soldAt,
        notes: batchId,
      }).where(eq(codes.id, item.codeId));

      supplierTotals[code.supplierId] = (supplierTotals[code.supplierId] ?? 0) + buyCostUsd;
      totalSellPrice += sellPriceUsd;
    }

    // Har bir ta'minotchi uchun bitta yozuv
    for (const [supplierId, total] of Object.entries(supplierTotals)) {
      await tx.insert(partnerBalances).values({
        partnerId: Number(supplierId),
        amount: String(-total),
        currency: "usd",
        description: `Kod xarajati${wagonInfo}`,
        createdAt: soldAt,
      });
    }

    // Mijoz uchun bitta yozuv (jami summa)
    await tx.insert(partnerBalances).values({
      partnerId: data.customerId,
      amount: String(totalSellPrice),
      currency: "usd",
      description: `Kod sotuvi${wagonInfo}`,
      createdAt: soldAt,
    });
  });

  revalidatePath("/codes");
  revalidatePath("/partners");
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type CodeWithSupplier = Awaited<ReturnType<typeof getCodeInventory>>[number];
export type CodeHistoryItem = Awaited<ReturnType<typeof getCodeHistory>>[number];

// ─── DELETE: Kodni o'chirish (faqat available) ────────────────────────────────

export async function deleteCode(id: number) {
  const code = await db.query.codes.findFirst({
    where: eq(codes.id, id),
  });

  if (!code) {
    throw new Error("Kod topilmadi");
  }

  if (code.status !== "available") {
    throw new Error("Faqat mavjud kodni o'chirish mumkin");
  }

  await db.delete(codes).where(eq(codes.id, id));

  revalidatePath("/codes");
}
