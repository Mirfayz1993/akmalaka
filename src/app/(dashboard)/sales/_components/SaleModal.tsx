"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { createSale } from "@/lib/actions/sales";
import { Partner } from "@/lib/actions/partners";

type TransportItem = {
  id: number;
  number: string | null;
  status: string;
  timbers: Array<{
    id: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: string | number;
    tashkentCount: number;
    customerCount: number;
  }>;
};

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: Partner[];
  transports: TransportItem[];
}

type CartItem = {
  timberId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  available: number;
  sentCount: number;
  pricePerCubicUsd: number;
};

function calcCub(thicknessMm: number, widthMm: number, lengthM: number, count: number): number {
  return (thicknessMm / 1000) * (widthMm / 1000) * lengthM * count;
}

export default function SaleModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  transports,
}: SaleModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState<"cash" | "debt" | "mixed">("cash");
  const [selectedWagonId, setSelectedWagonId] = useState<number | "">("");
  const [selectedTimberId, setSelectedTimberId] = useState<number | "">("");
  const [sentCount, setSentCount] = useState<number>(1);
  const [pricePerCubicUsd, setPricePerCubicUsd] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const woodBuyers = partners.filter((p) => p.type === "wood_buyer");
  const availableWagons = transports.filter(
    (t) => t.status === "arrived" || t.status === "unloaded"
  );

  const selectedWagon = availableWagons.find((w) => w.id === selectedWagonId);
  const selectedTimber = selectedWagon?.timbers.find((t) => t.id === selectedTimberId);
  const availableForTimber = selectedTimber
    ? selectedTimber.tashkentCount - selectedTimber.customerCount
    : 0;

  const totalUsd = cart.reduce((sum, item) => {
    const kub = calcCub(item.thicknessMm, item.widthMm, item.lengthM, item.sentCount);
    return sum + kub * item.pricePerCubicUsd;
  }, 0);

  function handleAddToCart() {
    if (!selectedTimber || !selectedWagonId) return;
    if (sentCount < 1 || sentCount > availableForTimber) return;
    if (pricePerCubicUsd <= 0) return;

    const existing = cart.findIndex((c) => c.timberId === selectedTimber.id);
    if (existing >= 0) {
      const updated = [...cart];
      updated[existing] = {
        ...updated[existing],
        sentCount: updated[existing].sentCount + sentCount,
        pricePerCubicUsd,
      };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          timberId: selectedTimber.id,
          thicknessMm: selectedTimber.thicknessMm,
          widthMm: selectedTimber.widthMm,
          lengthM: Number(selectedTimber.lengthM),
          available: availableForTimber,
          sentCount,
          pricePerCubicUsd,
        },
      ]);
    }

    setSelectedTimberId("");
    setSentCount(1);
    setPricePerCubicUsd(0);
  }

  function handleRemoveFromCart(timberId: number) {
    setCart(cart.filter((c) => c.timberId !== timberId));
  }

  async function handleSubmit() {
    if (!customerId) {
      setError("Mijozni tanlang");
      return;
    }
    if (cart.length === 0) {
      setError("Kamida bitta yog'och qo'shing");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSale({
        customerId: Number(customerId),
        paymentType,
        items: cart.map((item) => ({
          timberId: item.timberId,
          thicknessMm: item.thicknessMm,
          widthMm: item.widthMm,
          lengthM: item.lengthM,
          sentCount: item.sentCount,
          pricePerCubicUsd: item.pricePerCubicUsd,
        })),
      });
      handleClose();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setStep(1);
    setCustomerId("");
    setPaymentType("cash");
    setSelectedWagonId("");
    setSelectedTimberId("");
    setSentCount(1);
    setPricePerCubicUsd(0);
    setCart([]);
    setError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yangi savdo" size="xl">
      {/* Step tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setStep(1)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            step === 1
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          1. Asosiy
        </button>
        <button
          onClick={() => setStep(2)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            step === 2
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {"2. Yog'och qo'shish"}
        </button>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b">
            Asosiy ma&#39;lumotlar
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mijoz
            </label>
            <select
              value={customerId}
              onChange={(e) =>
                setCustomerId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— Mijozni tanlang —</option>
              {woodBuyers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {"To'lov turi"}
            </label>
            <div className="flex gap-4">
              {(["cash", "debt", "mixed"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    checked={paymentType === type}
                    onChange={() => setPaymentType(type)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-slate-700">
                    {type === "cash" ? "Naqd" : type === "debt" ? "Qarz" : "Aralash"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Keyingisi →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b">
            {"Yog'och qo'shish"}
          </h3>

          {/* Wagon selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vagon tanlash
            </label>
            <select
              value={selectedWagonId}
              onChange={(e) => {
                setSelectedWagonId(e.target.value ? Number(e.target.value) : "");
                setSelectedTimberId("");
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— Vagonni tanlang —</option>
              {availableWagons.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.number ?? `Vagon #${w.id}`} ({w.status === "arrived" ? "Yetib keldi" : "Tushirildi"})
                </option>
              ))}
            </select>
          </div>

          {/* Timbers in wagon */}
          {selectedWagon && selectedWagon.timbers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">
                Vagonidagi yog&#39;ochlar
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-medium text-slate-600">
                        {"O'lcham"}
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">
                        Mavjud
                      </th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedWagon.timbers.map((timber) => {
                      const available = timber.tashkentCount - timber.customerCount;
                      return (
                        <tr
                          key={timber.id}
                          className={`border-b border-slate-100 ${
                            available <= 0 ? "opacity-40" : "hover:bg-slate-50 cursor-pointer"
                          }`}
                          onClick={() => {
                            if (available > 0) {
                              setSelectedTimberId(timber.id);
                              setSentCount(1);
                            }
                          }}
                        >
                          <td className="px-3 py-2 text-slate-700">
                            {timber.thicknessMm}×{timber.widthMm}×{timber.lengthM}m
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">
                            {available} dona
                          </td>
                          <td className="px-3 py-2 text-center">
                            {selectedTimberId === timber.id && (
                              <span className="text-blue-600 font-bold">✓</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add form */}
              {selectedTimberId !== "" && selectedTimber && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-2">
                    Tanlangan: {selectedTimber.thicknessMm}×{selectedTimber.widthMm}×{selectedTimber.lengthM}m
                    {" — mavjud: "}{availableForTimber} dona
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Miqdor (1–{availableForTimber})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={availableForTimber}
                        value={sentCount}
                        onChange={(e) => setSentCount(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Narx ($/kub)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={pricePerCubicUsd}
                        onChange={(e) => setPricePerCubicUsd(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddToCart}
                      disabled={sentCount < 1 || sentCount > availableForTimber || pricePerCubicUsd <= 0}
                      className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + Savatga qo&#39;shish
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          {cart.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">
                Savat ({cart.length} element)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-medium text-slate-600">{"O'lcham"}</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Miqdor</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">$/kub</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Kub</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Summa</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => {
                      const kub = calcCub(item.thicknessMm, item.widthMm, item.lengthM, item.sentCount);
                      const summa = kub * item.pricePerCubicUsd;
                      return (
                        <tr key={item.timberId} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-700">
                            {item.thicknessMm}×{item.widthMm}×{item.lengthM}m
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.sentCount}</td>
                          <td className="px-3 py-2 text-right text-slate-600">${item.pricePerCubicUsd}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{kub.toFixed(3)}</td>
                          <td className="px-3 py-2 text-right text-green-700 font-semibold">
                            ${summa.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleRemoveFromCart(item.timberId)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-sm font-semibold text-green-600">
                  Jami: ${totalUsd.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !customerId || cart.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
