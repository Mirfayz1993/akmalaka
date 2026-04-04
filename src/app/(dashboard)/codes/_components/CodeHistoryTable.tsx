"use client";

import type { CodeHistoryItem } from "@/lib/actions/codes";

interface Props {
  codes: CodeHistoryItem[];
  mode: "sold" | "used";
}

const typeBadgeClasses: Record<string, string> = {
  kz: "bg-blue-100 text-blue-800",
  uz: "bg-green-100 text-green-800",
  afgon: "bg-orange-100 text-orange-800",
};

const typeLabels: Record<string, string> = {
  kz: "KZ",
  uz: "UZ",
  afgon: "Avg'on",
};

function formatUsd(val: number): string {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}

type GroupedRow = {
  key: string;
  codes: CodeHistoryItem[];
  date: Date | string | null;
  totalBuyCost: number;
  totalSellPrice: number;
  totalTonnage: number;
  types: string[];
  suppliers: string[];
  customer: string;
  transport: string;
};

export default function CodeHistoryTable({ codes, mode }: Props) {
  if (codes.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        {mode === "sold" ? "Sotilgan kodlar yo'q" : "Ishlatilgan kodlar yo'q"}
      </div>
    );
  }

  // "used" rejimida guruhlamasdan ko'rsatish
  if (mode === "used") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Sana</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Tur</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Kimdan oldik</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600">Tonnaj (t)</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600">Narx ($/t)</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600">To'langan ($)</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Qaysi vagon</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600">Xarajat ($)</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-slate-500">{formatDate(code.createdAt)}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClasses[code.type] ?? "bg-slate-100 text-slate-600"}`}>
                    {typeLabels[code.type] ?? code.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700">{code.supplier?.name ?? "—"}</td>
                <td className="py-3 px-4 text-right text-slate-600">
                  {code.tonnage ? `${parseFloat(code.tonnage).toFixed(1)} t` : "—"}
                </td>
                <td className="py-3 px-4 text-right text-slate-600">
                  {code.buyPricePerTon ? `$${parseFloat(code.buyPricePerTon).toFixed(2)}` : "—"}
                </td>
                <td className="py-3 px-4 text-right text-slate-700">
                  {code.buyCostUsd ? formatUsd(parseFloat(code.buyCostUsd)) : "—"}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {code.usedInTransport?.number ? `Vagon #${code.usedInTransport.number}` : "—"}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-600">
                  {code.buyCostUsd ? formatUsd(parseFloat(code.buyCostUsd)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // "sold" rejimida notes (batchId) bo'yicha guruhlash; yo'q bo'lsa id bo'yicha alohida
  const groupMap = new Map<string, CodeHistoryItem[]>();
  for (const code of codes) {
    const key = code.notes ? `batch__${code.notes}` : `id-${code.id}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(code);
  }

  const groups: GroupedRow[] = Array.from(groupMap.entries()).map(([key, items]) => {
    const totalBuyCost = items.reduce((s, c) => s + parseFloat(c.buyCostUsd ?? "0"), 0);
    const totalSellPrice = items.reduce((s, c) => s + parseFloat(c.sellPriceUsd ?? "0"), 0);
    // Tonnajni faqat KZ kodidan ol; yo'q bo'lsa UZ, yo'q bo'lsa birinchi kod
    const kzItem = items.find((c) => c.type === "kz") ?? items.find((c) => c.type === "uz") ?? items[0];
    const totalTonnage = parseFloat(kzItem?.tonnage ?? "0");
    const types = [...new Set(items.map((c) => c.type))];
    const suppliers = [...new Set(items.map((c) => c.supplier?.name).filter(Boolean))] as string[];
    // notes formatidan vagon raqamini ol: "batchId|wagonNumber"
    const notesStr = items[0].notes ?? "";
    const wagonNumber = notesStr.includes("|") ? notesStr.split("|")[1] : null;
    return {
      key,
      codes: items,
      date: items[0].usedAt ?? items[0].createdAt,
      totalBuyCost,
      totalSellPrice,
      totalTonnage,
      types,
      suppliers,
      customer: items[0].soldToPartner?.name ?? "—",
      transport: wagonNumber ? `#${wagonNumber}` : "—",
    };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Sana</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Tur</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Kimdan oldik</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-600">Tonnaj (t)</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-600">To'langan ($)</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Kimga sotildi</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Vagon</th>
            <th className="text-right py-3 px-4 font-semibold text-slate-600">Sotilgan narx ($)</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-3 px-4 text-slate-500">{formatDate(group.date)}</td>
              <td className="py-3 px-4">
                <div className="flex gap-1 flex-wrap">
                  {group.types.map((t) => (
                    <span key={t} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClasses[t] ?? "bg-slate-100 text-slate-600"}`}>
                      {typeLabels[t] ?? t}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4 text-slate-700">{group.suppliers.join(", ") || "—"}</td>
              <td className="py-3 px-4 text-right text-slate-600">{group.totalTonnage.toFixed(1)} t</td>
              <td className="py-3 px-4 text-right text-slate-700">{formatUsd(group.totalBuyCost)}</td>
              <td className="py-3 px-4 text-slate-700">{group.customer}</td>
              <td className="py-3 px-4 text-slate-500 font-mono text-xs">{group.transport}</td>
              <td className="py-3 px-4 text-right font-medium text-green-600">{formatUsd(group.totalSellPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
