"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAllPartnersWithBalances, deletePartner } from "@/lib/actions/partners";
import type { Partner } from "@/lib/actions/partners";
import PartnerModal from "./PartnerModal";
import PartnerDetail from "./PartnerDetail";
import PaymentModal from "./PaymentModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type PartnerWithBalance = Awaited<ReturnType<typeof getAllPartnersWithBalances>>[number];

// ─── Jami statistika komponenti ───────────────────────────────────────────────
function AllPartnersSummary({ partners }: { partners: PartnerWithBalance[] }) {
  const allOps = partners
    .flatMap((p) => p.balances.map((b) => ({ ...b, partnerName: p.name, partnerType: p.type })))
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  // USD hisobi
  const usdOurDebt = partners.reduce((s, p) => s + (p.usdBalance < 0 ? Math.abs(p.usdBalance) : 0), 0);
  const usdTheirDebt = partners.reduce((s, p) => s + (p.usdBalance > 0 ? p.usdBalance : 0), 0);
  const usdNet = usdTheirDebt - usdOurDebt;

  // RUB hisobi
  const rubOurDebt = partners.reduce((s, p) => s + (p.rubBalance < 0 ? Math.abs(p.rubBalance) : 0), 0);
  const rubTheirDebt = partners.reduce((s, p) => s + (p.rubBalance > 0 ? p.rubBalance : 0), 0);
  const rubNet = rubTheirDebt - rubOurDebt;

  function fmtUsd(n: number) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  function fmtRub(n: number) {
    return `${n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₽`;
  }
  function fmtAmt(amount: string, currency: string | null) {
    const n = Number(amount);
    const abs = Math.abs(n);
    const sign = n >= 0 ? "+" : "−";
    return currency === "rub"
      ? `${sign}${fmtRub(abs)}`
      : `${sign}${fmtUsd(abs)}`;
  }
  function fmtDate(d: Date | string | null) {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("uz-UZ") + " " + dt.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-5">
      {/* USD kartalar */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Dollar (USD)</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Bizning qarzimiz</p>
            <p className="text-lg font-bold text-red-600">−{fmtUsd(usdOurDebt)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Bizdan qarzdorlar</p>
            <p className="text-lg font-bold text-green-600">+{fmtUsd(usdTheirDebt)}</p>
          </div>
          <div className={`border rounded-xl p-3 ${usdNet >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
            <p className="text-xs text-slate-500 mb-1">Sof balans</p>
            <p className={`text-lg font-bold ${usdNet >= 0 ? "text-blue-600" : "text-orange-600"}`}>
              {usdNet >= 0 ? "+" : "−"}{fmtUsd(Math.abs(usdNet))}
            </p>
          </div>
        </div>
      </div>

      {/* RUB kartalar */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Rubl (RUB)</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Bizning qarzimiz</p>
            <p className="text-lg font-bold text-red-600">−{fmtRub(rubOurDebt)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Bizdan qarzdorlar</p>
            <p className="text-lg font-bold text-green-600">+{fmtRub(rubTheirDebt)}</p>
          </div>
          <div className={`border rounded-xl p-3 ${rubNet >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
            <p className="text-xs text-slate-500 mb-1">Sof balans</p>
            <p className={`text-lg font-bold ${rubNet >= 0 ? "text-blue-600" : "text-orange-600"}`}>
              {rubNet >= 0 ? "+" : "−"}{fmtRub(Math.abs(rubNet))}
            </p>
          </div>
        </div>
      </div>

      {/* Barcha operatsiyalar */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Barcha operatsiyalar
          <span className="ml-2 text-xs font-normal text-slate-400">({allOps.length} ta)</span>
        </h3>
        {allOps.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Operatsiyalar yo&apos;q</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Sana</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Hamkor</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Tavsif</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Summa</th>
                </tr>
              </thead>
              <tbody>
                {allOps.map((op) => {
                  const amt = Number(op.amount);
                  return (
                    <tr key={op.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(op.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-700">{op.partnerName}</p>
                        <p className="text-xs text-slate-400">{partnerTypeLabels[op.partnerType] ?? op.partnerType}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {op.description ?? "—"}
                        {op.transport?.number && (
                          <span className="ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">#{op.transport.number}</span>
                        )}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${amt >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmtAmt(op.amount, op.currency ?? null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
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

const ALL_TYPES = Object.keys(partnerTypeLabels) as Partner["type"][];

export default function PartnersPageClient({
  initialPartnersWithBalances,
}: {
  initialPartnersWithBalances: PartnerWithBalance[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const partners = initialPartnersWithBalances;
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithBalance | null>(null);
  const [filter, setFilter] = useState<Partner["type"] | "all">("all");
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PartnerWithBalance | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  function handleSelectPartner(partner: PartnerWithBalance) {
    setSelectedPartner(partner);
  }

  function handleSuccess() {
    setSelectedPartner(null);
    startTransition(() => { router.refresh(); });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    try {
      await deletePartner(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedPartner(null);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
    } finally {
      setIsDeleteLoading(false);
    }
  }

  const filteredPartners =
    filter === "all" ? partners : partners.filter((p) => p.type === filter);

  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Hamkorlar</h1>
        <button
          onClick={() => setIsPartnerModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          + Yangi hamkor
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-1/3 flex flex-col gap-3 min-h-0">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Hammasi
            </button>
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filter === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {partnerTypeLabels[t]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
            {filteredPartners.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Hamkorlar yo&apos;q</p>
            ) : (
              filteredPartners.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPartner(p)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                    selectedPartner?.id === p.id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {partnerTypeLabels[p.type] ?? p.type}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 overflow-y-auto">
          {!selectedPartner && filter === "all" ? (
            <AllPartnersSummary partners={partners} />
          ) : (
            <PartnerDetail
              partner={selectedPartner}
              onPayment={() => setIsPaymentModalOpen(true)}
              onClose={() => setSelectedPartner(null)}
              onDelete={() => selectedPartner && setDeleteTarget(selectedPartner)}
            />
          )}
        </div>
      </div>

      <PartnerModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onSuccess={() => {
          setIsPartnerModalOpen(false);
          handleSuccess();
        }}
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
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          handleSuccess();
        }}
        partner={
          selectedPartner ? { id: selectedPartner.id, name: selectedPartner.name } : null
        }
      />
    </div>
  );
}
