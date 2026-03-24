"use server";

import { db } from "@/db";
import { wagons } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export type WagonStatus = "in_transit" | "at_border" | "arrived" | "unloaded";

export type LogisticsWagon = {
  id: number;
  shipmentId: number | null;
  wagonNumber: string;
  fromLocation: string | null;
  toLocation: string | null;
  totalCubicMeters: number | null;
  transportCostUsd: number | null;
  unloadingCostUsd: number | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | null;
};

export async function getWagonsForLogistics(): Promise<LogisticsWagon[]> {
  const rows = await db
    .select({
      id: wagons.id,
      shipmentId: wagons.shipmentId,
      wagonNumber: wagons.wagonNumber,
      fromLocation: wagons.fromLocation,
      toLocation: wagons.toLocation,
      totalCubicMeters: wagons.totalCubicMeters,
      transportCostUsd: wagons.transportCostUsd,
      unloadingCostUsd: wagons.unloadingCostUsd,
      status: wagons.status,
      notes: wagons.notes,
      createdAt: wagons.createdAt,
    })
    .from(wagons)
    .orderBy(desc(wagons.createdAt));

  return rows;
}

export async function updateWagonStatus(
  id: number,
  status: WagonStatus
): Promise<LogisticsWagon> {
  const [result] = await db
    .update(wagons)
    .set({ status })
    .where(eq(wagons.id, id))
    .returning();

  const row = await db
    .select({
      id: wagons.id,
      shipmentId: wagons.shipmentId,
      wagonNumber: wagons.wagonNumber,
      fromLocation: wagons.fromLocation,
      toLocation: wagons.toLocation,
      totalCubicMeters: wagons.totalCubicMeters,
      transportCostUsd: wagons.transportCostUsd,
      unloadingCostUsd: wagons.unloadingCostUsd,
      status: wagons.status,
      notes: wagons.notes,
      createdAt: wagons.createdAt,
    })
    .from(wagons)
    .where(eq(wagons.id, result.id))
    .then((r) => r[0]);

  if (!row) throw new Error("Vagon topilmadi");

  return row;
}
