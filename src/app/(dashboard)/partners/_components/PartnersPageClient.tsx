"use client";

import { useState } from "react";
import { getPartners, getPartnerWithBalance } from "@/lib/actions/partners";
import type { Partner } from "@/lib/actions/partners";
import PartnerModal from "./PartnerModal";
import PartnerDetail from "./PartnerDetail";
import PaymentModal from "./PaymentModal";

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
  currentBalance: number;
};

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

export default function PartnersPageClient({ initialPartners }: { initialPartners: Partner[] }) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithBalance | null>(null);
  const [filter, setFilter] = useState<Partner["type"] | "all">("all");
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  async function loadData() {
    const pts = await getPartners();
    setPartners(pts);
  }

  async function handleSelectPartner(id: number) {
    const detail = await getPartnerWithBalance(id);
    setSelectedPartner(detail ?? null);
  }

  async function handleSuccess() {
    await loadData();
    if (selectedPartner) {
      const detail = await getPartnerWithBalance(selectedPartner.id);
      setSelectedPartner(detail ?? null);
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
                  onClick={() => handleSelectPartner(p.id)}
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
          <PartnerDetail
            partner={selectedPartner}
            onPayment={() => setIsPaymentModalOpen(true)}
            onClose={() => setSelectedPartner(null)}
          />
        </div>
      </div>

      <PartnerModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onSuccess={async () => {
          setIsPartnerModalOpen(false);
          await loadData();
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={async () => {
          setIsPaymentModalOpen(false);
          await handleSuccess();
        }}
        partner={
          selectedPartner ? { id: selectedPartner.id, name: selectedPartner.name } : null
        }
      />
    </div>
  );
}
