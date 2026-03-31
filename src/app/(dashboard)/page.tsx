import Link from "next/link";
import { getUsdBalance, getRubState, getUsdOperations } from "@/lib/actions/cash";
import { getTransports } from "@/lib/actions/wagons";
import { getPartners } from "@/lib/actions/partners";

type UsdOperation = Awaited<ReturnType<typeof getUsdOperations>>[number];
type Transport = Awaited<ReturnType<typeof getTransports>>[number];

const STATUS_LABELS: Record<string, string> = {
  in_transit: "Yo'lda",
  at_border: "Chegarada",
  arrived: "Yetib keldi",
  unloaded: "Tushirildi",
  closed: "Yopildi",
};

const STATUS_CLASSES: Record<string, string> = {
  in_transit: "bg-yellow-100 text-yellow-800",
  at_border: "bg-orange-100 text-orange-800",
  arrived: "bg-green-100 text-green-800",
  unloaded: "bg-blue-100 text-blue-800",
  closed: "bg-slate-100 text-slate-600",
};

function statusCount(transports: Transport[], status: string) {
  return transports.filter((t) => t.status === status).length;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatRub(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const [usdBalance, rubSt, transports, allPartners, ops] = await Promise.all([
    getUsdBalance(),
    getRubState(),
    getTransports("wagon"),
    getPartners(),
    getUsdOperations(),
  ]);

  const activeTransports = transports.filter((t) => t.status !== "closed");
  const lastOperations = ops.slice(0, 5) as UsdOperation[];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {/* Kassa kartalar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">$ Kassa</p>
          <p className={`text-3xl font-bold ${usdBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatUsd(usdBalance)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">RUB Kassa</p>
          <p className={`text-3xl font-bold ${rubSt.rubBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatRub(rubSt.rubBalance)} RUB
          </p>
          {rubSt.avgRate > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              1$ = {rubSt.avgRate.toFixed(2)} RUB
            </p>
          )}
        </div>
      </div>

      {/* Aktiv vagonlar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Aktiv vagonlar:{" "}
          <span className="text-blue-600">{activeTransports.length} ta</span>
        </h2>
        <div className="flex flex-wrap gap-3">
          {(["in_transit", "at_border", "arrived", "unloaded"] as const).map((status) => (
            <div
              key={status}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${STATUS_CLASSES[status]}`}
            >
              <span>{STATUS_LABELS[status]}:</span>
              <span className="font-bold">{statusCount(activeTransports, status)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hamkorlar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Hamkorlar</h2>
          <Link href="/partners" className="text-sm text-blue-600 hover:underline">
            Barchasini ko&apos;rish →
          </Link>
        </div>
        <p className="text-slate-600 text-sm">
          Hamkorlar soni:{" "}
          <span className="font-semibold text-slate-800">{allPartners.length} ta</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Qarz ma&apos;lumotlari uchun hamkorlar sahifasiga o&apos;ting.
        </p>
      </div>

      {/* So'nggi operatsiyalar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">So&apos;nggi operatsiyalar</h2>
          <Link href="/cash" className="text-sm text-blue-600 hover:underline">
            Barchasini ko&apos;rish →
          </Link>
        </div>

        {lastOperations.length === 0 ? (
          <p className="text-slate-400 text-sm">Operatsiyalar yo&apos;q</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 font-medium text-slate-500">Sana</th>
                  <th className="text-left py-2 pr-4 font-medium text-slate-500">Hamkor</th>
                  <th className="text-right py-2 pr-4 font-medium text-slate-500">Miqdor</th>
                  <th className="text-left py-2 font-medium text-slate-500">Tur</th>
                </tr>
              </thead>
              <tbody>
                {lastOperations.map((op) => {
                  const amount = parseFloat(op.amount);
                  const isIncome = op.type === "income" || amount > 0;
                  return (
                    <tr key={op.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-600">
                        {op.createdAt ? new Date(op.createdAt).toLocaleDateString("ru-RU") : "—"}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">{op.partner?.name ?? "—"}</td>
                      <td className={`py-2 pr-4 text-right font-semibold ${isIncome ? "text-green-600" : "text-red-600"}`}>
                        {isIncome ? "+" : ""}{formatUsd(amount)}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          op.type === "income" ? "bg-green-100 text-green-700"
                          : op.type === "expense" ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                        }`}>
                          {op.type === "income" ? "Kirim" : op.type === "expense" ? "Chiqim" : "Ayrboshlash"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
