"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";

type SaleItem = {
  id: number;
  thicknessMm: number | null;
  widthMm: number | null;
  lengthM: string | null;
  sentCount: number | null;
  receivedCount: number | null;
  pricePerCubicUsd: string | null;
};

type SaleWithCustomer = {
  id: number;
  docNumber: string | null;
  status: string;
  totalSentUsd: string | null;
  totalReceivedUsd: string | null;
  paidAmount: string | null;
  customer: { name: string } | null;
  sentAt: Date | string | null;
  items: SaleItem[];
};

interface SaleTableProps {
  sales: SaleWithCustomer[];
  onReceive: (id: number) => void;
  onDelete: (id: number) => void;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function calcCub(item: SaleItem, count: number | null): number {
  if (!item.thicknessMm || !item.widthMm || !item.lengthM || !count) return 0;
  return (item.thicknessMm / 1000) * (item.widthMm / 1000) * parseFloat(item.lengthM) * count;
}

function SaleDetailModal({ sale, onClose }: { sale: SaleWithCustomer; onClose: () => void }) {
  const totalSent = parseFloat(sale.totalSentUsd ?? "0");
  const totalReceived = parseFloat(sale.totalReceivedUsd ?? "0");
  const paid = parseFloat(sale.paidAmount ?? "0");
  const debt = (sale.status === "received" ? totalReceived : totalSent) - paid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Savdo #{sale.docNumber ?? sale.id}
            </h2>
            <p className="text-sm text-slate-500">{sale.customer?.name ?? "—"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Items jadvali */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600">O'lcham</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Jo'n. dona</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Jo'n. m³</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Qab. dona</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Qab. m³</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">$/m³</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Summa $</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => {
                  const sentCub = calcCub(item, item.sentCount);
                  const recCub = calcCub(item, item.receivedCount);
                  const price = parseFloat(item.pricePerCubicUsd ?? "0");
                  const rowTotal = recCub * price;
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2.5 font-medium text-slate-700">
                        {item.thicknessMm}×{item.widthMm}×{item.lengthM}m
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{item.sentCount ?? 0}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{sentCub.toFixed(3)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{item.receivedCount ?? 0}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{recCub.toFixed(3)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">${price}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-800">${rowTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Moliyaviy xulosa */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Jo'natildi jami</p>
              <p className="text-base font-bold text-slate-800">${totalSent.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 rounded-lg px-4 py-3 border border-green-200">
              <p className="text-xs text-slate-500 mb-1">Qabul qilindi</p>
              <p className="text-base font-bold text-green-700">${totalReceived.toFixed(2)}</p>
            </div>
            <div className={`rounded-lg px-4 py-3 border ${debt > 0.01 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
              <p className="text-xs text-slate-500 mb-1">Qarz (to'lanmagan)</p>
              <p className={`text-base font-bold ${debt > 0.01 ? "text-red-600" : "text-slate-500"}`}>
                ${debt.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SaleTable({ sales, onReceive, onDelete }: SaleTableProps) {
  const [viewSale, setViewSale] = useState<SaleWithCustomer | null>(null);

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500 text-sm">Savdolar topilmadi</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-700">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Mijoz</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Sana</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Jami $</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const displayAmount = sale.status === "received"
                ? parseFloat(sale.totalReceivedUsd ?? "0")
                : parseFloat(sale.totalSentUsd ?? "0");
              return (
                <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {sale.docNumber ? `#${sale.docNumber}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {sale.customer?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(sale.sentAt)}
                  </td>
                  <td className="px-4 py-3 text-green-700 font-semibold">
                    ${displayAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {sale.status === "sent" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {"Jo'natildi"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Qabul qilindi
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewSale(sale)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Batafsil"
                      >
                        <Eye size={15} />
                      </button>
                      {sale.status === "sent" && (
                        <button
                          onClick={() => onReceive(sale.id)}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Qabul
                        </button>
                      )}
                      {sale.status === "sent" && (
                        <button
                          onClick={() => onDelete(sale.id)}
                          className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {"O'chirish"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewSale && (
        <SaleDetailModal sale={viewSale} onClose={() => setViewSale(null)} />
      )}
    </>
  );
}
