"use client";

import { useI18n } from "@/i18n";
import { useState, useEffect, useCallback } from "react";
import { BarChart3, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { getWagons } from "@/lib/actions/wagons";
import {
  getWagonProfitReport,
  getDebtReport,
  getOverallReport,
} from "@/lib/actions/reports";
import type {
  WagonProfitReport,
  DebtReportRow,
  OverallReport,
} from "@/lib/actions/reports";
import type { WagonRow } from "@/lib/actions/wagons";

// ==========================================
// HELPERS
// ==========================================

function fmt(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ==========================================
// TABS
// ==========================================

type TabId = "wagon" | "debts" | "overall";

const TABS: { id: TabId; labelKey: keyof typeof import("@/i18n/uz").uz.reports }[] = [
  { id: "wagon", labelKey: "wagonReport" },
  { id: "debts", labelKey: "debtReport" },
  { id: "overall", labelKey: "currencyReport" },
];

// ==========================================
// STAT CARD
// ==========================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "blue" | "gray";
}) {
  const colorMap = {
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    gray: "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ==========================================
// TAB 1: PARTIYA FOYDA/ZARAR
// ==========================================

function WagonTab() {
  const { t } = useI18n();
  const [wagons, setWagons] = useState<WagonRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [report, setReport] = useState<WagonProfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWagons().then(setWagons).catch(console.error);
  }, []);

  const loadReport = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWagonProfitReport(Number(id));
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xato yuz berdi");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    loadReport(id);
  };

  const profitColor =
    !report ? "gray" : report.profit >= 0 ? "blue" : "red";

  return (
    <div className="space-y-6">
      {/* Vagon tanlash */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Vagon tanlang
        </label>
        <select
          value={selectedId}
          onChange={handleSelect}
          className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— tanlang —</option>
          {wagons.map((w) => (
            <option key={w.id} value={w.id}>
              {w.wagonNumber}{w.fromLocation || w.toLocation ? ` (${w.fromLocation ?? "?"}→${w.toLocation ?? "?"})` : ""}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-slate-400 text-sm">{t.common.loading}</p>
      )}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {report && !loading && (
        <>
          {/* Umumiy kartochkalar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label={t.reports.revenue}
              value={`$${fmt(report.revenue.total)}`}
              color="green"
            />
            <StatCard
              label={t.reports.expenses}
              value={`$${fmt(report.costs.total)}`}
              color="red"
            />
            <StatCard
              label={report.profit >= 0 ? t.reports.profit : t.reports.loss}
              value={`$${fmt(Math.abs(report.profit))}`}
              color={profitColor}
            />
          </div>

          {/* Tafsilot jadval */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daromad tafsiloti */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <TrendingUp size={16} />
                  {t.reports.revenue}
                </h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-600">Taxta sotish</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      ${fmt(report.revenue.sales)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-600">Kod sotish</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      ${fmt(report.revenue.codeSales)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-4 py-2 font-semibold text-green-700">
                      {t.common.total}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-green-700">
                      ${fmt(report.revenue.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Xarajat tafsiloti */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-100">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <TrendingDown size={16} />
                  {t.reports.expenses}
                </h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-600">Xarid narxi</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      ${fmt(report.costs.purchase)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-600">Transport</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      ${fmt(report.costs.transport)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-600">Tushirish</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      ${fmt(report.costs.unloading)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-600">Kodlar</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      ${fmt(report.costs.codes)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-600">
                      Boshqa xarajatlar
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                      ${fmt(report.costs.expenses)}
                    </td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-4 py-2 font-semibold text-red-700">
                      {t.common.total}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-red-700">
                      ${fmt(report.costs.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Natija */}
          <div
            className={`rounded-xl border p-4 flex items-center justify-between ${
              report.profit >= 0
                ? "bg-blue-50 border-blue-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <span
              className={`font-semibold text-base ${
                report.profit >= 0 ? "text-blue-700" : "text-red-700"
              }`}
            >
              {report.profit >= 0 ? t.reports.profit : t.reports.loss}
            </span>
            <span
              className={`text-xl font-bold ${
                report.profit >= 0 ? "text-blue-700" : "text-red-700"
              }`}
            >
              {report.profit < 0 ? "-" : ""}${fmt(Math.abs(report.profit))}
            </span>
          </div>
        </>
      )}

      {!selectedId && !loading && (
        <p className="text-slate-400 text-sm">{t.common.noData}</p>
      )}
    </div>
  );
}

// ==========================================
// TAB 2: QARZLAR
// ==========================================

function DebtsTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<DebtReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDebtReport()
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalDebt = rows.reduce((a, r) => a + r.totalDebt, 0);
  const totalPaid = rows.reduce((a, r) => a + r.totalPaid, 0);
  const totalRemaining = rows.reduce((a, r) => a + r.totalRemaining, 0);

  if (loading) {
    return <p className="text-slate-400 text-sm">{t.common.loading}</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-slate-400">{t.common.noData}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={t.debts.totalDebt}
          value={`$${fmt(totalDebt)}`}
          color="gray"
        />
        <StatCard
          label={t.debts.paid}
          value={`$${fmt(totalPaid)}`}
          color="green"
        />
        <StatCard
          label={t.debts.remaining}
          value={`$${fmt(totalRemaining)}`}
          color="red"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  {t.clients.name}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  {t.clients.phone}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  {t.debts.totalDebt}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  {t.debts.paid}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  {t.debts.remaining}
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">
                  {t.common.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const paidPercent =
                  row.totalDebt > 0
                    ? (row.totalPaid / row.totalDebt) * 100
                    : 0;
                const statusLabel =
                  paidPercent === 0
                    ? t.debts.status.active
                    : paidPercent < 100
                    ? t.debts.status.partially_paid
                    : t.debts.status.paid;
                const statusColor =
                  paidPercent === 0
                    ? "bg-red-100 text-red-700"
                    : paidPercent < 100
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700";

                return (
                  <tr
                    key={row.clientId}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.clientName}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.clientPhone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      ${fmt(row.totalDebt)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      ${fmt(row.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      ${fmt(row.totalRemaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td
                  className="px-4 py-3 text-slate-700"
                  colSpan={2}
                >
                  {t.common.total}
                </td>
                <td className="px-4 py-3 text-right text-slate-800">
                  ${fmt(totalDebt)}
                </td>
                <td className="px-4 py-3 text-right text-green-700">
                  ${fmt(totalPaid)}
                </td>
                <td className="px-4 py-3 text-right text-red-700">
                  ${fmt(totalRemaining)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 3: UMUMIY HISOBOT
// ==========================================

function OverallTab() {
  const { t } = useI18n();
  const [report, setReport] = useState<OverallReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadReport = useCallback(
    (from?: string, to?: string) => {
      setLoading(true);
      getOverallReport(from || undefined, to || undefined)
        .then(setReport)
        .catch(console.error)
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    // Initial load: call the server action directly to avoid the
    // react-hooks/set-state-in-effect lint error with loadReport().
    getOverallReport()
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFilter = () => {
    loadReport(dateFrom, dateTo);
  };

  return (
    <div className="space-y-6">
      {/* Sana filtri */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Dan
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Gacha
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {t.common.filter}
        </button>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              loadReport();
            }}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
          >
            Tozalash
          </button>
        )}
      </div>

      {loading && (
        <p className="text-slate-400 text-sm">{t.common.loading}</p>
      )}

      {report && !loading && (
        <>
          {/* Valyuta bo'yicha */}
          {report.byCurrency.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">
                Valyuta bo&apos;yicha kassa
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.byCurrency.map((cur) => (
                  <div
                    key={cur.currency}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <span className="font-bold text-slate-800">
                        {cur.currency}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">
                          {t.cash.income}
                        </span>
                        <span className="font-semibold text-green-600">
                          +{fmt(cur.income)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">
                          {t.cash.expense}
                        </span>
                        <span className="font-semibold text-red-600">
                          -{fmt(cur.expense)}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">
                          {t.cash.balance}
                        </span>
                        <span
                          className={`font-bold ${
                            cur.balance >= 0
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        >
                          {cur.balance >= 0 ? "+" : ""}
                          {fmt(cur.balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">{t.common.noData}</p>
          )}

          {/* Qarz holati */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">
              {t.reports.debtReport}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label={t.debts.totalDebt}
                value={`$${fmt(report.totalDebt)}`}
                color="gray"
              />
              <StatCard
                label={t.debts.paid}
                value={`$${fmt(report.totalPaid)}`}
                color="green"
              />
              <StatCard
                label={t.debts.remaining}
                value={`$${fmt(report.totalRemaining)}`}
                color="red"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function ReportsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("wagon");

  const tabIcons: Record<TabId, React.ReactNode> = {
    wagon: <BarChart3 size={16} />,
    debts: <FileText size={16} />,
    overall: <TrendingDown size={16} />,
  };

  const tabLabels: Record<TabId, string> = {
    wagon: t.reports.wagonReport,
    debts: t.reports.debtReport,
    overall: t.reports.currencyReport,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-bold text-slate-800">{t.reports.title}</h1>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            {tabIcons[tab.id]}
            {tabLabels[tab.id]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "wagon" && <WagonTab />}
        {activeTab === "debts" && <DebtsTab />}
        {activeTab === "overall" && <OverallTab />}
      </div>
    </div>
  );
}
