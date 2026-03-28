"use client";

import type { CodeHistoryItem } from "@/lib/actions/codes";

interface CodeHistoryTableProps {
  codes: CodeHistoryItem[];
}

const typeBadgeClasses: Record<string, string> = {
  kz: "bg-blue-100 text-blue-800",
  uz: "bg-green-100 text-green-800",
  afgon: "bg-orange-100 text-orange-800",
};

const typeLabels: Record<string, string> = {
  kz: "KZ",
  uz: "UZ",
  afgon: "Afgon",
};

const statusBadgeClasses: Record<string, string> = {
  available: "bg-slate-100 text-slate-600",
  used: "bg-blue-100 text-blue-800",
  sold: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  available: "Mavjud",
  used: "Ishlatilgan",
  sold: "Sotilgan",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatUsd(val: string | null): string {
  if (!val) return "—";
  const num = parseFloat(val);
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CodeHistoryTable({ codes }: CodeHistoryTableProps) {
  if (codes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        Tarix yo&apos;q
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-600">
              Sana
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">
              Tur
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">
              Ta&apos;minotchi
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">
              Vagon/Mijoz
            </th>
            <th className="text-right py-3 px-4 font-semibold text-slate-600">
              Xarajat ($)
            </th>
            <th className="text-right py-3 px-4 font-semibold text-slate-600">
              Daromad ($)
            </th>
          </tr>
        </thead>
        <tbody>
          {codes.map((code) => {
            const counterpart =
              code.status === "used"
                ? code.usedInTransport?.number
                  ? `Vagon #${code.usedInTransport.number}`
                  : "Vagon"
                : code.status === "sold"
                  ? (code.soldToPartner?.name ?? "—")
                  : "—";

            return (
              <tr
                key={code.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-3 px-4 text-slate-500">
                  {formatDate(code.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      typeBadgeClasses[code.type] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {typeLabels[code.type] ?? code.type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusBadgeClasses[code.status] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabels[code.status] ?? code.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {code.supplier?.name ?? "—"}
                </td>
                <td className="py-3 px-4 text-slate-700">{counterpart}</td>
                <td className="py-3 px-4 text-right text-slate-700">
                  {formatUsd(code.buyCostUsd)}
                </td>
                <td className="py-3 px-4 text-right text-green-600 font-medium">
                  {formatUsd(code.sellPriceUsd)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
