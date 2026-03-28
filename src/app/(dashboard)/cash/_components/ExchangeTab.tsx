"use client";

type ExchangeItem = {
  id: number;
  amount: string;
  exchangeRate: string | null;
  partner: { name: string } | null;
  description: string | null;
  createdAt: Date | string | null;
};

interface ExchangeTabProps {
  exchanges: ExchangeItem[];
  onAddExchange: () => void;
}

function formatDate(val: Date | string | null): string {
  if (!val) return "—";
  try {
    const d = new Date(val);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  } catch {
    return "—";
  }
}

function formatUsd(val: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function formatRub(val: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export default function ExchangeTab({
  exchanges,
  onAddExchange,
}: ExchangeTabProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">
          Pul Ayrboshlash Tarixi
        </h2>
        <button
          onClick={onAddExchange}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          + Ayrboshlash
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Sana
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Hamkor
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Berildi ($)
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Olindi (RUB)
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Kurs
              </th>
            </tr>
          </thead>
          <tbody>
            {exchanges.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-10 text-slate-400"
                >
                  Ayrboshlashlar mavjud emas
                </td>
              </tr>
            ) : (
              exchanges.map((ex) => {
                const usdAmt = Math.abs(parseFloat(ex.amount));
                const rate = ex.exchangeRate
                  ? parseFloat(ex.exchangeRate)
                  : null;
                const rubAmt = rate ? usdAmt * rate : null;
                return (
                  <tr
                    key={ex.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(ex.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ex.partner?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      ${formatUsd(usdAmt)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      {rubAmt !== null ? `${formatRub(rubAmt)} ₽` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {rate ? `1$ = ${formatRub(rate)} ₽` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
