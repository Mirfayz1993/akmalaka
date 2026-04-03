"use server";

import { db } from "@/db";
import { partnerBalances, saleItems, sales, transports, transportExpenses, timbers } from "@/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";

export interface TransportSummary {
  // Hamkorlarga qarzlar (biz ularga qarzamiz)
  ourDebts: Array<{
    partnerId: number;
    partnerName: string;
    amount: number; // musbat ko'rinishida (asl manfiy)
    currency: string;
    description: string | null;
    createdAt: string | null;
  }>;
  // Mijozlar bizga qarz (ular bizga qarzalar)
  customerDebts: Array<{
    customerId: number;
    customerName: string;
    saleId: number;
    totalSentUsd: number;
    paidAmount: number;
    remaining: number;
    createdAt: string | null;
  }>;
  // Jami xarajatlar (USD)
  totalExpensesUsd: number;
  // Jami daromad (USD)
  totalIncomeUsd: number;
  // Sof foyda (USD)
  netProfitUsd: number;
  // Xarajatlar tafsiloti
  expenseBreakdown: Array<{
    name: string;
    amountUsd: number;
  }>;
}

export async function getTransportFinancialSummary(transportId: number): Promise<TransportSummary> {
  // 1. Transport ma'lumotlari
  const transport = await db.query.transports.findFirst({
    where: eq(transports.id, transportId),
    with: {
      timbers: true,
      expenses: true,
      supplier: true,
    },
  });

  if (!transport) throw new Error("Transport topilmadi");

  // 2. Hamkorlardan qarzlar (biz ularga)
  const balances = await db.query.partnerBalances.findMany({
    where: eq(partnerBalances.transportId, transportId),
    with: { partner: true },
  });

  const ourDebts = balances
    .filter((b) => Number(b.amount) < 0)
    .map((b) => ({
      partnerId: b.partnerId,
      partnerName: b.partner?.name ?? "—",
      amount: Math.abs(Number(b.amount)),
      currency: b.currency ?? "usd",
      description: b.description,
      createdAt: b.createdAt ? b.createdAt.toISOString().slice(0, 10) : null,
    }));

  // 3. Bu transportdan sotilgan sale items
  const transportSaleItems = await db.query.saleItems.findMany({
    where: eq(saleItems.transportId, transportId),
    with: {
      sale: { with: { customer: true } },
    },
  });

  // Mijoz qarzi: sale lar bo'yicha
  const saleMap = new Map<number, {
    customerId: number;
    customerName: string;
    saleId: number;
    totalSentUsd: number;
    paidAmount: number;
    createdAt: string | null;
  }>();

  for (const item of transportSaleItems) {
    if (!item.sale) continue;
    const sid = item.saleId;
    if (!saleMap.has(sid)) {
      saleMap.set(sid, {
        customerId: item.sale.customerId,
        customerName: item.sale.customer?.name ?? "—",
        saleId: sid,
        totalSentUsd: Number(item.sale.totalSentUsd ?? 0),
        paidAmount: Number(item.sale.paidAmount ?? 0),
        createdAt: item.sale.sentAt ? new Date(item.sale.sentAt).toISOString().slice(0, 10) : null,
      });
    }
  }

  const customerDebts = Array.from(saleMap.values())
    .map((s) => ({
      ...s,
      remaining: s.totalSentUsd - s.paidAmount,
    }))
    .filter((s) => s.remaining > 0.001);

  // 4. Xarajatlar hisoblash
  const expenseBreakdown: Array<{ name: string; amountUsd: number }> = [];

  // Rossiya ta'minotchisi (RUB → USD)
  const totalCubSupplier = transport.timbers.reduce((sum, t) => {
    const cnt = t.supplierCount ?? t.tashkentCount ?? 0;
    return sum + (t.thicknessMm / 1000) * (t.widthMm / 1000) * Number(t.lengthM) * cnt;
  }, 0);

  // o'rtacha kurs hisoblash - kassadan
  const { cashOperations } = await import("@/db/schema");
  const rubOps = await db.query.cashOperations.findMany({
    where: eq(cashOperations.currency, "rub"),
  });
  let totalRubIn = 0, totalUsdEquiv = 0;
  for (const op of rubOps) {
    const amt = Number(op.amount);
    const rate = Number(op.exchangeRate ?? 0);
    if (amt > 0 && rate > 0) { totalRubIn += amt; totalUsdEquiv += amt / rate; }
  }
  const avgRate = totalUsdEquiv > 0 ? totalRubIn / totalUsdEquiv : 0;

  const rubPricePerCubic = Number(transport.rubPricePerCubic ?? 0);
  const supplierPaymentRub = totalCubSupplier * rubPricePerCubic;
  const supplierPaymentUsd = avgRate > 0 ? supplierPaymentRub / avgRate : 0;

  if (supplierPaymentUsd > 0) {
    expenseBreakdown.push({ name: `Yog'och to'lovi (${transport.supplier?.name ?? "ta'minotchi"})`, amountUsd: supplierPaymentUsd });
  }

  // Kod UZ
  if (transport.codeUzPricePerTon && transport.tonnage) {
    const amt = Number(transport.tonnage) * Number(transport.codeUzPricePerTon);
    if (amt > 0) expenseBreakdown.push({ name: "Kod UZ", amountUsd: amt });
  }
  // Kod KZ
  if (transport.codeKzPricePerTon && transport.tonnage) {
    const amt = Number(transport.tonnage) * Number(transport.codeKzPricePerTon);
    if (amt > 0) expenseBreakdown.push({ name: "Kod KZ", amountUsd: amt });
  }
  // Truck owner
  if (transport.truckOwnerPayment) {
    const amt = Number(transport.truckOwnerPayment);
    if (amt > 0) expenseBreakdown.push({ name: "Yuk mashina egasi", amountUsd: amt });
  }
  // Standart xarajatlar
  const stdExpenses = [
    { name: "NDS",   val: transport.expenseNds },
    { name: "Usluga", val: transport.expenseUsluga },
    { name: "Tupik",  val: transport.expenseTupik },
    { name: "Xranenie", val: transport.expenseXrannei },
    { name: "Klentga ortish", val: transport.expenseOrtish },
    { name: "Yerga tushurish", val: transport.expenseTushurish },
  ];
  for (const { name, val } of stdExpenses) {
    const amt = Number(val ?? 0);
    if (amt > 0) expenseBreakdown.push({ name, amountUsd: amt });
  }
  // Qo'shimcha xarajatlar
  for (const exp of transport.expenses) {
    const amt = Number(exp.amount);
    if (amt > 0) expenseBreakdown.push({ name: exp.name, amountUsd: amt });
  }

  const totalExpensesUsd = expenseBreakdown.reduce((s, e) => s + e.amountUsd, 0);

  // 5. Daromad — qabul qilingan soni bo'yicha
  const totalIncomeUsd = transportSaleItems.reduce((s, item) => {
    const received = item.receivedCount ?? 0;
    if (!item.thicknessMm || !item.widthMm || !item.lengthM || !item.pricePerCubicUsd || received === 0) {
      return s;
    }
    const kub = (item.thicknessMm / 1000) * (item.widthMm / 1000) * Number(item.lengthM) * received;
    return s + kub * Number(item.pricePerCubicUsd);
  }, 0);

  const netProfitUsd = totalIncomeUsd - totalExpensesUsd;

  return {
    ourDebts,
    customerDebts,
    totalExpensesUsd,
    totalIncomeUsd,
    netProfitUsd,
    expenseBreakdown,
  };
}
