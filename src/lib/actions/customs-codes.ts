"use server";

import { db } from "@/db";
import {
  customsCodes,
  codeSales,
  expenses,
  debts,
  cashOperations,
  clients,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================

export type CustomsCodeStatus = "active" | "used" | "sold";
export type UsageType = "own" | "sold";

export type CustomsCode = {
  id: number;
  soni: string | null;
  oy: string | null;
  kodUz: string | null;
  kzKod: string | null;
  jonatishJoyi: string | null;
  kelishJoyi: string | null;
  tonna: number | null;
  dataZayavki: string | null;
  yuboruvchi: string | null;
  qabulQiluvchi: string | null;
  nomerVagon: string | null;
  nomerOtpravka: string | null;
  fakticheskiyVes: number | null;
  okruglonniyVes: number | null;
  stavkaKz: number | null;
  tarifKz: number | null;
  stavkaUz: number | null;
  tarifUz: number | null;
  avgonTarif: number | null;
  obshiyTarif: number | null;
  tolov: number | null;
  wagonId: number | null;
  clientId: number | null;
  usageType: string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | null;
};

export type CustomsCodeWithRelations = CustomsCode & {
  wagon: {
    id: number;
    wagonNumber: string;
    shipmentId: number;
  } | null;
  client: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  codeSales: CodeSale[];
};

export type CodeSale = {
  id: number;
  customsCodeId: number;
  clientId: number | null;
  buyerName: string | null;
  buyerPhone: string | null;
  saleStavkaKz: number | null;
  saleStavkaUz: number | null;
  saleTarifKz: number | null;
  saleTarifUz: number | null;
  saleObshiyTarif: number | null;
  saleAmountUsd: number;
  profitUsd: number | null;
  paymentType: string | null;
  saleDate: string;
  notes: string | null;
  createdAt: Date | null;
};

export type CodeSaleWithRelations = CodeSale & {
  customsCode: CustomsCode | null;
  client: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
};

export type CreateCustomsCodeData = {
  soni?: string;
  oy?: string;
  kodUz?: string;
  kzKod?: string;
  jonatishJoyi?: string;
  kelishJoyi?: string;
  tonna?: number;
  dataZayavki?: string;
  yuboruvchi?: string;
  qabulQiluvchi?: string;
  nomerVagon?: string;
  nomerOtpravka?: string;
  fakticheskiyVes?: number;
  okruglonniyVes?: number;
  stavkaKz?: number;
  stavkaUz?: number;
  avgonTarif?: number;
  tolov?: number;
  wagonId?: number;
  clientId?: number;
  usageType?: UsageType;
  status?: CustomsCodeStatus;
  notes?: string;
  paymentType?: "cash" | "debt";
  supplierName?: string;
};

export type UpdateCustomsCodeData = {
  soni?: string | null;
  oy?: string | null;
  kodUz?: string | null;
  kzKod?: string | null;
  jonatishJoyi?: string | null;
  kelishJoyi?: string | null;
  tonna?: number | null;
  dataZayavki?: string | null;
  yuboruvchi?: string | null;
  qabulQiluvchi?: string | null;
  nomerVagon?: string | null;
  nomerOtpravka?: string | null;
  fakticheskiyVes?: number | null;
  okruglonniyVes?: number | null;
  stavkaKz?: number | null;
  stavkaUz?: number | null;
  avgonTarif?: number | null;
  tolov?: number | null;
  wagonId?: number | null;
  clientId?: number | null;
  usageType?: UsageType;
  status?: CustomsCodeStatus;
  notes?: string | null;
};

export type CustomsCodeFilters = {
  wagonId?: number;
  status?: string;
};

// ==========================================
// HELPER: Tariflarni hisoblash
// ==========================================

function calculateTariffs(
  okruglonniyVes: number,
  stavkaKz: number,
  stavkaUz: number,
  avgonTarif: number
) {
  const tarifKz = okruglonniyVes * stavkaKz;
  const tarifUz = okruglonniyVes * stavkaUz;
  const obshiyTarif = tarifKz + tarifUz + (avgonTarif || 0);
  return { tarifKz, tarifUz, obshiyTarif };
}

// ==========================================
// GET ALL CODES
// ==========================================

/**
 * Barcha bojxona kodlarini qaytaradi.
 * Ixtiyoriy filtrlar: wagonId, status.
 * wagon, client va codeSales ma'lumotlari birga keladi.
 */
export async function getCustomsCodes(
  filters?: CustomsCodeFilters
): Promise<CustomsCodeWithRelations[]> {
  // Filtr yo'q — hammasi
  if (!filters || (!filters.wagonId && !filters.status)) {
    return (await db.query.customsCodes.findMany({
      with: {
        wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
        client: { columns: { id: true, name: true, phone: true } },
        codeSales: true,
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })) as CustomsCodeWithRelations[];
  }

  // Filtr bilan
  const conditions = [];

  if (filters.wagonId !== undefined) {
    conditions.push(eq(customsCodes.wagonId, filters.wagonId));
  }

  if (filters.status !== undefined) {
    conditions.push(eq(customsCodes.status, filters.status));
  }

  return (await db.query.customsCodes.findMany({
    where: conditions.length === 1 ? conditions[0] : and(...conditions),
    with: {
      wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
      client: { columns: { id: true, name: true, phone: true } },
      codeSales: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })) as CustomsCodeWithRelations[];
}

// ==========================================
// GET SINGLE CODE
// ==========================================

/**
 * Bitta bojxona kodini ID bo'yicha qaytaradi.
 */
export async function getCustomsCode(
  id: number
): Promise<CustomsCodeWithRelations | undefined> {
  return (await db.query.customsCodes.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      wagon: { columns: { id: true, wagonNumber: true, shipmentId: true } },
      client: { columns: { id: true, name: true, phone: true } },
      codeSales: true,
    },
  })) as CustomsCodeWithRelations | undefined;
}

// ==========================================
// CREATE CODE
// ==========================================

/**
 * Yangi bojxona kodi qo'shadi.
 * Tariflarni avtomatik hisoblaydi.
 * Agar usageType === "own" va wagonId mavjud bo'lsa — expenses ga ham yozadi.
 */
export async function createCustomsCode(data: CreateCustomsCodeData) {
  // Tariflarni hisoblash
  const okruglonniyVes = data.okruglonniyVes ?? 0;
  const stavkaKz = data.stavkaKz ?? 0;
  const stavkaUz = data.stavkaUz ?? 0;
  const avgonTarif = data.avgonTarif ?? 0;

  const { tarifKz, tarifUz, obshiyTarif } = calculateTariffs(
    okruglonniyVes,
    stavkaKz,
    stavkaUz,
    avgonTarif
  );

  const [result] = await db
    .insert(customsCodes)
    .values({
      soni: data.soni ?? null,
      oy: data.oy ?? null,
      kodUz: data.kodUz ?? null,
      kzKod: data.kzKod ?? null,
      jonatishJoyi: data.jonatishJoyi ?? null,
      kelishJoyi: data.kelishJoyi ?? null,
      tonna: data.tonna ?? null,
      dataZayavki: data.dataZayavki ?? null,
      yuboruvchi: data.yuboruvchi ?? null,
      qabulQiluvchi: data.qabulQiluvchi ?? null,
      nomerVagon: data.nomerVagon ?? null,
      nomerOtpravka: data.nomerOtpravka ?? null,
      fakticheskiyVes: data.fakticheskiyVes ?? null,
      okruglonniyVes: okruglonniyVes || null,
      stavkaKz: stavkaKz || null,
      tarifKz,
      stavkaUz: stavkaUz || null,
      tarifUz,
      avgonTarif: avgonTarif || null,
      obshiyTarif,
      tolov: data.tolov ?? null,
      wagonId: data.wagonId ?? null,
      clientId: data.clientId ?? null,
      usageType: data.usageType ?? "own",
      status: data.status ?? "active",
      notes: data.notes ?? null,
    })
    .returning();

  // Tolov bo'yicha kassaga yoki qarzga yozish
  if (data.tolov && data.tolov > 0) {
    if (data.paymentType === "cash") {
      // Kassadan chiqim
      await db.insert(cashOperations).values({
        type: "expense",
        category: "customs",
        amount: data.tolov,
        currency: "USD",
        description: `Kod to'lovi: ${data.kodUz || "Kod"} — $${data.tolov}`,
        date: new Date().toISOString().slice(0, 10),
      });
    } else if (data.paymentType === "debt") {
      // Mening qarzim
      await db.insert(debts).values({
        debtType: "my_debt",
        supplierName: data.supplierName || "Kod sotuvchi",
        totalAmountUsd: data.tolov,
        paidAmountUsd: 0,
        remainingAmountUsd: data.tolov,
        status: "active",
        notes: `Kod: ${data.kodUz || "?"} uchun qarz`,
      });
    }
  }

  // Agar o'z foydalanish uchun va vagonga bog'langan bo'lsa — expenses ga yozish
  if ((data.usageType ?? "own") === "own" && data.wagonId && obshiyTarif > 0) {
    await db.insert(expenses).values({
      wagonId: data.wagonId,
      shipmentId: null,
      category: "customs",
      description: `Kod #${data.kodUz || result.id}`,
      amountUsd: obshiyTarif,
      date: data.dataZayavki || new Date().toISOString().split("T")[0],
      notes: null,
    });
  }

  return result;
}

// ==========================================
// UPDATE CODE
// ==========================================

/**
 * Mavjud bojxona kodini yangilaydi.
 * Agar stavka yoki vazn o'zgarsa — tariflarni qayta hisoblaydi.
 */
export async function updateCustomsCode(
  id: number,
  data: UpdateCustomsCodeData
) {
  // Agar vazn yoki stavkalar berilgan bo'lsa — qayta hisoblash kerak
  // Avval mavjud kodni olish
  const existing = await db.query.customsCodes.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  if (!existing) throw new Error("Bojxona kodi topilmadi");

  const okruglonniyVes =
    data.okruglonniyVes !== undefined
      ? data.okruglonniyVes ?? 0
      : existing.okruglonniyVes ?? 0;
  const stavkaKz =
    data.stavkaKz !== undefined
      ? data.stavkaKz ?? 0
      : existing.stavkaKz ?? 0;
  const stavkaUz =
    data.stavkaUz !== undefined
      ? data.stavkaUz ?? 0
      : existing.stavkaUz ?? 0;
  const avgonTarif =
    data.avgonTarif !== undefined
      ? data.avgonTarif ?? 0
      : existing.avgonTarif ?? 0;

  const { tarifKz, tarifUz, obshiyTarif } = calculateTariffs(
    okruglonniyVes,
    stavkaKz,
    stavkaUz,
    avgonTarif
  );

  const [result] = await db
    .update(customsCodes)
    .set({
      ...data,
      tarifKz,
      tarifUz,
      obshiyTarif,
    })
    .where(eq(customsCodes.id, id))
    .returning();

  // Bog'liq expense ni yangilash (agar o'z foydalanish uchun bo'lsa)
  if (existing.usageType === "own" && existing.wagonId) {
    await db.update(expenses).set({
      amountUsd: obshiyTarif,
      description: `Bojxona kodi #${id}`
    }).where(and(eq(expenses.wagonId, existing.wagonId), eq(expenses.category, "customs")));
  }

  return result;
}

// ==========================================
// DELETE CODE
// ==========================================

/**
 * Bojxona kodini o'chiradi.
 * Bog'liq codeSales ham cascade orqali o'chadi (agar DB da sozlangan bo'lsa),
 * aks holda avval codeSales ni tozalash kerak.
 */
export async function deleteCustomsCode(id: number) {
  // Avval bog'liq sotuvlarni o'chirish
  await db.delete(codeSales).where(eq(codeSales.customsCodeId, id));
  // Keyin kodni o'chirish
  await db.delete(customsCodes).where(eq(customsCodes.id, id));
}

// ==========================================
// SELL CODE
// ==========================================

/**
 * Bojxona kodini boshqaga sotish.
 * 1. Mavjud kodni olish
 * 2. Sotish tarifi hisoblash (yangi stavkalar bilan)
 * 3. Foyda = saleObshiyTarif - code.obshiyTarif
 * 4. codeSales ga yozish
 * 5. Kod statusini "sold" ga o'zgartirish
 * 6. Agar naqd to'lov — cashOperations ga kirim yozish
 * 7. Agar qarz — debts ga yozish
 */
export async function sellCode(
  codeId: number,
  data: {
    clientId?: number;
    buyerName?: string;
    buyerPhone?: string;
    saleStavkaKz: number;
    saleStavkaUz: number;
    paymentType: "cash" | "debt";
    saleDate: string;
    notes?: string;
  }
) {
  // 1. Mavjud kodni olish
  const code = await db.query.customsCodes.findFirst({
    where: (t, { eq }) => eq(t.id, codeId),
  });

  if (!code) throw new Error("Bojxona kodi topilmadi");

  const okruglonniyVes = code.okruglonniyVes ?? 0;
  const avgonTarif = code.avgonTarif ?? 0;

  // 2. Sotish tariflarini hisoblash
  const saleTarifKz = okruglonniyVes * data.saleStavkaKz;
  const saleTarifUz = okruglonniyVes * data.saleStavkaUz;
  const saleObshiyTarif = saleTarifKz + saleTarifUz + avgonTarif;

  // 3. Foyda hisoblash
  const originalObshiyTarif = code.obshiyTarif ?? 0;
  const profitUsd = saleObshiyTarif - originalObshiyTarif;

  // Qarz turi uchun mijoz majburiy
  if (data.paymentType === "debt" && !data.clientId) {
    throw new Error("Qarz turi uchun mijoz tanlash shart.");
  }

  // 4. codeSales ga yozish
  const [sale] = await db
    .insert(codeSales)
    .values({
      customsCodeId: codeId,
      clientId: data.clientId ?? null,
      buyerName: data.buyerName ?? null,
      buyerPhone: data.buyerPhone ?? null,
      saleStavkaKz: data.saleStavkaKz,
      saleStavkaUz: data.saleStavkaUz,
      saleTarifKz,
      saleTarifUz,
      saleObshiyTarif,
      saleAmountUsd: saleObshiyTarif,
      profitUsd,
      paymentType: data.paymentType,
      saleDate: data.saleDate,
      notes: data.notes ?? null,
    })
    .returning();

  // 5. Kod statusini "sold" ga o'zgartirish
  await db
    .update(customsCodes)
    .set({ status: "sold", usageType: "sold" })
    .where(eq(customsCodes.id, codeId));

  // 6. Agar naqd to'lov — cashOperations ga kirim yozish
  if (data.paymentType === "cash") {
    await db.insert(cashOperations).values({
      type: "income",
      category: "code_sale",
      amount: saleObshiyTarif,
      currency: "USD",
      relatedSaleId: null,
      relatedExpenseId: null,
      relatedDebtId: null,
      description: `Kod sotish #${code.kodUz || codeId}${data.buyerName ? ` — ${data.buyerName}` : ""}`,
      date: data.saleDate,
      notes: data.notes ?? null,
    });
  }

  // 7. Agar qarz va clientId berilgan bo'lsa — debts ga yozish
  if (data.paymentType === "debt" && data.clientId) {
    await db.insert(debts).values({
      clientId: data.clientId,
      saleId: null,
      totalAmountUsd: saleObshiyTarif,
      paidAmountUsd: 0,
      remainingAmountUsd: saleObshiyTarif,
      status: "active",
      dueDate: null,
      notes: `Kod qarz #${code.kodUz || codeId}${data.buyerName ? ` — ${data.buyerName}` : ""}`,
    });
  }

  return sale;
}

// ==========================================
// GET CODE SALES
// ==========================================

/**
 * Barcha kod sotuvlarini qaytaradi.
 * customsCode va client ma'lumotlari birga keladi.
 */
export async function getCodeSales(): Promise<CodeSaleWithRelations[]> {
  return (await db.query.codeSales.findMany({
    with: {
      customsCode: true,
      client: { columns: { id: true, name: true, phone: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })) as CodeSaleWithRelations[];
}

// ==========================================
// DELETE CODE SALE
// ==========================================

/**
 * Kod sotuvini o'chiradi.
 * Bog'liq kodning statusini "active" ga qaytaradi.
 */
export async function deleteCodeSale(id: number) {
  // Avval sotuvni olish — kodni qaytarish uchun
  const sale = await db.query.codeSales.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  // Sotuvni o'chirish
  await db.delete(codeSales).where(eq(codeSales.id, id));

  // Agar sotuv topilgan bo'lsa — kodning statusini "active" ga qaytarish
  if (sale) {
    await db
      .update(customsCodes)
      .set({ status: "active", usageType: "own" })
      .where(eq(customsCodes.id, sale.customsCodeId));
  }
}
