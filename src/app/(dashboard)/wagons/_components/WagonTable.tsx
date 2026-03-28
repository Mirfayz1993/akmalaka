"use client";

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { t } from "@/i18n/uz";
import TimberTable from "./TimberTable";
import { updateTimber } from "@/lib/actions/timbers";

type TransportStatus = "in_transit" | "at_border" | "arrived" | "unloaded" | "closed";

interface Timber {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  russiaCount: number;
  tashkentCount: number | null;
  customerCount: number | null;
}

interface Transport {
  id: number;
  number: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  status: TransportStatus;
  timbers: Timber[];
}

interface WagonTableProps {
  transports: Transport[];
  onEdit: (transport: Transport) => void;
  onDelete: (transport: Transport) => void;
  onClose: (transport: Transport) => void;
}

const statusConfig: Record<
  TransportStatus,
  { label: string; className: string }
> = {
  in_transit: { label: t.wagons.in_transit, className: "bg-yellow-100 text-yellow-800" },
  at_border: { label: t.wagons.at_border, className: "bg-orange-100 text-orange-800" },
  arrived: { label: t.wagons.arrived, className: "bg-green-100 text-green-800" },
  unloaded: { label: t.wagons.unloaded, className: "bg-blue-100 text-blue-800" },
  closed: { label: t.wagons.closed, className: "bg-slate-100 text-slate-600" },
};

function calcCubRussia(timber: Timber): number {
  const t = timber.thicknessMm;
  const w = timber.widthMm;
  const l = parseFloat(timber.lengthM);
  const c = timber.russiaCount;
  return (t / 1000) * (w / 1000) * l * c;
}

export default function WagonTable({ transports, onEdit, onDelete, onClose }: WagonTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleTimberUpdate(id: number, data: { tashkentCount?: number; customerCount?: number }) {
    await updateTimber(id, data);
  }

  if (transports.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        {"Hozircha vagonlar yo'q"}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">
              #
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.wagons.wagonNumber}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.wagons.from} → {t.wagons.to}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.wagons.totalCubRussia}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.wagons.status}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.wagons.timbersCount}
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.wagons.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {transports.map((transport, idx) => {
            const isExpanded = expandedId === transport.id;
            const isClosed = transport.status === "closed";
            const totalCubRussia = transport.timbers.reduce(
              (sum, timber) => sum + calcCubRussia(timber),
              0
            );
            const statusInfo = statusConfig[transport.status] ?? {
              label: transport.status,
              className: "bg-slate-100 text-slate-600",
            };

            return (
              <>
                <tr
                  key={transport.id}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(transport.id)}
                >
                  <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={14} className="text-slate-400" />
                      )}
                      {transport.number ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {transport.fromLocation ?? "—"} → {transport.toLocation ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {totalCubRussia.toFixed(3)} m³
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{transport.timbers.length}</td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isClosed && (
                        <>
                          <button
                            onClick={() => onEdit(transport)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t.common.edit}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(transport)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t.common.delete}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => onClose(transport)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t.wagons.close}
                          >
                            <Lock size={14} />
                          </button>
                        </>
                      )}
                      {isClosed && (
                        <span className="text-xs text-slate-400">{t.wagons.closed}</span>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Accordion: Timber qatorlar */}
                {isExpanded && (
                  <tr key={`${transport.id}-expanded`}>
                    <td colSpan={7} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <TimberTable
                        timbers={transport.timbers}
                        onUpdate={handleTimberUpdate}
                      />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
