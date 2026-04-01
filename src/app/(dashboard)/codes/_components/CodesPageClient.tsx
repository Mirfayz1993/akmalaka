"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCode,
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
  const [inventory] = useState(initialInventory);
  const [history] = useState(initialHistory);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  async function handleDelete(id: number) {
    try {
      await deleteCode(id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
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
            Sotish
          </button>
          <button
            onClick={() => setIsBuyModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition-colors"
          >
            + Sotib olish
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            Mavjud kodlar
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({inventory.length})
            </span>
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <CodeInventoryTable codes={inventory} onDelete={handleDelete} />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            Tarix
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({history.length})
            </span>
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <CodeHistoryTable codes={history} />
          </div>
        </section>
      </div>

      <CodeBuyModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onSuccess={() => { setIsBuyModalOpen(false); router.refresh(); }}
        partners={partners}
      />
      <CodeSellModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onSuccess={() => { setIsSellModalOpen(false); router.refresh(); }}
        partners={partners}
        availableCodes={inventory}
      />
    </div>
  );
}
