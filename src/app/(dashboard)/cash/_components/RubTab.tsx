"use client";

type RubOperation = {
  id: number;
  type: string;
  amount: string;
  exchangeRate: string | null;
  partner: { name: string } | null;
  description: string | null;
  createdAt: Date | string | null;
};

interface RubTabProps {
  rubBalance: number;
  avgRate: number;
  operations: RubOperation[];
  onAddExchange: () => void;
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

function formatRub(val: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export default function RubTab({
  rubBalance,
  avgRate,
  operations,
  onAddExchange,
}: RubTabProps) {
  const isPositive = rubBalance >= 0;

  return (
    <div>
      {/* Balance header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-sm text-slate-500 mb-1">Joriy RUB balans</p>
            <p
              className={`text-4xl font-bold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatRub(rubBalance)} ₽
            </p>
          </div>
          <div className="border-l border-slate-200 pl-8">
            <p className="text-sm text-slate-500 mb-1">{"O'rtacha kurs"}</p>
            <p className="text-2xl font-semibold text-slate-700">
              1$ = {avgRate > 0 ? formatRub(avgRate) : "—"} RUB
            </p>
          </div>
        </div>
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
                Tur
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Hamkor
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Kurs
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Kirim RUB
              </th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">
                Chiqim RUB
              </th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-slate-400"
                >
                  Operatsiyalar mavjud emas
                </td>
              </tr>
            ) : (
              operations.map((op) => {
                const amt = parseFloat(op.amount);
                const isIncome = amt > 0;
                const rate = op.exchangeRate ? parseFloat(op.exchangeRate) : null;
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
                    <td className="px-4 py-3 text-right text-slate-600">
                      {rate ? formatRub(rate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isIncome ? (
                        <span className="text-green-600 font-medium">
                          {formatRub(amt)} ₽
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isIncome ? (
                        <span className="text-red-600 font-medium">
                          {formatRub(Math.abs(amt))} ₽
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
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
