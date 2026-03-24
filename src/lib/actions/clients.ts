"use server";

import { db } from "@/db";
import { clients, debts } from "@/db/schema";
import { eq, desc, sum } from "drizzle-orm";

export async function getClients(type?: string) {
  const allClients = type
    ? await db.select().from(clients).where(eq(clients.type, type)).orderBy(desc(clients.createdAt))
    : await db.select().from(clients).orderBy(desc(clients.createdAt));
  // Barcha mijozlar uchun qarz summasini bitta so'rov bilan olish
  const debtTotals = await db
    .select({ clientId: debts.clientId, total: sum(debts.remainingAmountUsd) })
    .from(debts)
    .where(eq(debts.status, "active"))
    .groupBy(debts.clientId);
  const debtMap = Object.fromEntries(debtTotals.map(d => [d.clientId, Number(d.total ?? 0)]));
  return allClients.map(c => ({ ...c, totalDebt: debtMap[c.id] ?? 0 }));
}

export async function getCodeSuppliers() {
  return await db.select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.type, "code_supplier"))
    .orderBy(clients.name);
}

export async function getClient(id: number) {
  return await db.select().from(clients).where(eq(clients.id, id)).then((r) => r[0]);
}

export async function createClient(data: {
  name: string;
  phone?: string;
  address?: string;
  type?: string;
  notes?: string;
}) {
  const [result] = await db.insert(clients).values(data).returning();
  return result;
}

export async function updateClient(
  id: number,
  data: { name?: string; phone?: string; address?: string; type?: string; notes?: string }
) {
  const [result] = await db
    .update(clients)
    .set(data)
    .where(eq(clients.id, id))
    .returning();
  return result;
}

export async function deleteClient(id: number) {
  await db.delete(clients).where(eq(clients.id, id));
}
