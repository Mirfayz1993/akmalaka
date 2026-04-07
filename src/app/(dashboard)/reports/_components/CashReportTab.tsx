"use client";

import ShortDateInput from "@/components/ui/ShortDateInput";

type CashSummary = {
  income: number;
  expense: number;
  net: number;
};

interface CashReportTabProps {
  data: { usd: CashSummary; rub: CashSummary };
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
}

function fmtNum(val: number, prefix: string): string {
  return (
    prefix +
    Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function CashReportTab({
  data,
  dateFrom,
  dateTo,
  onDateChange,
}: CashReportTabProps) {
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
      </div>

      {/* USD va RUB kartalar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* USD */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">
            USD Kassa
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Kirim</span>
              <span className="text-sm font-semibold text-green-600">
                {fmtNum(data.usd.income, "$")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Chiqim</span>
              <span className="text-sm font-semibold text-red-600">
                {fmtNum(data.usd.expense, "$")}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Xolisa</span>
              <span
                className={`text-base font-bold ${
                  data.usd.net >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {data.usd.net < 0 ? "-" : ""}
                {fmtNum(data.usd.net, "$")}
              </span>
            </div>
          </div>
        </div>

        {/* RUB */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">
            RUB Kassa
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Kirim</span>
              <span className="text-sm font-semibold text-green-600">
                {fmtNum(data.rub.income, "₽")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Chiqim</span>
              <span className="text-sm font-semibold text-red-600">
                {fmtNum(data.rub.expense, "₽")}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Xolisa</span>
              <span
                className={`text-base font-bold ${
                  data.rub.net >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {data.rub.net < 0 ? "-" : ""}
                {fmtNum(data.rub.net, "₽")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
