"use client";

type UsdOperation = {
  id: number;
  type: string;
  amount: string;
  partner: { name: string } | null;
  description: string | null;
  createdAt: Date | string | null;
};

interface UsdTabProps {
  balance: number;
  operations: UsdOperation[];
  onAddOperation: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  income: "Kirim",
  expense: "Chiqim",
  exchange: "Ayrboshlash",
  debt_give: "Qarz berildi",
  debt_take: "Qarz olindi",
};

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

export default function UsdTab({
  balance,
  operations,
  onAddOperation,
}: UsdTabProps) {
  const isPositive = balance >= 0;

  // Build running total (operations are desc, so we reverse for running sum)
  const sorted = [...operations].reverse();
  const runningTotals: number[] = [];
  let running = 0;
  for (const op of sorted) {
    running += parseFloat(op.amount);
    runningTotals.push(running);
  }
  // Reverse back to match display order (desc)
  runningTotals.reverse();

  return (
    <div>
      {/* Balance header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500 mb-1">Joriy balans</p>
          <p
            className={`text-4xl font-bold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            ${formatUsd(balance)}
          </p>
        </div>
        <button
          onClick={onAddOperation}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          + Operatsiya
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
                Tur
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Hamkor
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Tavsif
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Kirim
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Chiqim
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Balans
              </th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-10 text-slate-400"
                >
                  Operatsiyalar mavjud emas
                </td>
              </tr>
            ) : (
              operations.map((op, idx) => {
                const amt = parseFloat(op.amount);
                const isIncome = amt > 0;
                return (
                  <tr
                    key={op.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(op.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {TYPE_LABELS[op.type] ?? op.type}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {op.partner?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {op.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isIncome ? (
                        <span className="text-green-600 font-medium">
                          ${formatUsd(amt)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isIncome ? (
                        <span className="text-red-600 font-medium">
                          ${formatUsd(Math.abs(amt))}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span
                        className={
                          runningTotals[idx] >= 0
                            ? "text-green-700"
                            : "text-red-600"
                        }
                      >
                        ${formatUsd(runningTotals[idx])}
                      </span>
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
