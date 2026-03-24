"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useI18n } from "@/i18n";
import { Truck, ArrowRight, Train, RefreshCw, ChevronDown } from "lucide-react";
import {
  getWagonsForLogistics,
  updateWagonStatus,
  type LogisticsWagon,
  type WagonStatus,
} from "@/lib/actions/logistics";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const STATUSES: WagonStatus[] = ["in_transit", "at_border", "arrived", "unloaded"];

const NEXT_STATUS: Record<WagonStatus, WagonStatus | null> = {
  in_transit: "at_border",
  at_border: "arrived",
  arrived: "unloaded",
  unloaded: null,
};

type ColumnConfig = {
  status: WagonStatus;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  icon: React.ReactNode;
};

// ──────────────────────────────────────────────
// Column configs
// ──────────────────────────────────────────────

const COLUMN_CONFIGS: ColumnConfig[] = [
  {
    status: "in_transit",
    headerBg: "bg-yellow-400",
    headerText: "text-yellow-900",
    badgeBg: "bg-yellow-200",
    badgeText: "text-yellow-900",
    borderColor: "border-yellow-300",
    icon: <Truck className="w-4 h-4" />,
  },
  {
    status: "at_border",
    headerBg: "bg-orange-500",
    headerText: "text-white",
    badgeBg: "bg-orange-200",
    badgeText: "text-orange-900",
    borderColor: "border-orange-300",
    icon: <Train className="w-4 h-4" />,
  },
  {
    status: "arrived",
    headerBg: "bg-emerald-500",
    headerText: "text-white",
    badgeBg: "bg-emerald-200",
    badgeText: "text-emerald-900",
    borderColor: "border-emerald-300",
    icon: <Train className="w-4 h-4" />,
  },
  {
    status: "unloaded",
    headerBg: "bg-blue-500",
    headerText: "text-white",
    badgeBg: "bg-blue-200",
    badgeText: "text-blue-900",
    borderColor: "border-blue-300",
    icon: <Truck className="w-4 h-4" />,
  },
];

// ──────────────────────────────────────────────
// Status label helper (outside component to avoid re-creation)
// ──────────────────────────────────────────────

function getStatusLabel(
  status: string,
  tStatus: Record<string, string>
): string {
  return tStatus[status] ?? status;
}

// ──────────────────────────────────────────────
// WagonCard component
// ──────────────────────────────────────────────

type WagonCardProps = {
  wagon: LogisticsWagon;
  config: ColumnConfig;
  statusLabels: Record<string, string>;
  onStatusChange: (id: number, status: WagonStatus) => Promise<void>;
  isPending: boolean;
};

function WagonCard({
  wagon,
  config,
  statusLabels,
  onStatusChange,
  isPending,
}: WagonCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localPending, setLocalPending] = useState(false);

  const currentStatus = (wagon.status ?? "in_transit") as WagonStatus;
  const nextStatus = NEXT_STATUS[currentStatus];

  async function handleNext() {
    if (!nextStatus || localPending) return;
    setLocalPending(true);
    await onStatusChange(wagon.id, nextStatus);
    setLocalPending(false);
  }

  async function handleDropdown(s: WagonStatus) {
    setDropdownOpen(false);
    if (s === currentStatus || localPending) return;
    setLocalPending(true);
    await onStatusChange(wagon.id, s);
    setLocalPending(false);
  }

  const cubic =
    wagon.totalCubicMeters != null
      ? Number(wagon.totalCubicMeters).toFixed(2)
      : "—";

  return (
    <div
      className={`bg-white rounded-xl border ${config.borderColor} shadow-sm p-4 space-y-3 transition-opacity ${
        localPending || isPending ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      {/* Top row: wagon number + cubic */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Train className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-bold text-slate-800 text-sm leading-tight">
            {wagon.wagonNumber}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
          {cubic} m³
        </span>
      </div>

      {/* Route */}
      {(wagon.fromLocation || wagon.toLocation) && (
        <p className="text-xs text-slate-500 leading-tight truncate">
          {wagon.fromLocation ?? "?"} → {wagon.toLocation ?? "?"}
        </p>
      )}

      {/* Notes */}
      {wagon.notes && (
        <p className="text-xs text-slate-400 italic leading-tight line-clamp-2">
          {wagon.notes}
        </p>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 pt-1">
        {/* Next stage button */}
        {nextStatus ? (
          <button
            onClick={handleNext}
            disabled={localPending || isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {getStatusLabel(nextStatus, statusLabels)}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="flex-1 text-center text-xs text-slate-400 italic py-1.5">
            Yakunlangan
          </span>
        )}

        {/* Dropdown: any status */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            disabled={localPending || isPending}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1.5 rounded-lg transition-colors border border-slate-200"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 bottom-full mb-1 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 min-w-[140px]">
                {STATUSES.map((s) => {
                  const col = COLUMN_CONFIGS.find((c) => c.status === s)!;
                  return (
                    <button
                      key={s}
                      onClick={() => handleDropdown(s)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                        s === currentStatus
                          ? "opacity-40 cursor-default"
                          : ""
                      }`}
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${col.headerBg}`}
                      />
                      {getStatusLabel(s, statusLabels)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// KanbanColumn component
// ──────────────────────────────────────────────

type KanbanColumnProps = {
  config: ColumnConfig;
  wagons: LogisticsWagon[];
  statusLabel: string;
  statusLabels: Record<string, string>;
  onStatusChange: (id: number, status: WagonStatus) => Promise<void>;
  isPending: boolean;
};

function KanbanColumn({
  config,
  wagons,
  statusLabel,
  statusLabels,
  onStatusChange,
  isPending,
}: KanbanColumnProps) {
  const totalCubic = wagons.reduce(
    (sum, w) => sum + (w.totalCubicMeters ? Number(w.totalCubicMeters) : 0),
    0
  );

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div
        className={`${config.headerBg} ${config.headerText} rounded-t-xl px-4 py-3 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="font-semibold text-sm">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {wagons.length > 0 && (
            <span className="text-xs text-slate-500">
              {totalCubic.toFixed(1)} m³
            </span>
          )}
          <span
            className={`${config.badgeBg} ${config.badgeText} text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center`}
          >
            {wagons.length}
          </span>
        </div>
      </div>

      {/* Cards area */}
      <div
        className={`flex-1 bg-slate-50 border-x border-b ${config.borderColor} rounded-b-xl p-3 space-y-3 min-h-[200px]`}
      >
        {wagons.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-slate-300 text-xs">
            —
          </div>
        ) : (
          wagons.map((wagon) => (
            <WagonCard
              key={wagon.id}
              wagon={wagon}
              config={config}
              statusLabels={statusLabels}
              onStatusChange={onStatusChange}
              isPending={isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function LogisticsPage() {
  const { t } = useI18n();
  const [wagonsData, setWagonsData] = useState<LogisticsWagon[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Build status labels map — combines purchases.status + unloaded
  const statusLabels: Record<string, string> = {
    in_transit: t.purchases.status.in_transit,
    at_border: t.purchases.status.at_border,
    arrived: t.purchases.status.arrived,
    distributed: t.purchases.status.distributed,
    unloaded: (t.purchases.status as Record<string, string>).unloaded ?? "Tushirildi",
  };

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const data = await getWagonsForLogistics();
      setWagonsData(data);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(id: number, status: WagonStatus) {
    // Optimistic update
    setWagonsData((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status } : w))
    );

    startTransition(async () => {
      try {
        await updateWagonStatus(id, status);
        // Refresh to get server state
        const fresh = await getWagonsForLogistics();
        setWagonsData(fresh);
      } catch {
        // Revert on error
        const fresh = await getWagonsForLogistics();
        setWagonsData(fresh);
      }
    });
  }

  // Group wagons by status
  function getColumnWagons(status: WagonStatus): LogisticsWagon[] {
    return wagonsData.filter((w) => (w.status ?? "in_transit") === status);
  }

  const totalWagons = wagonsData.length;
  const totalCubic = wagonsData.reduce(
    (sum, w) => sum + (w.totalCubicMeters ? Number(w.totalCubicMeters) : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {t.nav.logistics}
            </h1>
            {!fetching && (
              <p className="text-xs text-slate-400 mt-0.5">
                {totalWagons} vagon &middot; {totalCubic.toFixed(1)} m³ jami
              </p>
            )}
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={fetching}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors border border-slate-200 bg-white self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
          Yangilash
        </button>
      </div>

      {/* ── Loading state ── */}
      {fetching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMN_CONFIGS.map((col) => (
            <div key={col.status} className="animate-pulse">
              <div className={`${col.headerBg} opacity-50 rounded-t-xl h-12`} />
              <div className="bg-slate-100 rounded-b-xl h-40" />
            </div>
          ))}
        </div>
      ) : (
        /* ── Kanban board ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMN_CONFIGS.map((col) => (
            <KanbanColumn
              key={col.status}
              config={col}
              wagons={getColumnWagons(col.status)}
              statusLabel={statusLabels[col.status] ?? col.status}
              statusLabels={statusLabels}
              onStatusChange={handleStatusChange}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!fetching && wagonsData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Train className="w-12 h-12 opacity-30" />
          <p className="text-sm">{t.common.noData}</p>
        </div>
      )}
    </div>
  );
}
