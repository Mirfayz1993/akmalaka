"use server";
import { db } from "@/db";
import { partners, partnerBalances, cashOperations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Partner = typeof partners.$inferSelect;

export async function getPartners(type?: string) {
  if (type) {
    return db
      .select()
      .from(partners)
      .where(eq(partners.type, type as Partner["type"]))
      .orderBy(partners.name);
  }
  return db.select().from(partners).orderBy(partners.name);
}

export async function getPartnerWithBalance(id: number) {
  const partner = await db.query.partners.findFirst({
    where: eq(partners.id, id),
  });

  if (!partner) return null;

  const balances = await db.query.partnerBalances.findMany({
    where: eq(partnerBalances.partnerId, id),
    with: {
      transport: true,
    },
    orderBy: (b, { desc }) => [desc(b.createdAt)],
  });

  const currentBalance = balances.reduce(
    (sum, b) => sum + Number(b.amount),
    0
  );

  return { ...partner, balances, currentBalance };
}

export async function createPartner(data: {
  name: string;
  type: Partner["type"];
  phone?: string;
  notes?: string;
}) {
  const [result] = await db.insert(partners).values(data).returning();
  revalidatePath("/partners");
  return result;
}

export async function updatePartner(
  id: number,
  data: Partial<{ name: string; phone: string; notes: string }>
) {
  const [result] = await db
    .update(partners)
    .set(data)
    .where(eq(partners.id, id))
    .returning();
  revalidatePath("/partners");
  return result;
}

export async function deletePartner(id: number) {
  await db.delete(partners).where(eq(partners.id, id));
  revalidatePath("/partners");
}

export async function recordPayment(data: {
  partnerId: number;
  amount: number;
  currency: "usd" | "rub";
  description?: string;
  docNumber?: string;
}) {
  if (data.amount === 0) throw new Error("Summa nol bo'lishi mumkin emas");
  await db.transaction(async (tx) => {
    // amount > 0 → biz ulardan pul oldik (income)
    // amount < 0 → biz ularga to'ladik (expense)
    const operationType = data.amount > 0 ? "income" : "expense";

    await tx.insert(cashOperations).values({
      currency: data.currency,
      type: operationType,
      amount: String(data.amount),
      partnerId: data.partnerId,
      description: data.description,
      docNumber: data.docNumber,
    });

    await tx.insert(partnerBalances).values({
      partnerId: data.partnerId,
      amount: String(data.amount),
      currency: data.currency,
      description: data.description,
      docNumber: data.docNumber,
    });
  });

  revalidatePath("/partners");
}
