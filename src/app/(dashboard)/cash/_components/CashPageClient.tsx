"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordUsdOperation, recordRubOperation,
  recordExchange, deleteCashOperation,
  getUsdOperations, getRubOperations, getExchangeHistory,
} from "@/lib/actions/cash";
import { type Partner } from "@/lib/actions/partners";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import UsdTab from "./UsdTab";
import RubTab from "./RubTab";
import ExchangeTab from "./ExchangeTab";

type TabType = "usd" | "rub" | "exchange";
type UsdOperation = Awaited<ReturnType<typeof getUsdOperations>>[number];
type RubOperation = Awaited<ReturnType<typeof getRubOperations>>[number];
type ExchangeItem = Awaited<ReturnType<typeof getExchangeHistory>>[number];

interface Props {
  initialUsdBalance: number;
  initialRubBalance: number;
  initialAvgRate: number;
  initialUsdOps: UsdOperation[];
  initialRubOps: RubOperation[];
  initialExchanges: ExchangeItem[];
  partners: Partner[];
}

export default function CashPageClient({
  initialUsdBalance, initialRubBalance, initialAvgRate,
  initialUsdOps, initialRubOps, initialExchanges, partners,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabType>("usd");
  const usdBalance = initialUsdBalance;
  const rubBalance = initialRubBalance;
  const avgRate = initialAvgRate;
  const usdOperations = initialUsdOps;
  const rubOperations = initialRubOps;
  const exchangeHistory = initialExchanges;

  const [isUsdModalOpen, setIsUsdModalOpen] = useState(false);
  const [isRubModalOpen, setIsRubModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  const [usdForm, setUsdForm] = useState({ type: "income" as "income" | "expense", amount: "", partnerId: "", description: "" });
  const [usdSubmitting, setUsdSubmitting] = useState(false);
  const [usdError, setUsdError] = useState("");

  const [rubForm, setRubForm] = useState({ type: "income" as "income" | "expense", amount: "", partnerId: "", description: "" });
  const [rubSubmitting, setRubSubmitting] = useState(false);
  const [rubError, setRubError] = useState("");

  const [exchForm, setExchForm] = useState({ usdAmount: "", rubAmount: "", partnerId: "", description: "" });
  const [exchSubmitting, setExchSubmitting] = useState(false);
  const [exchError, setExchError] = useState("");

  async function handleDeleteUsd(id: number) { await deleteCashOperation(id); startTransition(() => { router.refresh(); }); }
  async function handleDeleteRub(id: number) { await deleteCashOperation(id); startTransition(() => { router.refresh(); }); }

  function openUsdModal() { setUsdForm({ type: "income", amount: "", partnerId: "", description: "" }); setUsdError(""); setIsUsdModalOpen(true); }
  function openRubModal() { setRubForm({ type: "income", amount: "", partnerId: "", description: "" }); setRubError(""); setIsRubModalOpen(true); }
  function openExchangeModal() { setExchForm({ usdAmount: "", rubAmount: "", partnerId: "", description: "" }); setExchError(""); setIsExchangeModalOpen(true); }

  async function handleUsdSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsdError("");
    if (!usdForm.partnerId) { setUsdError("Hamkor tanlash majburiy"); return; }
    const amt = parseFloat(usdForm.amount);
    if (!usdForm.amount || isNaN(amt) || amt <= 0) { setUsdError("Musbat summa kiriting"); return; }
    setUsdSubmitting(true);
    try {
      await recordUsdOperation({ type: usdForm.type, amount: amt, partnerId: parseInt(usdForm.partnerId), description: usdForm.description || undefined });
      setIsUsdModalOpen(false);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setUsdError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally { setUsdSubmitting(false); }
  }

  async function handleRubSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRubError("");
    if (!rubForm.partnerId) { setRubError("Hamkor tanlash majburiy"); return; }
    const amt = parseFloat(rubForm.amount);
    if (!rubForm.amount || isNaN(amt) || amt <= 0) { setRubError("Musbat summa kiriting"); return; }
    setRubSubmitting(true);
    try {
      await recordRubOperation({ type: rubForm.type, amount: amt, partnerId: parseInt(rubForm.partnerId), description: rubForm.description || undefined });
      setIsRubModalOpen(false);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setRubError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally { setRubSubmitting(false); }
  }

  const computedRate = exchForm.usdAmount && exchForm.rubAmount
    ? (parseFloat(exchForm.rubAmount) / parseFloat(exchForm.usdAmount)).toFixed(2) : "";

  async function handleExchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExchError("");
    const usd = parseFloat(exchForm.usdAmount);
    const rub = parseFloat(exchForm.rubAmount);
    if (!exchForm.partnerId) { setExchError("Hamkor tanlash majburiy"); return; }
    if (!exchForm.usdAmount || isNaN(usd) || usd <= 0) { setExchError("$ miqdorini kiriting"); return; }
    if (!exchForm.rubAmount || isNaN(rub) || rub <= 0) { setExchError("RUB miqdorini kiriting"); return; }
    setExchSubmitting(true);
    try {
      await recordExchange({ usdAmount: usd, rubAmount: rub, rate: rub / usd, partnerId: parseInt(exchForm.partnerId), description: exchForm.description || undefined });
      setIsExchangeModalOpen(false);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setExchError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally { setExchSubmitting(false); }
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "usd", label: "$ Kassasi" },
    { key: "rub", label: "RUB Kassasi" },
    { key: "exchange", label: "Pul Ayrboshlash" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Kassa</h1>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "usd" && <UsdTab balance={usdBalance} operations={usdOperations} onAddOperation={openUsdModal} onDelete={handleDeleteUsd} />}
      {activeTab === "rub" && <RubTab rubBalance={rubBalance} avgRate={avgRate} operations={rubOperations} onAddOperation={openRubModal} onAddExchange={openExchangeModal} onDelete={handleDeleteRub} />}
      {activeTab === "exchange" && <ExchangeTab exchanges={exchangeHistory} onAddExchange={openExchangeModal} />}

      {/* USD Modal */}
      <Modal isOpen={isUsdModalOpen} onClose={() => setIsUsdModalOpen(false)} title="$ Operatsiya qo'shish" size="md">
        <form onSubmit={handleUsdSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tur</label>
            <div className="flex gap-3">
              {(["income", "expense"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setUsdForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${usdForm.type === t ? t === "income" ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {t === "income" ? "Kirim" : "Chiqim"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Summa ($)</label>
            <NumberInput min="0" step="0.01" value={usdForm.amount} onChange={(e) => setUsdForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hamkor</label>
            <select value={usdForm.partnerId} onChange={(e) => setUsdForm((f) => ({ ...f, partnerId: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">— Hamkor tanlang —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tavsif (ixtiyoriy)</label>
            <input type="text" value={usdForm.description} onChange={(e) => setUsdForm((f) => ({ ...f, description: e.target.value }))} placeholder="Izoh..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          {usdError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{usdError}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setIsUsdModalOpen(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">Bekor qilish</button>
            <button type="submit" disabled={usdSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{usdSubmitting ? "Saqlanmoqda..." : "Saqlash"}</button>
          </div>
        </form>
      </Modal>

      {/* RUB Modal */}
      <Modal isOpen={isRubModalOpen} onClose={() => setIsRubModalOpen(false)} title="₽ Operatsiya qo'shish" size="md">
        <form onSubmit={handleRubSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tur</label>
            <div className="flex gap-3">
              {(["income", "expense"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setRubForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${rubForm.type === t ? t === "income" ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {t === "income" ? "Kirim" : "Chiqim"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Summa (₽)</label>
            <NumberInput min="0" step="0.01" value={rubForm.amount} onChange={(e) => setRubForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hamkor</label>
            <select value={rubForm.partnerId} onChange={(e) => setRubForm((f) => ({ ...f, partnerId: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">— Hamkor tanlang —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tavsif (ixtiyoriy)</label>
            <input type="text" value={rubForm.description} onChange={(e) => setRubForm((f) => ({ ...f, description: e.target.value }))} placeholder="Izoh..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          {rubError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{rubError}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setIsRubModalOpen(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">Bekor qilish</button>
            <button type="submit" disabled={rubSubmitting} className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">{rubSubmitting ? "Saqlanmoqda..." : "Saqlash"}</button>
          </div>
        </form>
      </Modal>

      {/* Exchange Modal */}
      <Modal isOpen={isExchangeModalOpen} onClose={() => setIsExchangeModalOpen(false)} title="Pul Ayrboshlash" size="md">
        <form onSubmit={handleExchSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">$ miqdori (beriladigan)</label>
            <NumberInput min="0" step="0.01" value={exchForm.usdAmount} onChange={(e) => setExchForm((f) => ({ ...f, usdAmount: e.target.value }))} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RUB miqdori (olinadigan)</label>
            <NumberInput min="0" step="0.01" value={exchForm.rubAmount} onChange={(e) => setExchForm((f) => ({ ...f, rubAmount: e.target.value }))} placeholder="0.00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          {computedRate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-700 font-medium">Avtomatik kurs: 1$ = {computedRate} RUB</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ayrboshlovchi (Hamkor)</label>
            <select value={exchForm.partnerId} onChange={(e) => setExchForm((f) => ({ ...f, partnerId: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">— Hamkor tanlang —</option>
              {partners.filter((p) => p.type === "exchanger").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tavsif (ixtiyoriy)</label>
            <input type="text" value={exchForm.description} onChange={(e) => setExchForm((f) => ({ ...f, description: e.target.value }))} placeholder="Izoh..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          {exchError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{exchError}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setIsExchangeModalOpen(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">Bekor qilish</button>
            <button type="submit" disabled={exchSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{exchSubmitting ? "Saqlanmoqda..." : "Ayrboshlash"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
