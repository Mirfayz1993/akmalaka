"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { CodeWithSupplier } from "@/lib/actions/codes";

interface CodeInventoryTableProps {
  codes: CodeWithSupplier[];
  onDelete: (id: number) => void;
}

const typeBadgeClasses: Record<string, string> = {
  kz: "bg-blue-100 text-blue-800",
  uz: "bg-green-100 text-green-800",
  afgon: "bg-orange-100 text-orange-800",
};

const typeLabels: Record<string, string> = {
  kz: "KZ",
  uz: "UZ",
  afgon: "Avg'on",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function CodeInventoryTable({ codes, onDelete }: CodeInventoryTableProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const supplierMap = new Map<number, string>();
  for (const c of codes) {
    if (c.supplier?.id != null) supplierMap.set(c.supplier.id, c.supplier.name ?? "—");
  }
  const suppliers = Array.from(supplierMap.entries()).map(([id, name]) => ({ id, name }));

  const filtered = codes.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (supplierFilter !== "all" && String(c.supplier?.id) !== supplierFilter) return false;
    return true;
  });

  const selectClass = "border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      {/* Filtrlar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
          <option value="all">— Barcha turlar —</option>
          <option value="kz">KZ</option>
          <option value="uz">UZ</option>
          <option value="afgon">Avg'on</option>
        </select>
        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className={selectClass}>
          <option value="all">— Barcha ta'minotchilar —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={String(s.id)}>{String(s.name)}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} ta kod</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">Kodlar topilmadi</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600 w-12">#</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Tur</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Ta'minotchi</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Yaratilgan sana</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((code, index) => (
                <tr key={code.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-500">{index + 1}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClasses[code.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {typeLabels[code.type] ?? code.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{code.supplier?.name ?? "—"}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(code.createdAt)}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onDelete(code.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
