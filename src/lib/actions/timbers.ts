"use server";

import { db } from "@/db";
import { timbers, transportLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── CALC CUBIC METERS ────────────────────────────────────────────────────────

export function calcCubicMeters(
  thicknessMm: number,
  widthMm: number,
  lengthM: number,
  count: number
): number {
  return (thicknessMm / 1000) * (widthMm / 1000) * lengthM * count;
}

// ─── GET TIMBERS ──────────────────────────────────────────────────────────────

export async function getTimbers(transportId: number) {
  return await db.query.timbers.findMany({
    where: eq(timbers.transportId, transportId),
  });
}

// ─── CREATE TIMBER ────────────────────────────────────────────────────────────

export async function createTimber(data: {
  transportId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  russiaCount: number;
}) {
  const [timber] = await db
    .insert(timbers)
    .values({
      transportId: data.transportId,
      thicknessMm: data.thicknessMm,
      widthMm: data.widthMm,
      lengthM: String(data.lengthM),
      russiaCount: data.russiaCount,
    })
    .returning();

  await db.insert(transportLogs).values({
    transportId: data.transportId,
    action: `Yog'och qo'shildi: ${data.thicknessMm}×${data.widthMm}×${data.lengthM}m, ${data.russiaCount} dona`,
  });

  revalidatePath("/wagons");
  return timber;
}

// ─── UPDATE TIMBER ────────────────────────────────────────────────────────────

export async function updateTimber(
  id: number,
  data: {
    tashkentCount?: number;
    customerCount?: number;
    russiaCount?: number;
  }
) {
  const existing = await db.query.timbers.findFirst({
    where: eq(timbers.id, id),
  });

  const [timber] = await db
    .update(timbers)
    .set(data)
    .where(eq(timbers.id, id))
    .returning();

  // Agar tashkentCount o'zgargan bo'lsa → log yozish
  if (
    data.tashkentCount !== undefined &&
    existing &&
    data.tashkentCount !== existing.tashkentCount
  ) {
    await db.insert(transportLogs).values({
      transportId: timber.transportId,
      action: `Toshkent soni kiritildi: ${existing.thicknessMm}×${existing.widthMm}×${existing.lengthM}m → ${data.tashkentCount} dona`,
    });
  }

  revalidatePath("/wagons");
  return timber;
}

// ─── DELETE TIMBER ────────────────────────────────────────────────────────────

export async function deleteTimber(id: number) {
  const timber = await db.query.timbers.findFirst({ where: eq(timbers.id, id) });
  if (!timber) throw new Error("Yog'och topilmadi");

  await db.delete(timbers).where(eq(timbers.id, id));

  // Log yozish
  await db.insert(transportLogs).values({
    transportId: timber.transportId,
    action: `Yog'och o'chirildi: ${timber.thicknessMm}×${timber.widthMm}×${timber.lengthM}m`,
  });

  revalidatePath("/wagons");
}
