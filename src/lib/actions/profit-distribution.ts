"use server";

import { db } from "@/db";
import { partnerBalances, partners, transports } from "@/db/schema";
import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTransportFinancialSummary } from "./transport-summary";

const DESC_PREFIX = "Foyda taqsimoti";

function buildDescription(percentage: number): string {
  return `${DESC_PREFIX} (${percentage.toFixed(2)}%)`;
}

function parsePercentage(description: string | null): number {
  if (!description) return 0;
  const m = description.match(/\((\d+(?:\.\d+)?)%\)/);
  return m ? parseFloat(m[1]) : 0;
}

export type ProfitDistributionRow = {
  id: number;
  partnerId: number;
  partnerName: string;
  percentage: number;
  amountUsd: number;
};

export async function getProfitDistribution(
  transportId: number
): Promise<ProfitDistributionRow[]> {
  const rows = await db.query.partnerBalances.findMany({
    where: and(
      eq(partnerBalances.transportId, transportId),
      like(partnerBalances.description, `${DESC_PREFIX}%`)
    ),
    with: { partner: true },
  });

  return rows.map((r) => ({
    id: r.id,
    partnerId: r.partnerId,
    partnerName: r.partner?.name ?? "—",
    percentage: parsePercentage(r.description),
    // Amount manfiy saqlanadi (biz qarz) — UI da musbat ko'rsatamiz
    amountUsd: Math.abs(Number(r.amount)),
  }));
}

export async function setProfitDistribution(
  transportId: number,
  distributions: Array<{ partnerId: number; percentage: number }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transport = await db.query.transports.findFirst({
      where: eq(transports.id, transportId),
    });
    if (!transport) {
      return { ok: false, error: "Transport topilmadi" };
    }
    if (transport.status !== "closed") {
      return {
        ok: false,
        error: "Foyda taqsimlash faqat yopilgan vagon uchun mumkin",
      };
    }

    // Validatsiya: foiz qiymatlari va yig'indi
    let totalPct = 0;
    for (const d of distributions) {
      if (!Number.isFinite(d.percentage) || d.percentage <= 0 || d.percentage > 100) {
        return { ok: false, error: `Noto'g'ri foiz qiymati: ${d.percentage}` };
      }
      totalPct += d.percentage;
    }
    if (totalPct > 100.0001) {
      return {
        ok: false,
        error: `Foizlar yig'indisi 100% dan oshmasligi kerak (hozir: ${totalPct.toFixed(2)}%)`,
      };
    }

    // Hamkorlar 'partner' turida ekanligini tekshirish
    if (distributions.length > 0) {
      const partnerIds = Array.from(new Set(distributions.map((d) => d.partnerId)));
      const partnersList = await db.query.partners.findMany({
        where: (p, { inArray }) => inArray(p.id, partnerIds),
      });
      const byId = new Map(partnersList.map((p) => [p.id, p]));
      for (const d of distributions) {
        const p = byId.get(d.partnerId);
        if (!p) {
          return { ok: false, error: `Hamkor topilmadi (ID: ${d.partnerId})` };
        }
        if (p.type !== "partner") {
          return {
            ok: false,
            error: `${p.name} 'partner' turida emas — foyda taqsimoti uchun yaroqsiz`,
          };
        }
      }
    }

    // Joriy sof foydani hisoblash
    const summary = await getTransportFinancialSummary(transportId);
    const netProfit = summary.netProfitUsd;

    if (distributions.length > 0 && netProfit <= 0) {
      return {
        ok: false,
        error: `Sof foyda manfiy yoki nol ($${netProfit.toFixed(2)}) — taqsimot mumkin emas`,
      };
    }

    await db.transaction(async (tx) => {
      // Eski taqsimot yozuvlarini o'chirish
      await tx
        .delete(partnerBalances)
        .where(
          and(
            eq(partnerBalances.transportId, transportId),
            like(partnerBalances.description, `${DESC_PREFIX}%`)
          )
        );

      // Yangi yozuvlar — biz hamkorga qarzga aylanamiz (manfiy amount)
      for (const d of distributions) {
        const amount = (netProfit * d.percentage) / 100;
        await tx.insert(partnerBalances).values({
          partnerId: d.partnerId,
          amount: String(-amount),
          currency: "usd",
          transportId,
          description: buildDescription(d.percentage),
        });
      }
    });

    revalidatePath("/wagons");
    revalidatePath("/partners");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Xatolik yuz berdi",
    };
  }
}
