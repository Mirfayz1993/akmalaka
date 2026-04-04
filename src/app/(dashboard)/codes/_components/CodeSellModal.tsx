"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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

type CodeType = "kz" | "uz" | "afgon";

type SellItem = {
  id: number; // local key
  type: CodeType;
  codeId: string;
  tonnage: string;
  buyPricePerTon: string;
  sellPricePerTon: string;
};

const ALL_TYPES: CodeType[] = ["kz", "uz", "afgon"];
const TYPE_LABELS: Record<CodeType, string> = { kz: "KZ", uz: "UZ", afgon: "Avg'on" };

let _id = 0;
function nextId() { return ++_id; }

function emptyItem(type: CodeType): SellItem {
  return { id: nextId(), type, codeId: "", tonnage: "", buyPricePerTon: "", sellPricePerTon: "" };
}

export default function CodeSellModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  availableCodes,
}: CodeSellModalProps) {
  const [customerId, setCustomerId] = useState("");
  const [wagonNumber, setWagonNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<SellItem[]>([emptyItem("kz")]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeBuyers = partners.filter((p) => p.type === "code_buyer");

  // Har bir item uchun filtrlangan kodlar
  function filteredCodes(type: CodeType, currentCodeId: string) {
    const usedCodeIds = items
      .filter((i) => i.codeId && i.codeId !== currentCodeId)
      .map((i) => i.codeId);
    return availableCodes.filter((c) => c.type === type && !usedCodeIds.includes(String(c.id)));
  }

  // Foydalanilmagan turlar (yangi kod qo'shish uchun)
  const usedTypes = items.map((i) => i.type);
  const availableTypes = ALL_TYPES.filter((t) => !usedTypes.includes(t));

  function addItem() {
    if (availableTypes.length === 0) return;
    setItems((prev) => [...prev, emptyItem(availableTypes[0])]);
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: number, patch: Partial<SellItem>) {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, ...patch };
      // Tur o'zgarganda kodni tozala
      if (patch.type && patch.type !== i.type) updated.codeId = "";
      return updated;
    }));
  }

  // Avg'on: aniq summa; KZ/UZ: tonnaj * narx
  function calcCost(item: SellItem) {
    if (item.type === "afgon") return parseFloat(item.buyPricePerTon) || 0;
    return (parseFloat(item.tonnage) || 0) * (parseFloat(item.buyPricePerTon) || 0);
  }
  function calcRevenue(item: SellItem) {
    if (item.type === "afgon") return parseFloat(item.sellPricePerTon) || 0;
    return (parseFloat(item.tonnage) || 0) * (parseFloat(item.sellPricePerTon) || 0);
  }

  // Jami hisob
  const totals = items.map((item) => ({ cost: calcCost(item), revenue: calcRevenue(item) }));
  const totalCost = totals.reduce((s, t) => s + t.cost, 0);
  const totalRevenue = totals.reduce((s, t) => s + t.revenue, 0);
  const profit = totalRevenue - totalCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) { setError("Mijoz tanlang"); return; }

    for (const item of items) {
      if (!item.codeId) { setError(`${TYPE_LABELS[item.type]} kodi tanlanmagan`); return; }
      const buy = parseFloat(item.buyPricePerTon);
      const sell = parseFloat(item.sellPricePerTon);
      if (item.type !== "afgon") {
        const t = parseFloat(item.tonnage);
        if (!t || t <= 0) { setError(`${TYPE_LABELS[item.type]}: tonnaj kiriting`); return; }
      }
      if (!buy || buy <= 0) { setError(`${TYPE_LABELS[item.type]}: sotib olish narxini kiriting`); return; }
      if (!sell || sell <= 0) { setError(`${TYPE_LABELS[item.type]}: sotish narxini kiriting`); return; }
    }

    setError(null);
    setIsLoading(true);
    try {
      for (const item of items) {
        // Avg'on uchun tonnage=1, buyPricePerTon=aniq summa (1×summa = summa)
        await sellCode({
          codeId: Number(item.codeId),
          customerId: Number(customerId),
          tonnage: item.type === "afgon" ? 1 : parseFloat(item.tonnage),
          buyPricePerTon: parseFloat(item.buyPricePerTon),
          sellPricePerTon: parseFloat(item.sellPricePerTon),
          wagonNumber: wagonNumber.trim() || undefined,
          date: date || undefined,
        });
      }
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setCustomerId("");
    setWagonNumber("");
    setDate(new Date().toISOString().slice(0, 10));
    setItems([emptyItem("kz")]);
    setError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Kod sotish" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Mijoz */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mijoz</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Mijoz tanlang</option>
              {codeBuyers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sana</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Kodlar ro'yxati */}
        <div className="space-y-3">
          {items.map((item, idx) => {
            const codes = filteredCodes(item.type, item.codeId);
            const isAfgon = item.type === "afgon";
            const cost = calcCost(item);
            const revenue = calcRevenue(item);
            const itemProfit = revenue - cost;

            return (
              <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {idx + 1}-kod
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tur */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tur</label>
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(item.id, { type: e.target.value as CodeType })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      {/* Joriy turdagi variantlar + boshqalari ham */}
                      {ALL_TYPES.map((t) => (
                        <option key={t} value={t} disabled={usedTypes.includes(t) && t !== item.type}>
                          {TYPE_LABELS[t]}{usedTypes.includes(t) && t !== item.type ? " (tanlangan)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kod */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Kod</label>
                    <select
                      value={item.codeId}
                      onChange={(e) => updateItem(item.id, { codeId: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="">Kod tanlang</option>
                      {codes.map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.id} — {c.supplier?.name ?? "Ta'minotchisiz"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={`grid gap-3 ${isAfgon ? "grid-cols-2" : "grid-cols-3"}`}>
                  {/* Avg'on uchun tonnaj yo'q */}
                  {!isAfgon && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tonnaj (t)</label>
                      <NumberInput
                        min={0} step="0.01" placeholder="0.00"
                        value={item.tonnage}
                        onChange={(e) => updateItem(item.id, { tonnage: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {isAfgon ? "Sotib olish ($)" : "Sotib olish ($/t)"}
                    </label>
                    <NumberInput
                      min={0} step="0.01" placeholder="0.00"
                      value={item.buyPricePerTon}
                      onChange={(e) => updateItem(item.id, { buyPricePerTon: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {isAfgon ? "Sotish ($)" : "Sotish ($/t)"}
                    </label>
                    <NumberInput
                      min={0} step="0.01" placeholder="0.00"
                      value={item.sellPricePerTon}
                      onChange={(e) => updateItem(item.id, { sellPricePerTon: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Mini hisob */}
                {(cost > 0 || revenue > 0) && (
                  <div className="flex items-center gap-4 text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Xarajat: <span className="font-medium text-slate-700">${cost.toFixed(2)}</span></span>
                    <span className="text-slate-500">Daromad: <span className="font-medium text-green-600">${revenue.toFixed(2)}</span></span>
                    <span className="text-slate-500">Foyda: <span className={`font-semibold ${itemProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{itemProfit >= 0 ? "+" : ""}${itemProfit.toFixed(2)}</span></span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Kod qo'shish tugmasi */}
          {availableTypes.length > 0 && items.length < 3 && (
            <button
              type="button"
              onClick={addItem}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Plus size={15} />
              Kod qo&apos;shish ({availableTypes.map(t => TYPE_LABELS[t]).join(", ")})
            </button>
          )}
        </div>

        {/* Jami hisob */}
        {items.length > 1 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">
              Jami hisob ({items.length} ta kod)
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Jami xarajat ($):</span>
              <span className="font-medium text-slate-700">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Jami daromad ($):</span>
              <span className="font-medium text-green-600">${totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="font-medium text-slate-500">Foyda ($):</span>
              <span className={`font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {profit >= 0 ? "+" : ""}${profit.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

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
            {isLoading ? "Yuklanmoqda..." : `Sotish (${items.length} ta kod)`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
