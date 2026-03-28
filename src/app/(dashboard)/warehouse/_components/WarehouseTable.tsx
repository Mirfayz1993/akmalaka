"use client";

type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string | number;
  quantity: number;
  transport: { number: string | null } | null;
  createdAt: Date | string | null;
};

interface WarehouseTableProps {
  items: WarehouseItem[];
}

export default function WarehouseTable({ items }: WarehouseTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Ombor bo&apos;sh
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
              O&apos;lcham
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Soni
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Vagon
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Kirgan sana
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-800">
                {item.thicknessMm}×{item.widthMm}×{item.lengthM}m
              </td>
              <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
              <td className="px-4 py-3 text-slate-600">
                {item.transport?.number ?? "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString("uz-UZ", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
