"use server";

import { db } from "@/db";
import { partners } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getPartners() {
  return await db.select().from(partners).orderBy(desc(partners.createdAt));
}

export async function getPartner(id: number) {
  return await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .then((r) => r[0]);
}

export async function createPartner(data: {
  name: string;
  phone?: string;
  location?: string;
  notes?: string;
}) {
  const [result] = await db.insert(partners).values(data).returning();
  return result;
}

export async function updatePartner(
  id: number,
  data: {
    name?: string;
    phone?: string;
    location?: string;
    notes?: string;
  }
) {
  const [result] = await db
    .update(partners)
    .set(data)
    .where(eq(partners.id, id))
    .returning();
  return result;
}

export async function deletePartner(id: number) {
  await db.delete(partners).where(eq(partners.id, id));
}
