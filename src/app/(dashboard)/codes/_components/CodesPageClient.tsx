"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteCode,
  deleteSoldCodesBatch,
  type CodeWithSupplier,
  type CodeHistoryItem,
} from "@/lib/actions/codes";
import type { Partner } from "@/lib/actions/partners";
import CodeInventoryTable from "./CodeInventoryTable";
import CodeHistoryTable from "./CodeHistoryTable";
import CodeBuyModal from "./CodeBuyModal";
import CodeSellModal from "./CodeSellModal";

interface Props {
  initialInventory: CodeWithSupplier[];
  initialHistory: CodeHistoryItem[];
  partners: Partner[];
}

export default function CodesPageClient({
  initialInventory,
  initialHistory,
  partners,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const inventory = initialInventory;
  const history = initialHistory;
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [showInventory, setShowInventory] = useState(true);
  const [showSold, setShowSold] = useState(true);
  const [showUsed, setShowUsed] = useState(true);

  const soldCodes = history.filter((c) => c.status === "sold");
  const usedCodes = history.filter((c) => c.status === "used");

  async function handleDelete(id: number) {
    try {
      await deleteCode(id);
      toast.success("Kod o'chirildi");
      startTransition(() => { router.refresh(); });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  }

  async function handleDeleteSoldBatch(codeIds: number[]) {
    if (!confirm("Bu vagon sotuv yozuvini o'chirishni tasdiqlaysizmi? Hamkor balanslari avtomatik teskari yozuv bilan bekor qilinadi.")) return;
    try {
      await deleteSoldCodesBatch(codeIds);
      toast.success("Sotuv o'chirildi");
      startTransition(() => { router.refresh(); });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kodlar</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSellModalOpen(true)}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Sotish / Ishlatish
          </button>
          <button
            onClick={() => setIsBuyModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition-colors"
          >
            + Sotib olish
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Mavjud kodlar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700">
              Mavjud kodlar
              <span className="ml-2 text-sm font-normal text-slate-400">({inventory.length})</span>
            </h2>
            <button
              onClick={() => setShowInventory((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {showInventory ? <><ChevronUp size={13} /> Qisqartirish</> : <><ChevronDown size={13} /> Ko&apos;proq ko&apos;rsatish</>}
            </button>
          </div>
          {showInventory && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <CodeInventoryTable codes={inventory} onDelete={handleDelete} />
            </div>
          )}
        </section>

        {/* Sotilgan kodlar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700">
              Sotilgan kodlar
              <span className="ml-2 text-sm font-normal text-slate-400">({soldCodes.length})</span>
            </h2>
            <button
              onClick={() => setShowSold((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {showSold ? <><ChevronUp size={13} /> Qisqartirish</> : <><ChevronDown size={13} /> Ko&apos;proq ko&apos;rsatish</>}
            </button>
          </div>
          {showSold && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <CodeHistoryTable codes={soldCodes} mode="sold" onDelete={handleDeleteSoldBatch} />
            </div>
          )}
        </section>

        {/* O'z vagonimizga ishlatilgan kodlar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700">
              O&apos;z vagonimizga ishlatilgan kodlar
              <span className="ml-2 text-sm font-normal text-slate-400">({usedCodes.length})</span>
            </h2>
            <button
              onClick={() => setShowUsed((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {showUsed ? <><ChevronUp size={13} /> Qisqartirish</> : <><ChevronDown size={13} /> Ko&apos;proq ko&apos;rsatish</>}
            </button>
          </div>
          {showUsed && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <CodeHistoryTable codes={usedCodes} mode="used" />
            </div>
          )}
        </section>
      </div>

      <CodeBuyModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onSuccess={() => { setIsBuyModalOpen(false); startTransition(() => { router.refresh(); }); }}
        partners={partners}
      />
      <CodeSellModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onSuccess={() => { setIsSellModalOpen(false); startTransition(() => { router.refresh(); }); }}
        partners={partners}
        availableCodes={inventory}
      />
    </div>
  );
}
