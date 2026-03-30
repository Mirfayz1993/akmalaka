"use server";

import { db } from "@/db";
import { warehouse, timbers, transports } from "@/db/schema";
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

export async function backfillWarehouseFromClosedWagons() {
  // Barcha yopiq transportlarni timbers bilan ol
  const closedTransports = await db.query.transports.findMany({
    where: eq(transports.status, "closed"),
    with: { timbers: true },
  });

  // Omborga allaqachon tushirilgan timberId lar
  const existingWarehouseItems = await db.query.warehouse.findMany();
  const existingTimberIds = new Set(
    existingWarehouseItems.map((w) => w.timberId).filter(Boolean)
  );

  const itemsToAdd: {
    timberId: number;
    transportId: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: number;
    quantity: number;
  }[] = [];

  for (const transport of closedTransports) {
    for (const t of transport.timbers) {
      if (existingTimberIds.has(t.id)) continue; // allaqachon bor
      const remaining = (t.tashkentCount ?? 0) - (t.customerCount ?? 0);
      if (remaining <= 0) continue;
      itemsToAdd.push({
        timberId: t.id,
        transportId: transport.id,
        thicknessMm: t.thicknessMm,
        widthMm: t.widthMm,
        lengthM: parseFloat(t.lengthM),
        quantity: remaining,
      });
    }
  }

  if (itemsToAdd.length > 0) {
    await addToWarehouse(itemsToAdd);
  }
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
