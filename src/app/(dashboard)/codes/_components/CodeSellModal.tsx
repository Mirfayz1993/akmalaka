"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { sellCode, type CodeWithSupplier } from "@/lib/actions/codes";
import type { Partner } from "@/lib/actions/partners";

interface CodeSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: Partner[];
  availableCodes: CodeWithSupplier[];
}

export default function CodeSellModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  availableCodes,
}: CodeSellModalProps) {
  const [type, setType] = useState<"kz" | "uz" | "afgon">("kz");
  const [codeId, setCodeId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [wagonNumber, setWagonNumber] = useState<string>("");
  const [tonnage, setTonnage] = useState<string>("");
  const [buyPricePerTon, setBuyPricePerTon] = useState<string>("");
  const [sellPricePerTon, setSellPricePerTon] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeBuyers = partners.filter((p) => p.type === "code_buyer");

  const filteredCodes = useMemo(
    () => availableCodes.filter((c) => c.type === type),
    [availableCodes, type]
  );

  const tonnageNum = parseFloat(tonnage) || 0;
  const buyNum = parseFloat(buyPricePerTon) || 0;
  const sellNum = parseFloat(sellPricePerTon) || 0;

  const totalCost = tonnageNum * buyNum;
  const totalRevenue = tonnageNum * sellNum;
  const profit = totalRevenue - totalCost;

  function handleTypeChange(newType: "kz" | "uz" | "afgon") {
    setType(newType);
    setCodeId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codeId) {
      setError("Kod tanlang");
      return;
    }
    if (!customerId) {
      setError("Mijoz tanlang");
      return;
    }
    if (!tonnage || tonnageNum <= 0) {
      setError("Tonnaj kiriting");
      return;
    }
    if (!buyPricePerTon || buyNum <= 0) {
      setError("Sotib olish narxini kiriting");
      return;
    }
    if (!sellPricePerTon || sellNum <= 0) {
      setError("Sotish narxini kiriting");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await sellCode({
        codeId: Number(codeId),
        customerId: Number(customerId),
        tonnage: tonnageNum,
        buyPricePerTon: buyNum,
        sellPricePerTon: sellNum,
        wagonNumber: wagonNumber.trim() || undefined,
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setType("kz");
    setCodeId("");
    setCustomerId("");
    setWagonNumber("");
    setTonnage("");
    setBuyPricePerTon("");
    setSellPricePerTon("");
    setError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Kod sotish" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Tur */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tur
            </label>
            <select
              value={type}
              onChange={(e) =>
                handleTypeChange(e.target.value as "kz" | "uz" | "afgon")
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="kz">KZ</option>
              <option value="uz">UZ</option>
              <option value="afgon">Afgon</option>
            </select>
          </div>

          {/* Kod ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kod ID
            </label>
            <select
              value={codeId}
              onChange={(e) => setCodeId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Kod tanlang</option>
              {filteredCodes.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} — {c.supplier?.name ?? "Ta'minotchisiz"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mijoz */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Mijoz
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Mijoz tanlang</option>
            {codeBuyers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Vagon raqami */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Vagon raqami <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
          </label>
          <input
            type="text"
            placeholder="Masalan: 12345678"
            value={wagonNumber}
            onChange={(e) => setWagonNumber(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Tonnaj */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tonnaj (t)
          </label>
          <NumberInput
            min={0}
            step="0.01"
            placeholder="0.00"
            value={tonnage}
            onChange={(e) => setTonnage(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sotib olish narxi */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Sotib olish narxi ($/t)
            </label>
            <NumberInput
              min={0}
              step="0.01"
              placeholder="0.00"
              value={buyPricePerTon}
              onChange={(e) => setBuyPricePerTon(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Sotish narxi */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Sotish narxi ($/t)
            </label>
            <NumberInput
              min={0}
              step="0.01"
              placeholder="0.00"
              value={sellPricePerTon}
              onChange={(e) => setSellPricePerTon(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Avtomatik hisob */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">
            Hisob
          </h3>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Jami xarajat ($):</span>
            <span className="font-medium text-slate-700">
              ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Jami daromad ($):</span>
            <span className="font-medium text-green-600">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Foyda ($):</span>
            <span
              className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {profit >= 0 ? "+" : ""}$
              {profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Yuklanmoqda..." : "Sotish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
