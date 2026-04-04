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

function formatUsd(val: string | null | undefined): string {
  if (!val) return "—";
  const num = parseFloat(val);
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function CodeHistoryTable({ codes, mode }: Props) {
  if (codes.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        {mode === "sold" ? "Sotilgan kodlar yo'q" : "Ishlatilgan kodlar yo'q"}
      </div>
    );
  }

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
            <th className="text-left py-3 px-4 font-semibold text-slate-600">
              {mode === "sold" ? "Kimga sotildi" : "Qaysi vagon"}
            </th>
            <th className="text-right py-3 px-4 font-semibold text-slate-600">
              {mode === "sold" ? "Sotilgan narx ($)" : "Xarajat ($)"}
            </th>
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
              <td className="py-3 px-4 text-right text-slate-700">{formatUsd(code.buyCostUsd)}</td>
              <td className="py-3 px-4 text-slate-700">
                {mode === "used"
                  ? code.usedInTransport?.number ? `Vagon #${code.usedInTransport.number}` : "—"
                  : code.soldToPartner?.name ?? "—"}
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {mode === "sold"
                  ? <span className="text-green-600">{formatUsd(code.sellPriceUsd)}</span>
                  : <span className="text-slate-600">{formatUsd(code.buyCostUsd)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
