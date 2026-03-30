"use client";

import { useState, useEffect } from "react";
import {
  getCodeInventory,
  getCodeHistory,
  deleteCode,
  type CodeWithSupplier,
  type CodeHistoryItem,
} from "@/lib/actions/codes";
import { getPartners } from "@/lib/actions/partners";
import type { Partner } from "@/lib/actions/partners";
import CodeInventoryTable from "./_components/CodeInventoryTable";
import CodeHistoryTable from "./_components/CodeHistoryTable";
import CodeBuyModal from "./_components/CodeBuyModal";
import CodeSellModal from "./_components/CodeSellModal";

export default function CodesPage() {
  const [inventory, setInventory] = useState<CodeWithSupplier[]>([]);
  const [history, setHistory] = useState<CodeHistoryItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [inv, hist, pts] = await Promise.all([
        getCodeInventory(),
        getCodeHistory(),
        getPartners(),
      ]);
      setInventory(inv);
      setHistory(hist);
      setPartners(pts);
    } catch (err) {
      console.error("Ma'lumot yuklanmadi:", err);
      alert("Ma'lumot yuklanmadi. Qayta urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  }

  // Faqat kodlar ro'yxatini yangilash (partnerlar o'zgarmaydi)
  async function refreshCodes() {
    try {
      const [inv, hist] = await Promise.all([
        getCodeInventory(),
        getCodeHistory(),
      ]);
      setInventory(inv);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCode(id);
      await refreshCodes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div className="p-6">
      {/* Sarlavha */}
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

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Yuklanmoqda...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Mavjud kodlar */}
          <section>
            <h2 className="text-base font-semibold text-slate-700 mb-3">
              Mavjud kodlar
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({inventory.length})
              </span>
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <CodeInventoryTable
                codes={inventory}
                onDelete={handleDelete}
              />
            </div>
          </section>

          {/* Tarix */}
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
      )}

      {/* Modals */}
      <CodeBuyModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onSuccess={refreshCodes}
        partners={partners}
      />
      <CodeSellModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onSuccess={refreshCodes}
        partners={partners}
        availableCodes={inventory}
      />
    </div>
  );
}
