"use server";

import { db } from "@/db";
import { sales, wagonTimber, debts, debtPayments, cashOperations } from "@/db/schema";
import { eq } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type PaymentType = "full" | "partial" | "debt";

export type SaleWithRelations = {
  id: number;
  clientId: number;
  wagonTimberId: number;
  quantity: number;
  cubicMeters: number;
  pricePerCubicUsd: number;
  totalAmountUsd: number;
  saleDate: string;
  notes: string | null;
  createdAt: Date | null;
  client: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  wagonTimber: {
    id: number;
    widthMm: number;
    thicknessMm: number;
    lengthM: number;
    quantity: number;
    remainingQuantity: number | null;
    wagonId: number;
  } | null;
};

export type AvailableTimber = {
  id: number;
  wagonId: number;
  widthMm: number;
  thicknessMm: number;
  lengthM: number;
  quantity: number;
  cubicMeters: number;
  pricePerCubicRub: number;
  pricePerCubicUsd: number | null;
  remainingQuantity: number | null;
  notes: string | null;
  wagon: {
    id: number;
    wagonNumber: string;
    shipmentId: number;
  } | null;
};

export type CreateSaleData = {
  clientId: number;
  wagonTimberId: number;
  quantity: number;
  pricePerCubicUsd: number;
  saleDate: string;
  notes?: string;
  paymentType: PaymentType;
  paidAmount?: number;
};

// ==========================================
// GET ALL SALES
// ==========================================

/**
 * Barcha sotuvlarni qaytaradi.
 * Har bir sotuv bilan mijoz nomi va taxta o'lchamlari birga keladi.
 */
export async function getSales(): Promise<SaleWithRelations[]> {
  return (await db.query.sales.findMany({
    with: {
      client: {
        columns: { id: true, name: true, phone: true },
      },
      wagonTimber: {
        columns: {
          id: true,
          widthMm: true,
          thicknessMm: true,
          lengthM: true,
          quantity: true,
          remainingQuantity: true,
          wagonId: true,
        },
      },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })) as SaleWithRelations[];
}

// ==========================================
// CREATE SALE
// ==========================================

/**
 * Yangi sotuv yaratadi.
 * To'lov turiga qarab kassa yozuvi va/yoki qarz yaratadi.
 */
export async function createSale(data: CreateSaleData) {
  // 1. wagonTimber ma'lumotlarini olish
  const timber = await db
    .select()
    .from(wagonTimber)
    .where(eq(wagonTimber.id, data.wagonTimberId))
    .then((r) => r[0]);

  if (!timber) {
    throw new Error("Taxta topilmadi");
  }

  // 2. Kubometr hisoblash: (eni/1000) * (qalinligi/1000) * uzunligi * soni
  const cubicMeters =
    (timber.widthMm / 1000) *
    (timber.thicknessMm / 1000) *
    timber.lengthM *
    data.quantity;

  // 3. Jami summa hisoblash
  const totalAmountUsd = cubicMeters * data.pricePerCubicUsd;

  // 4. Ombordagi qolgan miqdorni tekshirish va kamaytirish
  const currentRemaining = timber.remainingQuantity ?? timber.quantity;
  if (currentRemaining < data.quantity) {
    throw new Error(
      `Yetarli taxta yo'q. Omborda: ${currentRemaining} dona, so'ralgan: ${data.quantity} dona`
    );
  }

  const newRemaining = currentRemaining - data.quantity;

  // 5. remainingQuantity ni yangilash
  await db
    .update(wagonTimber)
    .set({ remainingQuantity: newRemaining })
    .where(eq(wagonTimber.id, data.wagonTimberId));

  // 6. Sotuvni yozish
  const [newSale] = await db
    .insert(sales)
    .values({
      clientId: data.clientId,
      wagonTimberId: data.wagonTimberId,
      quantity: data.quantity,
      cubicMeters,
      pricePerCubicUsd: data.pricePerCubicUsd,
      totalAmountUsd,
      saleDate: data.saleDate,
      notes: data.notes ?? null,
    })
    .returning();

  // 7. To'lov turiga qarab kassa va qarz yozish
  if (data.paymentType === "full") {
    // To'liq to'lov: kassaga kirim yozish
    await db.insert(cashOperations).values({
      type: "income",
      category: "sale",
      amount: totalAmountUsd,
      currency: "USD",
      relatedSaleId: newSale.id,
      description: `Sotuv #${newSale.id} — to'liq to'lov`,
      date: data.saleDate,
    });
  } else if (data.paymentType === "partial") {
    // Qisman to'lov: kassaga kirim (paidAmount) + qarz yaratish
    const paidAmount = data.paidAmount ?? 0;
    const remainingDebt = totalAmountUsd - paidAmount;

    if (paidAmount > 0) {
      await db.insert(cashOperations).values({
        type: "income",
        category: "sale",
        amount: paidAmount,
        currency: "USD",
        relatedSaleId: newSale.id,
        description: `Sotuv #${newSale.id} — qisman to'lov`,
        date: data.saleDate,
      });
    }

    if (remainingDebt > 0) {
      await db.insert(debts).values({
        clientId: data.clientId,
        saleId: newSale.id,
        totalAmountUsd,
        paidAmountUsd: paidAmount,
        remainingAmountUsd: remainingDebt,
        status: paidAmount > 0 ? "partially_paid" : "active",
      });
    }
  } else if (data.paymentType === "debt") {
    // Faqat qarz yaratish
    await db.insert(debts).values({
      clientId: data.clientId,
      saleId: newSale.id,
      totalAmountUsd,
      paidAmountUsd: 0,
      remainingAmountUsd: totalAmountUsd,
      status: "active",
    });
  }

  return newSale;
}

// ==========================================
// DELETE SALE
// ==========================================

/**
 * Sotuvni bekor qiladi va ombordagi taxta miqdorini qaytaradi.
 */
export async function deleteSale(id: number) {
  // 1. Sale ni olish
  const sale = await db
    .select()
    .from(sales)
    .where(eq(sales.id, id))
    .then((r) => r[0]);

  if (!sale) {
    throw new Error("Sotuv topilmadi");
  }

  // 2. wagonTimber.remainingQuantity ga quantity ni qaytarish
  const timber = await db
    .select()
    .from(wagonTimber)
    .where(eq(wagonTimber.id, sale.wagonTimberId))
    .then((r) => r[0]);

  if (timber) {
    const restoredQuantity = (timber.remainingQuantity ?? 0) + sale.quantity;
    await db
      .update(wagonTimber)
      .set({ remainingQuantity: restoredQuantity })
      .where(eq(wagonTimber.id, sale.wagonTimberId));
  }

  // 3. Bog'liq kassa yozuvlarini o'chirish
  await db.delete(cashOperations).where(eq(cashOperations.relatedSaleId, id));

  // 4. Bog'liq qarzlar va ularning to'lovlarini o'chirish
  const relatedDebts = await db.select({ id: debts.id }).from(debts).where(eq(debts.saleId, id));
  for (const d of relatedDebts) {
    await db.delete(debtPayments).where(eq(debtPayments.debtId, d.id));
  }
  await db.delete(debts).where(eq(debts.saleId, id));

  // 5. Sales dan o'chirish
  await db.delete(sales).where(eq(sales.id, id));
}

// ==========================================
// GET AVAILABLE TIMBER
// ==========================================

/**
 * Omborda mavjud taxtalarni qaytaradi (remainingQuantity > 0).
 * Har biri bilan vagon raqami birga keladi.
 */
export async function getAvailableTimber(): Promise<AvailableTimber[]> {
  return (await db.query.wagonTimber.findMany({
    where: (t, { gt }) => gt(t.remainingQuantity, 0),
    with: {
      wagon: {
        columns: { id: true, wagonNumber: true, shipmentId: true },
      },
    },
    orderBy: (t, { desc }) => [desc(t.id)],
  })) as AvailableTimber[];
}
