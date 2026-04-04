"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePartnerBalance } from "@/lib/actions/partners";

type PartnerWithBalance = {
  id: number;
  name: string;
  type: string;
  phone: string | null;
  notes: string | null;
  balances: Array<{
    id: number;
    amount: string;
    currency: string | null;
    description: string | null;
    createdAt: Date | string | null;
    transport: { id: number; number: string | null; type: string } | null;
  }>;
  usdBalance?: number;
  rubBalance?: number;
};

interface PartnerDetailProps {
  partner: PartnerWithBalance | null;
  onPayment: () => void;
  onClose: () => void;
  onDelete: () => void;
}

const partnerTypeLabels: Record<string, string> = {
  russia_supplier: "Rossiya ta'minotchisi",
  code_supplier: "Kod ta'minotchisi",
  code_buyer: "Kod xaridor",
  wood_buyer: "Yog'och xaridor",
  service_provider: "Xizmat ko'rsatuvchi",
  truck_owner: "Yuk mashinasi egasi",
  personal: "Shaxsiy",
  exchanger: "Ayrboshlovchi",
  partner: "Hamkor",
};

function formatDate(val: Date | string | null): string {
  if (!val) return "—";
  try {
    const d = new Date(val);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  } catch {
    return "—";
  }
}

function balanceColorClass(balance: number): string {
  if (balance > 0) return "text-green-600";
  if (balance < 0) return "text-red-600";
  return "text-slate-500";
}

function amountColorClass(amount: string): string {
  const num = Number(amount);
  if (num > 0) return "text-green-600";
  if (num < 0) return "text-red-600";
  return "text-slate-500";
}

export default function PartnerDetail({
  partner,
  onPayment,
  onDelete,
}: PartnerDetailProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDeleteBalance(id: number) {
    setDeletingId(id);
    try {
      await deletePartnerBalance(id);
      startTransition(() => router.refresh());
    } finally {
      setDeletingId(null);
    }
  }

  if (!partner) {
    return (
      <div className="flex items-center justify-center h-full min-h-64 text-slate-400 text-sm">
        Hamkorni tanlang
      </div>
    );
  }

  const sortedBalances = [...partner.balances].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{partner.name}</h2>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            {partnerTypeLabels[partner.type] ?? partner.type}
          </span>
          {partner.phone && (
            <p className="text-sm text-slate-500 mt-1">{partner.phone}</p>
          )}
          {partner.notes && (
            <p className="text-sm text-slate-500 mt-1">{partner.notes}</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Joriy balans</p>
          <div className="flex flex-col items-end gap-0.5 mb-2">
            {(() => {
              const usd = partner.usdBalance ?? partner.balances.filter(b => b.currency === "usd").reduce((s, b) => s + Number(b.amount), 0);
              const rub = partner.rubBalance ?? partner.balances.filter(b => b.currency === "rub").reduce((s, b) => s + Number(b.amount), 0);
              return (
                <>
                  <span className={`text-xl font-bold ${balanceColorClass(usd)}`}>
                    {usd >= 0 ? "+" : ""}${Math.abs(usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-base font-semibold ${balanceColorClass(rub)}`}>
                    {rub >= 0 ? "+" : "−"}{Math.abs(rub).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
                  </span>
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPayment}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              To&apos;lov qilish
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hamkorni o'chirish"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Operations list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">
          Operatsiyalar
        </h3>

        {sortedBalances.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Operatsiyalar yo&apos;q
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {sortedBalances.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(b.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">
                      {b.description ?? "—"}
                    </span>
                    {b.transport?.number && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                        {b.transport.number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold whitespace-nowrap ${amountColorClass(b.amount)}`}>
                    {(() => {
                      const n = Number(b.amount);
                      const sign = n >= 0 ? "+" : "−";
                      const abs = Math.abs(n);
                      return b.currency === "rub"
                        ? `${sign}${abs.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`
                        : `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    })()}
                  </span>
                  <button
                    onClick={() => handleDeleteBalance(b.id)}
                    disabled={deletingId === b.id}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="O'chirish"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
