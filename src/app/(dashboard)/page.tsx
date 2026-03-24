"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Users,
} from "lucide-react";
import {
  getDashboardStats,
  getRecentOperations,
  getWagonStatuses,
  type RecentOperation,
  type WagonStatuses,
} from "@/lib/actions/dashboard";

type DashboardStats = {
  activeWagons: number;
  monthlySales: number;
  totalDebt: number;
  monthlyRevenue: number;
  cashBalanceUsd: number;
  cashBalanceRub: number;
  activeClients: number;
};

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [operations, setOperations] = useState<RecentOperation[]>([]);
  const [wagonStatuses, setWagonStatuses] = useState<WagonStatuses>({
    in_transit: 0,
    at_border: 0,
    arrived: 0,
    unloaded: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [s, ops, ws] = await Promise.all([
          getDashboardStats(),
          getRecentOperations(10),
          getWagonStatuses(),
        ]);
        setStats(s);
        setOperations(ops);
        setWagonStatuses(ws);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const statCards = [
    {
      label: "Yo'ldagi vagonlar",
      value: stats ? formatNumber(stats.activeWagons) : "—",
      icon: Package,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgLight: "bg-blue-50",
      href: "/wagons",
    },
    {
      label: "Oylik sotuvlar",
      value: stats ? formatNumber(stats.monthlySales) : "—",
      icon: ShoppingCart,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      bgLight: "bg-emerald-50",
      href: "/sales",
    },
    {
      label: "Jami qarz ($)",
      value: stats ? `$${formatNumber(stats.totalDebt, 2)}` : "—",
      icon: AlertTriangle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgLight: "bg-red-50",
      href: "/debts",
    },
    {
      label: "Oylik daromad ($)",
      value: stats ? `$${formatNumber(stats.monthlyRevenue, 2)}` : "—",
      icon: TrendingUp,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgLight: "bg-green-50",
      href: "/reports",
    },
    {
      label: "Kassa balansi",
      value: stats ? `$${formatNumber(stats.cashBalanceUsd, 2)}` : "—",
      renderValue: stats
        ? () => (
            <div className="flex flex-col">
              <span className="text-xl font-bold text-green-600">
                ${formatNumber(stats.cashBalanceUsd, 2)}
              </span>
              <span className="text-lg font-bold text-blue-600">
                ₽{formatNumber(stats.cashBalanceRub, 2)}
              </span>
            </div>
          )
        : undefined,
      icon: Wallet,
      color: "bg-blue-600",
      textColor: "text-blue-700",
      bgLight: "bg-blue-50",
      href: "/cash",
    },
    {
      label: "Faol mijozlar",
      value: stats ? formatNumber(stats.activeClients) : "—",
      icon: Users,
      color: "bg-indigo-500",
      textColor: "text-indigo-600",
      bgLight: "bg-indigo-50",
      href: "/clients",
    },
  ];

  const wagonStatusList: {
    key: keyof WagonStatuses;
    label: string;
    color: string;
    barColor: string;
  }[] = [
    {
      key: "in_transit",
      label: t.purchases.status.in_transit,
      color: "text-blue-600",
      barColor: "bg-blue-500",
    },
    {
      key: "at_border",
      label: t.purchases.status.at_border,
      color: "text-amber-600",
      barColor: "bg-amber-500",
    },
    {
      key: "arrived",
      label: t.purchases.status.arrived,
      color: "text-emerald-600",
      barColor: "bg-emerald-500",
    },
    {
      key: "unloaded",
      label: t.purchases.status.unloaded,
      color: "text-slate-600",
      barColor: "bg-slate-500",
    },
  ];

  const totalWagons = Object.values(wagonStatuses).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {t.nav.dashboard}
      </h1>

      {/* --- 6 ta statistik kartochka --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => router.push(card.href)}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className={`${card.color} p-3 rounded-lg flex-shrink-0`}>
                <Icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 leading-tight">
                  {card.label}
                </p>
                {loading ? (
                  <div className="h-6 w-20 bg-slate-100 rounded animate-pulse mt-1" />
                ) : card.renderValue ? (
                  card.renderValue()
                ) : (
                  <p className={`text-xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Oxirgi operatsiyalar + Vagonlar holati --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Oxirgi operatsiyalar */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            {t.cash.title} — {t.common.total.toLowerCase()} operatsiyalar
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-slate-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : operations.length === 0 ? (
            <p className="text-slate-400 text-sm">{t.common.noData}</p>
          ) : (
            <div className="space-y-2">
              {operations.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        op.type === "income"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {op.type === "income" ? t.cash.income : t.cash.expense}
                    </span>
                    <span className="text-sm text-slate-600 truncate">
                      {op.description}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        op.type === "income"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {op.type === "income" ? "+" : "-"}
                      {formatNumber(op.amount, 2)} {op.currency}
                    </p>
                    <p className="text-xs text-slate-400">{op.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vagonlar holati */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            {t.nav.wagons} — holat bo&apos;yicha
          </h2>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {wagonStatusList.map(({ key, label, color, barColor }) => {
                const count = wagonStatuses[key];
                const pct =
                  totalWagons > 0
                    ? Math.round((count / totalWagons) * 100)
                    : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${color}`}>
                        {label}
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {count}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 text-right">
                      {pct}%
                    </p>
                  </div>
                );
              })}

              {totalWagons === 0 && (
                <p className="text-slate-400 text-sm">{t.common.noData}</p>
              )}

              {totalWagons > 0 && (
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <span className="text-sm text-slate-500">
                    {t.common.total}
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {totalWagons} ta vagon
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
