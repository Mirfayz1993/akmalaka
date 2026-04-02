"use client";

type SaleWithCustomer = {
  id: number;
  docNumber: string | null;
  status: string;
  totalSentUsd: string | null;
  totalReceivedUsd: string | null;
  customer: { name: string } | null;
  sentAt: Date | string | null;
  items: Array<{
    id: number;
    sentCount: number | null;
    receivedCount: number | null;
    pricePerCubicUsd: string | null;
  }>;
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

function formatUsd(val: string | null): string {
  if (!val) return "—";
  const num = parseFloat(val);
  if (isNaN(num)) return "—";
  return "$" + num.toFixed(2);
}


export default function SaleTable({ sales, onReceive, onDelete }: SaleTableProps) {
  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500 text-sm">Savdolar topilmadi</p>
      </div>
    );
  }

  return (
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
          {sales.map((sale) => (
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
                {sale.status === "received"
                  ? formatUsd(sale.totalReceivedUsd)
                  : formatUsd(sale.totalSentUsd)}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
