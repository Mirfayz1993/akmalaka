"use server";

import { db } from "@/db";
import {
  sales,
  saleItems,
  timbers,
  warehouse,
  partnerBalances,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type SaleItemInput = {
  timberId?: number;
  warehouseId?: number;
  transportId?: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sentCount: number;
  pricePerCubicUsd: number;
};

// ─── GET: Barcha savdolar ─────────────────────────────────────────────────────

export async function getSales() {
  return await db.query.sales.findMany({
    with: {
      customer: true,
      items: {
        with: {
          timber: {
            with: { transport: true },
          },
          transport: true,
        },
      },
    },
    orderBy: (t, { desc }) => [desc(t.sentAt)],
  });
}

// ─── GET: Bitta savdo ─────────────────────────────────────────────────────────

export async function getSale(id: number) {
  return await db.query.sales.findFirst({
    where: eq(sales.id, id),
    with: {
      customer: true,
      items: {
        with: {
          timber: {
            with: { transport: true },
          },
          transport: true,
        },
      },
    },
  });
}

// ─── CREATE: Yangi savdo ──────────────────────────────────────────────────────

export async function createSale(data: {
  customerId: number;
  notes?: string;
  items: SaleItemInput[];
}) {
  // Har item uchun kub va totalUsd hisoblash
  const itemsWithCalc = data.items.map((item) => {
    const kub =
      (item.thicknessMm / 1000) *
      (item.widthMm / 1000) *
      item.lengthM *
      item.sentCount;
    const totalUsd = kub * item.pricePerCubicUsd;
    return { ...item, kub, totalUsd };
  });

  const totalSentUsd = itemsWithCalc.reduce(
    (sum, item) => sum + item.totalUsd,
    0
  );

  await db.transaction(async (tx) => {
    // Bug 3: docNumber hisoblash transaksiya ichida (race condition yo'q)
    const lastSale = await tx.query.sales.findFirst({
      orderBy: (s, { desc }) => [desc(s.docNumber)],
    });
    const lastNum = lastSale?.docNumber ? parseInt(lastSale.docNumber, 10) : 0;
    const nextNum = (lastNum % 9999) + 1;
    const docNumber = String(nextNum).padStart(4, "0");

    // sales jadvaliga insert
    const [newSale] = await tx
      .insert(sales)
      .values({
        customerId: data.customerId,
        notes: data.notes ?? null,
        status: "sent",
        sentAt: new Date(),
        docNumber,
        totalSentUsd: String(totalSentUsd),
      })
      .returning();

    // saleItems jadvaliga insert
    for (const item of itemsWithCalc) {
      await tx.insert(saleItems).values({
        saleId: newSale.id,
        timberId: item.timberId ?? null,
        warehouseId: item.warehouseId ?? null,
        transportId: item.transportId ?? null,
        thicknessMm: item.thicknessMm,
        widthMm: item.widthMm,
        lengthM: String(item.lengthM),
        sentCount: item.sentCount,
        pricePerCubicUsd: String(item.pricePerCubicUsd),
        totalUsd: String(item.totalUsd),
      });

      // warehouseId bo'lsa → yuborishda darhol ombor kamaytirish
      if (item.warehouseId) {
        const wItem = await tx.query.warehouse.findFirst({
          where: eq(warehouse.id, item.warehouseId),
        });
        if (!wItem || wItem.quantity < item.sentCount) {
          throw new Error("Omborda yetarli miqdor yo'q");
        }
        await tx
          .update(warehouse)
          .set({ quantity: sql`${warehouse.quantity} - ${item.sentCount}` })
          .where(eq(warehouse.id, item.warehouseId));
      }
    }
  });

  revalidatePath("/sales");
}

// ─── RECEIVE: Savdoni qabul qilish ───────────────────────────────────────────

export async function receiveSale(
  saleId: number,
  items: { itemId: number; receivedCount: number }[],
  newItems?: SaleItemInput[]
) {
  await db.transaction(async (tx) => {
    // Bug 1: Idempotentlik tekshiruvi — transaksiya ichida qayta o'qish
    const sale = await tx.query.sales.findFirst({
      where: eq(sales.id, saleId),
      with: { items: true },
    });
    if (!sale) throw new Error("Savdo topilmadi");
    if (sale.status === "received") throw new Error("Bu savdo allaqachon qabul qilingan");

    // Har item uchun yangilash
    for (const { itemId, receivedCount } of items) {
      // saleItems yangilash: receivedCount
      await tx
        .update(saleItems)
        .set({ receivedCount })
        .where(eq(saleItems.id, itemId));

      // Sale item ma'lumotlarini topish
      const saleItem = sale.items.find((i) => i.id === itemId);
      if (!saleItem) continue;

      // timberId bo'lsa → timbers.customerCount += receivedCount
      if (saleItem.timberId) {
        await tx
          .update(timbers)
          .set({
            customerCount: sql`${timbers.customerCount} + ${receivedCount}`,
          })
          .where(eq(timbers.id, saleItem.timberId));
      }
      // warehouseId bo'lsa → ombor allaqachon createSale da ayirilgan, bu yerda qilmaymiz
    }

    // Yangi items qo'shish (qabul paytida vagondan qo'shilgan)
    if (newItems && newItems.length > 0) {
      for (const newItem of newItems) {
        const kub =
          (newItem.thicknessMm / 1000) *
          (newItem.widthMm / 1000) *
          newItem.lengthM *
          newItem.sentCount;
        const itemTotalUsd = kub * newItem.pricePerCubicUsd;

        // saleItems ga insert (sentCount = receivedCount — darhol qabul)
        await tx.insert(saleItems).values({
          saleId,
          timberId: newItem.timberId ?? null,
          transportId: newItem.transportId ?? null,
          thicknessMm: newItem.thicknessMm,
          widthMm: newItem.widthMm,
          lengthM: String(newItem.lengthM),
          sentCount: newItem.sentCount,
          receivedCount: newItem.sentCount,
          pricePerCubicUsd: String(newItem.pricePerCubicUsd),
          totalUsd: String(itemTotalUsd),
        });

        // timberId bo'lsa → timbers.customerCount += sentCount (vagon hisobi)
        if (newItem.timberId) {
          await tx
            .update(timbers)
            .set({ customerCount: sql`${timbers.customerCount} + ${newItem.sentCount}` })
            .where(eq(timbers.id, newItem.timberId));
        }
      }
    }

    // totalReceivedUsd hisoblash
    // Yangilangan receivedCount lardan hisoblash
    const itemsMap = new Map(items.map((i) => [i.itemId, i.receivedCount]));
    let totalReceivedUsd = 0;

    for (const saleItem of sale.items) {
      const receivedCount = itemsMap.get(saleItem.id) ?? saleItem.receivedCount ?? 0;
      if (
        saleItem.thicknessMm &&
        saleItem.widthMm &&
        saleItem.lengthM &&
        saleItem.pricePerCubicUsd
      ) {
        const kub =
          (saleItem.thicknessMm / 1000) *
          (saleItem.widthMm / 1000) *
          parseFloat(saleItem.lengthM) *
          receivedCount;
        totalReceivedUsd += kub * parseFloat(saleItem.pricePerCubicUsd);
      }
    }

    // Yangi items ni totalReceivedUsd ga qo'shish
    if (newItems && newItems.length > 0) {
      for (const newItem of newItems) {
        const kub =
          (newItem.thicknessMm / 1000) *
          (newItem.widthMm / 1000) *
          newItem.lengthM *
          newItem.sentCount;
        totalReceivedUsd += kub * newItem.pricePerCubicUsd;
      }
    }

    // sales yangilash
    await tx
      .update(sales)
      .set({
        status: "received",
        receivedAt: new Date(),
        totalReceivedUsd: String(totalReceivedUsd),
      })
      .where(eq(sales.id, saleId));

    // Mijoz qabul qildi → uning qarzi sifatida yozamiz (musbat = ular bizga qarz)
    await tx.insert(partnerBalances).values({
      partnerId: sale.customerId,
      amount: String(totalReceivedUsd),
      currency: "usd",
      description: `Savdo #${sale.docNumber}`,
      docNumber: sale.docNumber ?? null,
    });
  });

  revalidatePath("/sales");
}

// ─── DELETE: Savdoni o'chirish ────────────────────────────────────────────────

export async function deleteSale(id: number) {
  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, id),
  });

  if (!sale) {
    throw new Error("Savdo topilmadi");
  }

  if (sale.status !== "sent") {
    throw new Error("Faqat jo'natilgan savdoni o'chirish mumkin");
  }

  await db.delete(sales).where(eq(sales.id, id));

  revalidatePath("/sales");
}
