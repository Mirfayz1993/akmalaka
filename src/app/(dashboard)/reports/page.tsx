"use client";

import { useState, useEffect, useCallback } from "react";
import ShortDateInput from "@/components/ui/ShortDateInput";
import WagonReportTab from "./_components/WagonReportTab";
import CashReportTab from "./_components/CashReportTab";
import {
  getWagonReport,
  getCodeReport,
  getCashReport,
  getOverallReport,
  getPartnerReport,
} from "@/lib/actions/reports";

type WagonReportItem = {
  wagonId: number;
  number: string | null;
  closedAt: string | null;
  revenue: number;
  expenses: number;
  codeExpense: number;
  profit: number;
};

type CodeReportItem = {
  codeId: number;
  type: string;
  buyCostUsd: number;
  sellPriceUsd: number;
  profit: number;
  createdAt: Date | string | null;
};

type CashSummary = { income: number; expense: number; net: number };

type CashReportData = { usd: CashSummary; rub: CashSummary };

type OverallReport = {
  wagonProfit: number;
  codeProfit: number;
  cashNet: number;
  total: number;
};

type PartnerReportItem = {
  partnerId: number;
  name: string;
  type: string;
  balance: number;
  operationsCount: number;
};

type TabId = "wagons" | "codes" | "cash" | "partners" | "overall";

const TABS: { id: TabId; label: string }[] = [
  { id: "wagons", label: "Vagonlar" },
  { id: "codes", label: "Kodlar" },
  { id: "cash", label: "Kassa" },
  { id: "partners", label: "Hamkorlar" },
  { id: "overall", label: "Umumiy" },
];

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function fmtUsd(val: number): string {
  return (
    (val < 0 ? "-$" : "$") +
    Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const defaultCash: CashReportData = {
  usd: { income: 0, expense: 0, net: 0 },
  rub: { income: 0, expense: 0, net: 0 },
};

const defaultOverall: OverallReport = {
  wagonProfit: 0,
  codeProfit: 0,
  cashNet: 0,
  total: 0,
};

export default function ReportsPage() {
  const { from: initFrom, to: initTo } = getMonthRange();

  const [activeTab, setActiveTab] = useState<TabId>("wagons");
  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo, setDateTo] = useState(initTo);

  const [wagonData, setWagonData] = useState<WagonReportItem[]>([]);
  const [codeData, setCodeData] = useState<CodeReportItem[]>([]);
  const [cashData, setCashData] = useState<CashReportData>(defaultCash);
  const [partnerData, setPartnerData] = useState<PartnerReportItem[]>([]);
  const [overallData, setOverallData] = useState<OverallReport>(defaultOverall);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(
    async (from: string, to: string) => {
      setLoading(true);
      try {
        if (activeTab === "wagons") {
          const data = await getWagonReport(from, to);
          setWagonData(data);
        } else if (activeTab === "codes") {
          const data = await getCodeReport(from, to);
          setCodeData(data as CodeReportItem[]);
        } else if (activeTab === "cash") {
          const data = await getCashReport(from, to);
          setCashData(data);
        } else if (activeTab === "partners") {
          const data = await getPartnerReport();
          setPartnerData(data);
        } else if (activeTab === "overall") {
          const data = await getOverallReport(from, to);
          setOverallData(data);
        }
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    loadData(dateFrom, dateTo);
  }, [activeTab, loadData, dateFrom, dateTo]);

  function handleDateChange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
  }

  return (
    <div className="p-6">
      {/* Sarlavha */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Hisobotlar</h1>
      </div>

      {/* Tablar */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Yuklanmoqda...
        </div>
      ) : (
        <>
          {/* Vagonlar tab */}
          {activeTab === "wagons" && (
            <WagonReportTab
              data={wagonData}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={handleDateChange}
            />
          )}

          {/* Kodlar tab */}
          {activeTab === "codes" && (
            <div className="space-y-4">
              {/* Sana filtri */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 font-medium">Dan:</label>
                  <ShortDateInput
                    value={dateFrom}
                    onChange={(iso: string) => handleDateChange(iso, dateTo)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 font-medium">Gacha:</label>
                  <ShortDateInput
                    value={dateTo}
                    onChange={(iso: string) => handleDateChange(dateFrom, iso)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Tur
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Xarid narxi $
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Sotish narxi $
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Foyda $
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                          Ma&apos;lumot topilmadi
                        </td>
                      </tr>
                    ) : (
                      <>
                        {codeData.map((row) => (
                          <tr
                            key={row.codeId}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-slate-800 uppercase">
                              {row.type}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {fmtUsd(row.buyCostUsd)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {fmtUsd(row.sellPriceUsd)}
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
                        <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                          <td className="px-4 py-3 text-slate-700" colSpan={3}>
                            Jami
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${
                              codeData.reduce((s, r) => s + r.profit, 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {fmtUsd(codeData.reduce((s, r) => s + r.profit, 0))}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kassa tab */}
          {activeTab === "cash" && (
            <CashReportTab
              data={cashData}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={handleDateChange}
            />
          )}

          {/* Hamkorlar tab */}
          {activeTab === "partners" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hamkor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tur</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Operatsiyalar</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balans $</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                        Ma&apos;lumot topilmadi
                      </td>
                    </tr>
                  ) : (
                    partnerData.map((p) => (
                      <tr key={p.partnerId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{p.type}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{p.operationsCount}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${p.balance > 0 ? "text-green-600" : p.balance < 0 ? "text-red-600" : "text-slate-500"}`}>
                          {p.balance > 0 ? "+" : ""}{fmtUsd(p.balance)}
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            {p.balance > 0 ? "(ular bizga qarz)" : p.balance < 0 ? "(biz ularga qarz)" : ""}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Umumiy tab */}
          {activeTab === "overall" && (
            <div className="space-y-4">
              {/* Sana filtri */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 font-medium">Dan:</label>
                  <ShortDateInput
                    value={dateFrom}
                    onChange={(iso: string) => handleDateChange(iso, dateTo)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 font-medium">Gacha:</label>
                  <ShortDateInput
                    value={dateTo}
                    onChange={(iso: string) => handleDateChange(dateFrom, iso)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Vagon foydasi
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      overallData.wagonProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {fmtUsd(overallData.wagonProfit)}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Kod foydasi
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      overallData.codeProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {fmtUsd(overallData.codeProfit)}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Kassa (USD xolisa)
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      overallData.cashNet >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {fmtUsd(overallData.cashNet)}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 text-center">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                    Jami foyda
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      overallData.total >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {fmtUsd(overallData.total)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
