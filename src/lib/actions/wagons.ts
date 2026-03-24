"use server";

import { db } from "@/db";
import { wagons, wagonTimber, cashOperations, customsCodes, codeSales, expenses, sales, debts } from "@/db/schema";
import { eq, desc, sum, count, sql, inArray } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type WagonStatus = "in_transit" | "at_border" | "arrived" | "unloaded";

export type WagonRow = {
  id: number;
  shipmentId: number | null;
  wagonNumber: string;
  sentDate: string | null;
  arrivedDate: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  tonnage: number | null;
  partnerId: number | null;
  rubToUsdRate: number | null;
  purchaseDate: string | null;
  totalCubicMeters: number | null;
  transportCostUsd: number | null;
  unloadingCostUsd: number | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | null;
  timberCount: number;
};

export type TimberRow = {
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
};

export type WagonWithTimber = {
  id: number;
  shipmentId: number | null;
  wagonNumber: string;
  sentDate: string | null;
  arrivedDate: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  tonnage: number | null;
  partnerId: number | null;
  rubToUsdRate: number | null;
  purchaseDate: string | null;
  totalCubicMeters: number | null;
  transportCostUsd: number | null;
  unloadingCostUsd: number | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | null;
  timber: TimberRow[];
};

// ==========================================
// HELPER: recalcWagonCubic
// ==========================================

async function recalcWagonCubic(wagonId: number): Promise<void> {
  const result = await db
    .select({ total: sum(wagonTimber.cubicMeters) })
    .from(wagonTimber)
    .where(eq(wagonTimber.wagonId, wagonId));

  const total = Number(result[0]?.total ?? 0);

  await db
    .update(wagons)
    .set({ totalCubicMeters: total })
    .where(eq(wagons.id, wagonId));
}

// ==========================================
// WAGON ACTIONS
// ==========================================

export async function getWagons(): Promise<WagonRow[]> {
  const result = await db
    .select({
      id: wagons.id,
      shipmentId: wagons.shipmentId,
      wagonNumber: wagons.wagonNumber,
      sentDate: wagons.sentDate,
      arrivedDate: wagons.arrivedDate,
      fromLocation: wagons.fromLocation,
      toLocation: wagons.toLocation,
      tonnage: wagons.tonnage,
      partnerId: wagons.partnerId,
      rubToUsdRate: wagons.rubToUsdRate,
      purchaseDate: wagons.purchaseDate,
      totalCubicMeters: wagons.totalCubicMeters,
      transportCostUsd: wagons.transportCostUsd,
      unloadingCostUsd: wagons.unloadingCostUsd,
      status: wagons.status,
      notes: wagons.notes,
      createdAt: wagons.createdAt,
      timberCount: sql<number>`cast(count(${wagonTimber.id}) as int)`,
    })
    .from(wagons)
    .leftJoin(wagonTimber, eq(wagonTimber.wagonId, wagons.id))
    .groupBy(wagons.id)
    .orderBy(desc(wagons.createdAt));

  return result;
}

export async function getWagon(id: number): Promise<WagonWithTimber | undefined> {
  const wagon = await db
    .select()
    .from(wagons)
    .where(eq(wagons.id, id))
    .then((r) => r[0]);

  if (!wagon) return undefined;

  const timber = await db
    .select()
    .from(wagonTimber)
    .where(eq(wagonTimber.wagonId, id));

  return { ...wagon, timber: timber as TimberRow[] };
}

export async function createWagon(data: {
  shipmentId?: number | null;
  wagonNumber: string;
  sentDate?: string;
  arrivedDate?: string;
  fromLocation?: string;
  toLocation?: string;
  tonnage?: number;
  partnerId?: number;
  rubToUsdRate?: number;
  purchaseDate?: string;
  transportCostUsd?: number;
  unloadingCostUsd?: number;
  status?: string;
  notes?: string;
}) {
  const [result] = await db.insert(wagons).values(data).returning();
  return result;
}

export async function updateWagon(
  id: number,
  data: {
    shipmentId?: number | null;
    wagonNumber?: string;
    sentDate?: string | null;
    arrivedDate?: string | null;
    fromLocation?: string | null;
    toLocation?: string | null;
    tonnage?: number | null;
    partnerId?: number | null;
    rubToUsdRate?: number | null;
    purchaseDate?: string | null;
    transportCostUsd?: number;
    unloadingCostUsd?: number;
    status?: string;
    notes?: string | null;
  }
) {
  const [result] = await db
    .update(wagons)
    .set(data)
    .where(eq(wagons.id, id))
    .returning();
  return result;
}

export async function deleteWagon(id: number): Promise<void> {
  // 1. codeSales → customsCodes orqali (foreign key)
  const codes = await db.select({ id: customsCodes.id }).from(customsCodes).where(eq(customsCodes.wagonId, id));
  for (const code of codes) {
    await db.delete(codeSales).where(eq(codeSales.customsCodeId, code.id));
  }
  // 2. customsCodes
  await db.delete(customsCodes).where(eq(customsCodes.wagonId, id));
  // 3. expenses
  await db.delete(expenses).where(eq(expenses.wagonId, id));
  // 4. sales → wagonTimber orqali (va unga bog'liq debts, cashOperations)
  const timbers = await db.select({ id: wagonTimber.id }).from(wagonTimber).where(eq(wagonTimber.wagonId, id));
  const timberIds = timbers.map(t => t.id);
  if (timberIds.length > 0) {
    const saleRecords = await db.select({ id: sales.id }).from(sales).where(inArray(sales.wagonTimberId, timberIds));
    const saleIds = saleRecords.map(s => s.id);
    if (saleIds.length > 0) {
      // cashOperations → relatedSaleId
      await db.delete(cashOperations).where(inArray(cashOperations.relatedSaleId, saleIds));
      // debts → saleId (va debts ga bog'liq cashOperations)
      const debtRecords = await db.select({ id: debts.id }).from(debts).where(inArray(debts.saleId, saleIds));
      const debtIds = debtRecords.map(d => d.id);
      if (debtIds.length > 0) {
        await db.delete(cashOperations).where(inArray(cashOperations.relatedDebtId, debtIds));
        await db.delete(debts).where(inArray(debts.id, debtIds));
      }
      await db.delete(sales).where(inArray(sales.id, saleIds));
    }
  }
  // 5. wagonTimber
  await db.delete(wagonTimber).where(eq(wagonTimber.wagonId, id));
  // 5. wagon
  await db.delete(wagons).where(eq(wagons.id, id));
}

// ==========================================
// TIMBER ACTIONS
// ==========================================

export async function addTimber(
  wagonId: number,
  data: {
    widthMm: number;
    thicknessMm: number;
    lengthM: number;
    quantity: number;
    pricePerCubicRub: number;
    notes?: string;
  }
) {
  // Kubometr hisoblash
  const cubicMeters =
    (data.widthMm / 1000) * (data.thicknessMm / 1000) * data.lengthM * data.quantity;

  // Vagondan rubToUsdRate ni olish
  const wagonRow = await db
    .select({ rubToUsdRate: wagons.rubToUsdRate })
    .from(wagons)
    .where(eq(wagons.id, wagonId))
    .then((r) => r[0]);

  let pricePerCubicUsd: number | undefined = undefined;

  if (wagonRow && wagonRow.rubToUsdRate && wagonRow.rubToUsdRate > 0) {
    pricePerCubicUsd = data.pricePerCubicRub / wagonRow.rubToUsdRate;
  }

  const [result] = await db
    .insert(wagonTimber)
    .values({
      wagonId,
      widthMm: data.widthMm,
      thicknessMm: data.thicknessMm,
      lengthM: data.lengthM,
      quantity: data.quantity,
      cubicMeters,
      pricePerCubicRub: data.pricePerCubicRub,
      pricePerCubicUsd: pricePerCubicUsd ?? null,
      remainingQuantity: data.quantity,
      notes: data.notes ?? null,
    })
    .returning();

  // Wagon totalCubicMeters yangilash
  await recalcWagonCubic(wagonId);

  // Kassadan RUB avtomatik chiqim yozish
  const totalRub = cubicMeters * data.pricePerCubicRub;
  if (totalRub > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(cashOperations).values({
      type: "expense",
      category: "timber_purchase",
      amount: totalRub,
      currency: "RUB",
      description: `Taxta xaridi: ${data.thicknessMm}×${data.widthMm}×${data.lengthM}m × ${data.quantity} dona`,
      date: today,
    });
  }

  return result;
}

export async function updateTimber(
  id: number,
  data: {
    widthMm?: number;
    thicknessMm?: number;
    lengthM?: number;
    quantity?: number;
    pricePerCubicRub?: number;
    notes?: string | null;
  }
) {
  // Avvalgi yozuvni olish
  const existing = await db
    .select()
    .from(wagonTimber)
    .where(eq(wagonTimber.id, id))
    .then((r) => r[0]);

  if (!existing) throw new Error("Timber topilmadi");

  const widthMm = data.widthMm ?? existing.widthMm;
  const thicknessMm = data.thicknessMm ?? existing.thicknessMm;
  const lengthM = data.lengthM ?? existing.lengthM;
  const quantity = data.quantity ?? existing.quantity;
  const pricePerCubicRub = data.pricePerCubicRub ?? existing.pricePerCubicRub;

  const cubicMeters = (widthMm / 1000) * (thicknessMm / 1000) * lengthM * quantity;

  // rubToUsdRate ni qayta hisoblash
  const wagonRow = await db
    .select({ rubToUsdRate: wagons.rubToUsdRate })
    .from(wagons)
    .where(eq(wagons.id, existing.wagonId))
    .then((r) => r[0]);

  let pricePerCubicUsd: number | null = null;

  if (wagonRow && wagonRow.rubToUsdRate && wagonRow.rubToUsdRate > 0) {
    pricePerCubicUsd = pricePerCubicRub / wagonRow.rubToUsdRate;
  }

  const [result] = await db
    .update(wagonTimber)
    .set({
      widthMm,
      thicknessMm,
      lengthM,
      quantity,
      cubicMeters,
      pricePerCubicRub,
      pricePerCubicUsd,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    })
    .where(eq(wagonTimber.id, id))
    .returning();

  await recalcWagonCubic(existing.wagonId);

  return result;
}

export async function deleteTimber(id: number): Promise<void> {
  const existing = await db
    .select({ wagonId: wagonTimber.wagonId })
    .from(wagonTimber)
    .where(eq(wagonTimber.id, id))
    .then((r) => r[0]);

  if (!existing) return;

  await db.delete(wagonTimber).where(eq(wagonTimber.id, id));
  await recalcWagonCubic(existing.wagonId);
}
