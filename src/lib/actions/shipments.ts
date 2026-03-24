"use server";

import { db } from "@/db";
import { shipments } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ShipmentStatus =
  | "in_transit"
  | "at_border"
  | "arrived"
  | "distributed";

export type ShipmentWithRelations = {
  id: number;
  name: string;
  partnerId: number | null;
  partnerPaymentUsd: number | null;
  purchaseDate: string | null;
  rubToUsdRate: number;
  status: string | null;
  notes: string | null;
  createdAt: Date | null;
  partner: {
    id: number;
    name: string;
    phone: string | null;
    location: string | null;
    notes: string | null;
    createdAt: Date | null;
  } | null;
  wagons: {
    id: number;
    shipmentId: number;
    wagonNumber: string;
    totalCubicMeters: number | null;
    transportCostUsd: number | null;
    unloadingCostUsd: number | null;
    status: string | null;
    notes: string | null;
    createdAt: Date | null;
  }[];
  expenses: {
    id: number;
    shipmentId: number | null;
    wagonId: number | null;
    category: string;
    description: string;
    amountUsd: number;
    date: string;
    notes: string | null;
    createdAt: Date | null;
  }[];
};

export async function getShipments(): Promise<ShipmentWithRelations[]> {
  return await db.query.shipments.findMany({
    with: { partner: true, wagons: true, expenses: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  }) as ShipmentWithRelations[];
}

export async function getShipment(id: number): Promise<ShipmentWithRelations | undefined> {
  return await db.query.shipments.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: { partner: true, wagons: true, expenses: true },
  }) as ShipmentWithRelations | undefined;
}

export async function createShipment(data: {
  name: string;
  partnerId?: number;
  rubToUsdRate: number;
  purchaseDate?: string;
  partnerPaymentUsd?: number;
  notes?: string;
}) {
  const [result] = await db.insert(shipments).values(data).returning();
  return result;
}

export async function updateShipment(
  id: number,
  data: {
    name?: string;
    partnerId?: number | null;
    rubToUsdRate?: number;
    purchaseDate?: string | null;
    partnerPaymentUsd?: number;
    notes?: string | null;
  }
) {
  const [result] = await db
    .update(shipments)
    .set(data)
    .where(eq(shipments.id, id))
    .returning();
  return result;
}

export async function updateShipmentStatus(
  id: number,
  status: ShipmentStatus
) {
  const [result] = await db
    .update(shipments)
    .set({ status })
    .where(eq(shipments.id, id))
    .returning();
  return result;
}

export async function deleteShipment(id: number) {
  await db.delete(shipments).where(eq(shipments.id, id));
}

/**
 * Partiya bo'yicha jami taxta narxini kassaga RUB chiqim sifatida yozish.
 * Barcha vagonlarning barcha taxtalarining: SUM(cubicMeters * pricePerCubicRub)
 */
export async function recordShipmentCost(shipmentId: number) {
  const { wagons, wagonTimber, cashOperations } = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");

  // Jami taxta narxini hisoblash
  const result = await db
    .select({
      totalRub: sql<number>`COALESCE(SUM(${wagonTimber.cubicMeters} * ${wagonTimber.pricePerCubicRub}), 0)`,
    })
    .from(wagonTimber)
    .innerJoin(wagons, eq(wagonTimber.wagonId, wagons.id))
    .where(eq(wagons.shipmentId, shipmentId));

  const totalRub = Math.round((result[0]?.totalRub ?? 0) * 100) / 100;

  if (totalRub <= 0) {
    throw new Error("Bu partiyada taxtalar topilmadi yoki narx kiritilmagan.");
  }

  // Partiya nomini olish
  const shipment = await db.query.shipments.findFirst({
    where: (s, { eq: e }) => e(s.id, shipmentId),
  });

  const today = new Date().toISOString().slice(0, 10);

  // Kassaga RUB chiqim yozish
  await db.insert(cashOperations).values({
    type: "expense",
    category: "timber_purchase",
    amount: totalRub,
    currency: "RUB",
    description: `Yog'och xaridi: ${shipment?.name ?? "Partiya #" + shipmentId} — ₽${totalRub.toLocaleString()}`,
    date: today,
    notes: `Partiya #${shipmentId} jami taxta narxi`,
  });

  return { totalRub, shipmentId };
}
