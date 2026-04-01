"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { createSale } from "@/lib/actions/sales";
import { Partner } from "@/lib/actions/partners";

type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};

type TransportItem = {
  id: number;
  number: string | null;
  status: string;
  timbers: Array<{
    id: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: string | number;
    tashkentCount: number | null;
    customerCount: number | null;
  }>;
};

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: Partner[];
  transports: TransportItem[];
  warehouseItems: WarehouseItem[];
}

type CartItem = {
  thicknessMm: string;
  widthMm: string;
  lengthM: string;
  sentCount: string;
  transportId: string;
  pricePerCubicUsd: string;
  warehouseId?: number;
};

function calcCub(t: string, w: string, l: string, c: string): number {
  return (parseFloat(t) || 0) / 1000 * (parseFloat(w) || 0) / 1000 * (parseFloat(l) || 0) * (parseFloat(c) || 0);
}

export default function SaleModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  transports,
  warehouseItems,
}: SaleModalProps) {
  const [customerId, setCustomerId] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState<"cash" | "debt" | "mixed">("cash");
  const [cart, setCart] = useState<CartItem[]>([
    { thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "", pricePerCubicUsd: "" }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "">("");
  const [warehouseSentCount, setWarehouseSentCount] = useState(1);
  const [warehousePrice, setWarehousePrice] = useState(0);

  const woodBuyers = partners.filter((p) => p.type === "wood_buyer");
  const availableTransports = transports.filter(t => t.status !== "closed");

  const totalCub = cart.reduce((sum, row) => sum + calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount), 0);
  const totalUsd = cart.reduce((sum, row) => {
    const kub = calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount);
    return sum + kub * (parseFloat(row.pricePerCubicUsd) || 0);
  }, 0);

  function handleAddRow() {
    setCart(prev => [...prev, { thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "", pricePerCubicUsd: "" }]);
  }

  function handleRemoveRow(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  function handleRowChange(idx: number, field: keyof Omit<CartItem, "warehouseId">, value: string) {
    setCart(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function handleAddFromWarehouse() {
    const wItem = warehouseItems.find(w => w.id === selectedWarehouseId);
    if (!wItem || warehouseSentCount < 1 || warehouseSentCount > wItem.quantity || warehousePrice <= 0) return;
    setCart(prev => [...prev, {
      thicknessMm: String(wItem.thicknessMm),
      widthMm: String(wItem.widthMm),
      lengthM: wItem.lengthM,
      sentCount: String(warehouseSentCount),
      transportId: "",
      pricePerCubicUsd: String(warehousePrice),
      warehouseId: wItem.id,
    }]);
    setSelectedWarehouseId("");
    setWarehouseSentCount(1);
    setWarehousePrice(0);
  }

  async function handleSubmit() {
    if (!customerId) { setError("Mijozni tanlang"); return; }
    const validItems = cart.filter(row =>
      parseInt(row.thicknessMm) > 0 && parseInt(row.widthMm) > 0 &&
      parseFloat(row.lengthM) > 0 && parseInt(row.sentCount) > 0 &&
      parseFloat(row.pricePerCubicUsd) > 0
    );
    if (validItems.length === 0) { setError("Kamida bitta to'liq yog'och qatori kiriting"); return; }
    setSaving(true);
    setError(null);
    try {
      await createSale({
        customerId: Number(customerId),
        paymentType,
        items: validItems.map(row => ({
          thicknessMm: parseInt(row.thicknessMm),
          widthMm: parseInt(row.widthMm),
          lengthM: parseFloat(row.lengthM),
          sentCount: parseInt(row.sentCount),
          pricePerCubicUsd: parseFloat(row.pricePerCubicUsd),
          transportId: row.transportId ? parseInt(row.transportId) : undefined,
          warehouseId: row.warehouseId,
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
    setCustomerId("");
    setPaymentType("cash");
    setCart([{ thicknessMm: "", widthMm: "", lengthM: "", sentCount: "", transportId: "", pricePerCubicUsd: "" }]);
    setError(null);
    setSelectedWarehouseId("");
    setWarehouseSentCount(1);
    setWarehousePrice(0);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yangi savdo" size="xl">
      <div className="space-y-4">
        {/* Mijoz */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mijoz <span className="text-red-500">*</span>
          </label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">— Mijozni tanlang —</option>
            {woodBuyers.length === 0 && (
              <option disabled value="">Hamkorlar bo&apos;limida &quot;Yog&apos;och xaridor&quot; qo&apos;shing</option>
            )}
            {woodBuyers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* To'lov turi */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{"To'lov turi"}</label>
          <div className="flex gap-4">
            {(["cash", "debt", "mixed"] as const).map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={type} checked={paymentType === type} onChange={() => setPaymentType(type)} className="text-blue-600" />
                <span className="text-sm text-slate-700">{type === "cash" ? "Naqd" : type === "debt" ? "Qarz" : "Aralash"}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Yog'och sotuvi */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">{"Yog'och sotuvi"}</p>
            <button onClick={handleAddRow} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              + Qator qo&apos;shish
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-left font-medium text-slate-600">Qalinlik mm</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-600">Eni mm</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-600">Uzunlik m</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-600">Yuborish soni</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-600">Vagon</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-600">$/m³</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-600">Kub m³</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((row, idx) => {
                  const kub = calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount);
                  return (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-1 py-1"><NumberInput value={row.thicknessMm} onChange={e => handleRowChange(idx, "thicknessMm", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400" /></td>
                      <td className="px-1 py-1"><NumberInput value={row.widthMm} onChange={e => handleRowChange(idx, "widthMm", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400" /></td>
                      <td className="px-1 py-1"><NumberInput value={row.lengthM} onChange={e => handleRowChange(idx, "lengthM", e.target.value)} className="w-14 border border-slate-300 rounded px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400" /></td>
                      <td className="px-1 py-1"><NumberInput value={row.sentCount} onChange={e => handleRowChange(idx, "sentCount", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400" /></td>
                      <td className="px-1 py-1">
                        <select value={row.transportId} onChange={e => handleRowChange(idx, "transportId", e.target.value)}
                          className="border border-slate-300 rounded px-1 py-1 text-xs outline-none w-28 focus:ring-1 focus:ring-blue-400">
                          <option value="">— Ixtiyoriy —</option>
                          {availableTransports.map(tr => (
                            <option key={tr.id} value={tr.id}>{tr.number ?? `#${tr.id}`}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1"><NumberInput value={row.pricePerCubicUsd} onChange={e => handleRowChange(idx, "pricePerCubicUsd", e.target.value)} className="w-16 border border-slate-300 rounded px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400" /></td>
                      <td className="px-2 py-1 text-slate-500">{kub.toFixed(3)}</td>
                      <td className="px-1 py-1">
                        <button onClick={() => handleRemoveRow(idx)} className="text-red-400 hover:text-red-600 px-1 text-xs">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-slate-600">
            <span>Jami kub jo&apos;natiladigan: <b>{totalCub.toFixed(3)} m³</b></span>
            <span className="text-green-700 font-semibold text-sm">Jami: ${totalUsd.toFixed(2)}</span>
          </div>
        </div>

        {/* Ombordan qo'shish */}
        {warehouseItems.filter(w => w.quantity > 0).length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">Ombordan qo&apos;shish</p>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={selectedWarehouseId} onChange={e => { setSelectedWarehouseId(e.target.value ? Number(e.target.value) : ""); setWarehouseSentCount(1); }}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— O&apos;lcham tanlang —</option>
                {warehouseItems.filter(w => w.quantity > 0).map(w => (
                  <option key={w.id} value={w.id}>{w.thicknessMm}&times;{w.widthMm}&times;{w.lengthM}m ({w.quantity} dona)</option>
                ))}
              </select>
              <NumberInput placeholder="Miqdor" min={1} max={warehouseItems.find(w => w.id === selectedWarehouseId)?.quantity ?? 1}
                value={warehouseSentCount} onChange={e => setWarehouseSentCount(Number(e.target.value))}
                className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <NumberInput placeholder="$/m³" min={0} step={0.01} value={warehousePrice || ""}
                onChange={e => setWarehousePrice(Number(e.target.value))}
                className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={handleAddFromWarehouse}
                disabled={!selectedWarehouseId || warehouseSentCount < 1 || warehousePrice <= 0}
                className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed">
                + Ombor
              </button>
            </div>
          </div>
        )}

        {/* Xato */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* Tugmalar */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={handleClose} disabled={saving}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50">
            Bekor qilish
          </button>
          <button onClick={handleSubmit} disabled={saving || !customerId}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
