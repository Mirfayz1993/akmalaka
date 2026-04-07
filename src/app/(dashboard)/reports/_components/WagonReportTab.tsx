"use client";

import ShortDateInput from "@/components/ui/ShortDateInput";

type WagonReportItem = {
  wagonId: number;
  number: string | null;
  closedAt: string | null;
  revenue: number;
  expenses: number;
  codeExpense: number;
  profit: number;
};

interface WagonReportTabProps {
  data: WagonReportItem[];
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}

function formatDate(val: string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtUsd(val: number): string {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WagonReportTab({
  data,
  dateFrom,
  dateTo,
  onDateChange,
}: WagonReportTabProps) {
  const totals = data.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      expenses: acc.expenses + row.expenses,
      codeExpense: acc.codeExpense + row.codeExpense,
      profit: acc.profit + row.profit,
    }),
    { revenue: 0, expenses: 0, codeExpense: 0, profit: 0 }
  );

  function handleExportCSV() {
    const headers = ["Vagon #", "Yopilgan sana", "Daromad $", "Xarajat $", "Kod xarajat $", "Foyda/Zarar $"];
    const rows = data.map((row) => [
      row.number ?? "—",
      row.closedAt ?? "—",
      row.revenue.toFixed(2),
      row.expenses.toFixed(2),
      row.codeExpense.toFixed(2),
      row.profit.toFixed(2),
    ]);
    const csvContent = [headers, ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vagon-hisobot-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Sana filtri */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">Dan:</label>
          <ShortDateInput
            value={dateFrom}
            onChange={(iso) => onDateChange(iso, dateTo)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">Gacha:</label>
          <ShortDateInput
            value={dateTo}
            onChange={(iso) => onDateChange(dateFrom, iso)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="ml-auto px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          CSV export
        </button>
      </div>

      {/* Jadval */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Vagon #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Yopilgan sana
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Daromad $
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Xarajat $
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Kod xarajat $
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Foyda/Zarar $
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                  Ma&apos;lumot topilmadi
                </td>
              </tr>
            ) : (
              <>
                {data.map((row) => (
                  <tr
                    key={row.wagonId}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.number ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(row.closedAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {fmtUsd(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {fmtUsd(row.expenses)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {fmtUsd(row.codeExpense)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        row.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {fmtUsd(row.profit)}
                    </td>
                  </tr>
                ))}

                {/* Jami qator */}
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                  <td className="px-4 py-3 text-slate-700" colSpan={2}>
                    Jami
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {fmtUsd(totals.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {fmtUsd(totals.expenses)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {fmtUsd(totals.codeExpense)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      totals.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {fmtUsd(totals.profit)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
