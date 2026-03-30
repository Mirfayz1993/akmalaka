"use client";

import { useState, useEffect } from "react";
import {
  getUsdBalance,
  getRubState,
  getUsdOperations,
  getRubOperations,
  getExchangeHistory,
  recordUsdOperation,
  recordExchange,
  deleteCashOperation,
} from "@/lib/actions/cash";
import { getPartners } from "@/lib/actions/partners";
import type { Partner } from "@/lib/actions/partners";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import UsdTab from "./_components/UsdTab";
import RubTab from "./_components/RubTab";
import ExchangeTab from "./_components/ExchangeTab";

type TabType = "usd" | "rub" | "exchange";

type UsdOperation = {
  id: number;
  type: string;
  amount: string;
  partner: { name: string } | null;
  description: string | null;
  createdAt: Date | string | null;
};

type RubOperation = {
  id: number;
  type: string;
  amount: string;
  exchangeRate: string | null;
  partner: { name: string } | null;
  description: string | null;
  createdAt: Date | string | null;
};

type ExchangeItem = {
  id: number;
  amount: string;
  exchangeRate: string | null;
  partner: { name: string } | null;
  description: string | null;
  createdAt: Date | string | null;
};

export default function CashPage() {
  const [activeTab, setActiveTab] = useState<TabType>("usd");

  // Data state
  const [usdBalance, setUsdBalance] = useState(0);
  const [rubBalance, setRubBalance] = useState(0);
  const [avgRate, setAvgRate] = useState(0);
  const [usdOperations, setUsdOperations] = useState<UsdOperation[]>([]);
  const [rubOperations, setRubOperations] = useState<RubOperation[]>([]);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  // Modal state
  const [isUsdModalOpen, setIsUsdModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  // USD operation form
  const [usdForm, setUsdForm] = useState({
    type: "income" as "income" | "expense",
    amount: "",
    partnerId: "",
    description: "",
  });
  const [usdSubmitting, setUsdSubmitting] = useState(false);
  const [usdError, setUsdError] = useState("");

  // Exchange form
  const [exchForm, setExchForm] = useState({
    usdAmount: "",
    rubAmount: "",
    partnerId: "",
    description: "",
  });
  const [exchSubmitting, setExchSubmitting] = useState(false);
  const [exchError, setExchError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [usdBal, rubSt, usdOps, rubOps, exchHist, pts] = await Promise.all([
      getUsdBalance(),
      getRubState(),
      getUsdOperations(),
      getRubOperations(),
      getExchangeHistory(),
      getPartners(),
    ]);
    setUsdBalance(usdBal);
    setRubBalance(rubSt.rubBalance);
    setAvgRate(rubSt.avgRate);
    setUsdOperations(usdOps as UsdOperation[]);
    setRubOperations(rubOps as RubOperation[]);
    setExchangeHistory(exchHist as ExchangeItem[]);
    setPartners(pts);
  }

  // ─── USD Delete handler ───────────────────────────────────────────────────────

  async function handleDeleteUsd(id: number) {
    await deleteCashOperation(id);
    await loadData();
  }

  // ─── USD Modal handlers ──────────────────────────────────────────────────────

  function openUsdModal() {
    setUsdForm({ type: "income", amount: "", partnerId: "", description: "" });
    setUsdError("");
    setIsUsdModalOpen(true);
  }

  async function handleUsdSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsdError("");
    const amt = parseFloat(usdForm.amount);
    if (!usdForm.amount || isNaN(amt) || amt <= 0) {
      setUsdError("Musbat summa kiriting");
      return;
    }
    setUsdSubmitting(true);
    try {
      await recordUsdOperation({
        type: usdForm.type,
        amount: usdForm.type === "income" ? amt : amt,
        partnerId: usdForm.partnerId ? parseInt(usdForm.partnerId) : undefined,
        description: usdForm.description || undefined,
      });
      setIsUsdModalOpen(false);
      await loadData();
    } catch (err) {
      setUsdError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setUsdSubmitting(false);
    }
  }

  // ─── Exchange Modal handlers ─────────────────────────────────────────────────

  function openExchangeModal() {
    setExchForm({ usdAmount: "", rubAmount: "", partnerId: "", description: "" });
    setExchError("");
    setIsExchangeModalOpen(true);
  }

  const computedRate =
    exchForm.usdAmount && exchForm.rubAmount
      ? (parseFloat(exchForm.rubAmount) / parseFloat(exchForm.usdAmount)).toFixed(2)
      : "";

  async function handleExchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExchError("");
    const usd = parseFloat(exchForm.usdAmount);
    const rub = parseFloat(exchForm.rubAmount);
    if (!exchForm.usdAmount || isNaN(usd) || usd <= 0) {
      setExchError("$ miqdorini kiriting");
      return;
    }
    if (!exchForm.rubAmount || isNaN(rub) || rub <= 0) {
      setExchError("RUB miqdorini kiriting");
      return;
    }
    const rate = rub / usd;
    setExchSubmitting(true);
    try {
      await recordExchange({
        usdAmount: usd,
        rubAmount: rub,
        rate,
        partnerId: exchForm.partnerId ? parseInt(exchForm.partnerId) : undefined,
        description: exchForm.description || undefined,
      });
      setIsExchangeModalOpen(false);
      await loadData();
    } catch (err) {
      setExchError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setExchSubmitting(false);
    }
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "usd", label: "$ Kassasi" },
    { key: "rub", label: "RUB Kassasi" },
    { key: "exchange", label: "Pul Ayrboshlash" },
  ];

  return (
    <div className="p-6">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Kassa</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "usd" && (
        <UsdTab
          balance={usdBalance}
          operations={usdOperations}
          onAddOperation={openUsdModal}
          onDelete={handleDeleteUsd}
        />
      )}
      {activeTab === "rub" && (
        <RubTab
          rubBalance={rubBalance}
          avgRate={avgRate}
          operations={rubOperations}
          onAddExchange={openExchangeModal}
        />
      )}
      {activeTab === "exchange" && (
        <ExchangeTab
          exchanges={exchangeHistory}
          onAddExchange={openExchangeModal}
        />
      )}

      {/* ─── USD Operation Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isUsdModalOpen}
        onClose={() => setIsUsdModalOpen(false)}
        title="$ Operatsiya qo'shish"
        size="md"
      >
        <form onSubmit={handleUsdSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tur
            </label>
            <div className="flex gap-3">
              {(["income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUsdForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    usdForm.type === t
                      ? t === "income"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-red-50 border-red-500 text-red-700"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t === "income" ? "Kirim" : "Chiqim"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Summa ($)
            </label>
            <NumberInput
              min="0"
              step="0.01"
              value={usdForm.amount}
              onChange={(e) =>
                setUsdForm((f) => ({ ...f, amount: e.target.value }))
              }
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Partner */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hamkor (ixtiyoriy)
            </label>
            <select
              value={usdForm.partnerId}
              onChange={(e) =>
                setUsdForm((f) => ({ ...f, partnerId: e.target.value }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— Hamkor tanlang —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tavsif (ixtiyoriy)
            </label>
            <input
              type="text"
              value={usdForm.description}
              onChange={(e) =>
                setUsdForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Izoh..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {usdError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {usdError}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsUsdModalOpen(false)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={usdSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {usdSubmitting ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Exchange Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        title="Pul Ayrboshlash"
        size="md"
      >
        <form onSubmit={handleExchSubmit} className="space-y-4">
          {/* USD amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              $ miqdori (beriladigan)
            </label>
            <NumberInput
              min="0"
              step="0.01"
              value={exchForm.usdAmount}
              onChange={(e) =>
                setExchForm((f) => ({ ...f, usdAmount: e.target.value }))
              }
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* RUB amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              RUB miqdori (olinadigan)
            </label>
            <NumberInput
              min="0"
              step="0.01"
              value={exchForm.rubAmount}
              onChange={(e) =>
                setExchForm((f) => ({ ...f, rubAmount: e.target.value }))
              }
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Auto rate */}
          {computedRate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-700 font-medium">
                Avtomatik kurs: 1$ = {computedRate} RUB
              </p>
            </div>
          )}

          {/* Partner */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ayrboshlovchi (ixtiyoriy)
            </label>
            <select
              value={exchForm.partnerId}
              onChange={(e) =>
                setExchForm((f) => ({ ...f, partnerId: e.target.value }))
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— Hamkor tanlang —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tavsif (ixtiyoriy)
            </label>
            <input
              type="text"
              value={exchForm.description}
              onChange={(e) =>
                setExchForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Izoh..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {exchError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {exchError}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsExchangeModalOpen(false)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={exchSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {exchSubmitting ? "Saqlanmoqda..." : "Ayrboshlash"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
