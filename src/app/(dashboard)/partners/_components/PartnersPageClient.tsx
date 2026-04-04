"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { getAllPartnersWithBalances, deletePartner, deletePartnerBalance } from "@/lib/actions/partners";
import type { Partner } from "@/lib/actions/partners";
import PartnerModal from "./PartnerModal";
import PaymentModal from "./PaymentModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type PartnerWithBalance = Awaited<ReturnType<typeof getAllPartnersWithBalances>>[number];

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

const ALL_TYPES = Object.keys(partnerTypeLabels) as Partner["type"][];

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
  } catch { return "—"; }
}

function fmtAmt(amount: string, currency: string | null) {
  const n = Number(amount);
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  return currency === "rub"
    ? `${sign}${abs.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`
    : `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PartnersPageClient({
  initialPartnersWithBalances,
}: {
  initialPartnersWithBalances: PartnerWithBalance[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const partners = initialPartnersWithBalances;

  const [selectedType, setSelectedType] = useState<Partner["type"] | "all">("all");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PartnerWithBalance | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [deletingBalanceId, setDeletingBalanceId] = useState<number | null>(null);

  const filteredByType = selectedType === "all" ? partners : partners.filter((p) => p.type === selectedType);
  const selectedPartner = filteredByType.find((p) => String(p.id) === selectedPartnerId) ?? null;

  function handleSuccess() {
    setSelectedPartnerId("");
    startTransition(() => router.refresh());
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    try {
      await deletePartner(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedPartnerId("");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
    } finally {
      setIsDeleteLoading(false);
    }
  }

  async function handleDeleteBalance(id: number) {
    setDeletingBalanceId(id);
    try {
      await deletePartnerBalance(id);
      startTransition(() => router.refresh());
    } finally {
      setDeletingBalanceId(null);
    }
  }

  // Group code entries by description+currency
  type BalanceItem = PartnerWithBalance["balances"][number];
  type GroupedBalance = {
    key: string;
    ids: number[];
    totalAmount: number;
    currency: string | null;
    description: string | null;
    createdAt: BalanceItem["createdAt"];
    transport: BalanceItem["transport"];
  };

  function groupBalances(balances: BalanceItem[]): GroupedBalance[] {
    const sorted = [...balances].sort((a, b) => b.id - a.id);
    const isCodeEntry = (desc: string | null) =>
      desc?.startsWith("Kod sotuvi") || desc?.startsWith("Kod xarajati");

    const result: GroupedBalance[] = [];
    const groupMap = new Map<string, GroupedBalance>();

    for (const b of sorted) {
      if (isCodeEntry(b.description)) {
        const key = `${b.description}__${b.currency}`;
        if (!groupMap.has(key)) {
          const g: GroupedBalance = { key, ids: [], totalAmount: 0, currency: b.currency, description: b.description, createdAt: b.createdAt, transport: b.transport };
          groupMap.set(key, g);
          result.push(g);
        }
        const g = groupMap.get(key)!;
        g.ids.push(b.id);
        g.totalAmount += Number(b.amount);
      } else {
        result.push({ key: String(b.id), ids: [b.id], totalAmount: Number(b.amount), currency: b.currency, description: b.description, createdAt: b.createdAt, transport: b.transport });
      }
    }
    return result;
  }

  const balanceGroups = selectedPartner ? groupBalances(selectedPartner.balances) : [];
  const incomes = balanceGroups.filter((g) => g.totalAmount > 0);
  const expenses = balanceGroups.filter((g) => g.totalAmount < 0);

  const usd = selectedPartner?.usdBalance ?? 0;
  const rub = selectedPartner?.rubBalance ?? 0;

  return (
    <div className="p-6 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Hamkorlar</h1>
        <button
          onClick={() => setIsPartnerModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Yangi hamkor
        </button>
      </div>

      {/* Dropdowns + balance + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value as Partner["type"] | "all"); setSelectedPartnerId(""); }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="all">— Barcha turlar —</option>
          {ALL_TYPES.map((t) => <option key={t} value={t}>{partnerTypeLabels[t]}</option>)}
        </select>

        <select
          value={selectedPartnerId}
          onChange={(e) => setSelectedPartnerId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-48"
        >
          <option value="">— Hamkor tanlang —</option>
          {filteredByType.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {selectedPartner && (
          <>
            <div className="flex items-center gap-3 ml-2">
              <span className={`text-base font-bold ${usd > 0 ? "text-green-600" : usd < 0 ? "text-red-600" : "text-slate-500"}`}>
                {usd >= 0 ? "+" : ""}${Math.abs(usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-semibold ${rub > 0 ? "text-green-600" : rub < 0 ? "text-red-600" : "text-slate-500"}`}>
                {rub >= 0 ? "+" : "−"}{Math.abs(rub).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
              </span>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              To&apos;lov qilish
            </button>
            <button
              onClick={() => setDeleteTarget(selectedPartner)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hamkorni o'chirish"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      {/* Two panels */}
      {selectedPartner ? (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Daromadlar */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-green-700">Daromadlar ({incomes.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {incomes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Daromadlar yo&apos;q</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {incomes.map((g) => (
                    <div key={g.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-400 text-xs whitespace-nowrap">{formatDate(g.createdAt)}</span>
                        <span className="text-slate-600 truncate">{g.description ?? "—"}</span>
                        {g.transport?.number && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono shrink-0">{g.transport.number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-semibold text-green-600 whitespace-nowrap">{fmtAmt(String(g.totalAmount), g.currency)}</span>
                        <button
                          onClick={async () => { setDeletingBalanceId(g.ids[0]); try { for (const id of g.ids) await handleDeleteBalance(id); } finally { setDeletingBalanceId(null); } }}
                          disabled={g.ids.some((id) => deletingBalanceId === id)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
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

          {/* Xarajatlar */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-red-700">Xarajatlar ({expenses.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {expenses.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Xarajatlar yo&apos;q</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {expenses.map((g) => (
                    <div key={g.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-400 text-xs whitespace-nowrap">{formatDate(g.createdAt)}</span>
                        <span className="text-slate-600 truncate">{g.description ?? "—"}</span>
                        {g.transport?.number && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono shrink-0">{g.transport.number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-semibold text-red-600 whitespace-nowrap">{fmtAmt(String(g.totalAmount), g.currency)}</span>
                        <button
                          onClick={async () => { setDeletingBalanceId(g.ids[0]); try { for (const id of g.ids) await handleDeleteBalance(id); } finally { setDeletingBalanceId(null); } }}
                          disabled={g.ids.some((id) => deletingBalanceId === id)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
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
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm">
          Hamkorni tanlang
        </div>
      )}

      <PartnerModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onSuccess={() => { setIsPartnerModalOpen(false); handleSuccess(); }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hamkorni o'chirish"
        message={`"${deleteTarget?.name}" hamkorini o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.`}
        confirmText="O'chirish"
        isLoading={isDeleteLoading}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => { setIsPaymentModalOpen(false); handleSuccess(); }}
        partner={selectedPartner ? { id: selectedPartner.id, name: selectedPartner.name } : null}
      />
    </div>
  );
}
