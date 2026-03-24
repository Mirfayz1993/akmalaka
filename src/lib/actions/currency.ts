"use server";

import { db } from "@/db";
import { currencyRates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getCurrencyRates() {
  return await db.select().from(currencyRates).orderBy(desc(currencyRates.date));
}

export async function getLatestRate() {
  const rates = await db
    .select()
    .from(currencyRates)
    .orderBy(desc(currencyRates.date))
    .limit(1);
  return rates[0] || null;
}

export async function createCurrencyRate(data: {
  date: string;
  usdToRub: number;
  usdToUzs: number;
}) {
  const [result] = await db.insert(currencyRates).values(data).returning();
  return result;
}

export async function updateCurrencyRate(
  id: number,
  data: {
    date?: string;
    usdToRub?: number;
    usdToUzs?: number;
  }
) {
  const [result] = await db
    .update(currencyRates)
    .set(data)
    .where(eq(currencyRates.id, id))
    .returning();
  return result;
}

export async function deleteCurrencyRate(id: number) {
  await db.delete(currencyRates).where(eq(currencyRates.id, id));
}
