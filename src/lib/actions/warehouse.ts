"use server";

import { db } from "@/db";
import { warehouse, timbers } from "@/db/schema";
import { eq, notInArray, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getWarehouse() {
  return await db.query.warehouse.findMany({
    with: {
      transport: true,
      timber: true,
    },
    orderBy: (w, { desc }) => [desc(w.createdAt)],
  });
}

export async function addToWarehouse(
  items: {
    timberId?: number;
    transportId: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: number;
    quantity: number;
  }[]
) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.insert(warehouse).values({
        timberId: item.timberId,
        transportId: item.transportId,
        thicknessMm: item.thicknessMm,
        widthMm: item.widthMm,
        lengthM: String(item.lengthM),
        quantity: item.quantity,
      });
    }
  });

  revalidatePath("/warehouse");
}

export async function getSoldNotFromWarehouse(transportId: number) {
  // Shu transportga tegishli barcha timbers
  const allTimbers = await db.query.timbers.findMany({
    where: eq(timbers.transportId, transportId),
  });

  if (allTimbers.length === 0) return [];

  const allTimberIds = allTimbers.map((t) => t.id);

  // Warehouse da yozuv bor timberIds
  const warehouseItems = await db.query.warehouse.findMany({
    where: inArray(warehouse.timberId, allTimberIds),
  });

  const warehouseTimberIds = new Set(
    warehouseItems.map((w) => w.timberId).filter(Boolean)
  );

  // Omborga tushirilmagan timbers
  const notInWarehouse = allTimbers.filter(
    (t) => !warehouseTimberIds.has(t.id)
  );

  return notInWarehouse.map((t) => ({
    timberId: t.id,
    thicknessMm: t.thicknessMm,
    widthMm: t.widthMm,
    lengthM: t.lengthM,
    availableCount: (t.tashkentCount ?? 0) - (t.customerCount ?? 0),
  }));
}
