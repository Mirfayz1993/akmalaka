"use client";

import type { PartnerSoldCode } from "@/lib/actions/codes";

interface Props {
  codes: PartnerSoldCode[];
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}

type BatchRow = {
  key: string;
  date: Date | string | null;
  wagon: string;
  tonnage: number;
  kz: number;
  uz: number;
  afgon: number;
  total: number;
};

export default function CodeSalesTable({ codes }: Props) {
  if (codes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">Sotilgan kodlar yo'q</div>
    );
  }

  // Batch bo'yicha guruhlash (notes = "batchId|wagonNumber")
  const batchMap = new Map<string, PartnerSoldCode[]>();
  for (const code of codes) {
    const key = code.notes ?? `id-${code.id}`;
    if (!batchMap.has(key)) batchMap.set(key, []);
    batchMap.get(key)!.push(code);
  }

  const rows: BatchRow[] = Array.from(batchMap.entries()).map(([key, items]) => {
    const notesStr = items[0].notes ?? "";
    const wagon = notesStr.includes("|") ? notesStr.split("|")[1] : "—";
    const kzItem = items.find((c) => c.type === "kz");
    const uzItem = items.find((c) => c.type === "uz");
    const afgonItem = items.find((c) => c.type === "afgon");

    const kz = parseFloat(kzItem?.sellPriceUsd ?? "0");
    const uz = parseFloat(uzItem?.sellPriceUsd ?? "0");
    const afgon = parseFloat(afgonItem?.sellPriceUsd ?? "0");
    const tonnage = parseFloat(kzItem?.tonnage ?? uzItem?.tonnage ?? "0");

    return {
      key,
      date: items[0].usedAt,
      wagon: wagon !== "—" ? `#${wagon}` : "—",
      tonnage,
      kz,
      uz,
      afgon,
      total: kz + uz + afgon,
    };
  });

  const totalKz = rows.reduce((s, r) => s + r.kz, 0);
  const totalUz = rows.reduce((s, r) => s + r.uz, 0);
  const totalAfgon = rows.reduce((s, r) => s + r.afgon, 0);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs">№</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs">Sana</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs">Vagon</th>
            <th className="text-right py-2 px-3 font-semibold text-slate-600 text-xs">Tonnaj</th>
            <th className="text-right py-2 px-3 font-semibold text-blue-600 text-xs">KZ ($)</th>
            <th className="text-right py-2 px-3 font-semibold text-green-600 text-xs">UZ ($)</th>
            <th className="text-right py-2 px-3 font-semibold text-orange-500 text-xs">Avg'on ($)</th>
            <th className="text-right py-2 px-3 font-semibold text-slate-700 text-xs">Jami ($)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-2 px-3 text-slate-400 text-xs">{idx + 1}</td>
              <td className="py-2 px-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(row.date)}</td>
              <td className="py-2 px-3 font-mono text-xs text-slate-600">{row.wagon}</td>
              <td className="py-2 px-3 text-right text-slate-600 text-xs">{row.tonnage.toFixed(1)} t</td>
              <td className="py-2 px-3 text-right text-blue-700 font-medium text-xs">{fmt(row.kz)}</td>
              <td className="py-2 px-3 text-right text-green-700 font-medium text-xs">{fmt(row.uz)}</td>
              <td className="py-2 px-3 text-right text-orange-600 font-medium text-xs">{fmt(row.afgon)}</td>
              <td className="py-2 px-3 text-right text-slate-800 font-semibold text-xs">{fmt(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 border-t-2 border-slate-200">
            <td colSpan={4} className="py-2 px-3 text-xs font-semibold text-slate-600">Jami</td>
            <td className="py-2 px-3 text-right text-xs font-semibold text-blue-700">{fmt(totalKz)}</td>
            <td className="py-2 px-3 text-right text-xs font-semibold text-green-700">{fmt(totalUz)}</td>
            <td className="py-2 px-3 text-right text-xs font-semibold text-orange-600">{fmt(totalAfgon)}</td>
            <td className="py-2 px-3 text-right text-xs font-bold text-slate-800">{fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
