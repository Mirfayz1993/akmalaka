"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { receiveSale } from "@/lib/actions/sales";

type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};

type NewReceiveItem = {
  warehouseId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sentCount: number;
  pricePerCubicUsd: number;
};

type SaleDetail = {
  id: number;
  docNumber: string | null;
  paymentType: string | null;
  customer: { name: string } | null;
  items: Array<{
    id: number;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: string | null;
    sentCount: number | null;
    receivedCount: number | null;
  }>;
};

interface SaleReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SaleDetail | null;
  warehouseItems: WarehouseItem[];
}

export default function SaleReceiveModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
  warehouseItems,
}: SaleReceiveModalProps) {
  const [receivedCounts, setReceivedCounts] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItems, setNewItems] = useState<NewReceiveItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "">("");
  const [newItemCount, setNewItemCount] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  useEffect(() => {
    if (sale) {
      const initial: Record<number, number> = {};
      sale.items.forEach((item) => {
        initial[item.id] = item.sentCount ?? 0;
      });
      setReceivedCounts(initial);
    }
  }, [sale]);

  function handleCountChange(itemId: number, value: number) {
    const item = sale?.items.find((i) => i.id === itemId);
    const max = item?.sentCount ?? 0;
    const clamped = Math.max(0, Math.min(value, max));
    setReceivedCounts((prev) => ({ ...prev, [itemId]: clamped }));
  }

  function handleAddNewItem() {
    const wItem = warehouseItems.find((w) => w.id === selectedWarehouseId);
    if (!wItem || newItemCount < 1 || newItemCount > wItem.quantity || newItemPrice <= 0) return;
    setNewItems((prev) => [
      ...prev,
      {
        warehouseId: wItem.id,
        thicknessMm: wItem.thicknessMm,
        widthMm: wItem.widthMm,
        lengthM: parseFloat(wItem.lengthM),
        sentCount: newItemCount,
        pricePerCubicUsd: newItemPrice,
      },
    ]);
    setSelectedWarehouseId("");
    setNewItemCount(1);
    setNewItemPrice(0);
  }

  async function handleSubmit() {
    if (!sale) return;
    setSaving(true);
    setError(null);
    try {
      await receiveSale(
        sale.id,
        sale.items.map((item) => ({
          itemId: item.id,
          receivedCount: receivedCounts[item.id] ?? 0,
        })),
        newItems.length > 0 ? newItems : undefined
      );
      handleClose();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setReceivedCounts({});
    setError(null);
    setNewItems([]);
    setSelectedWarehouseId("");
    setNewItemCount(1);
    setNewItemPrice(0);
    onClose();
  }

  if (!sale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Qabul qilish — #${sale.docNumber ?? sale.id}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm">
          <span className="text-slate-500">Mijoz: </span>
          <span className="font-medium text-slate-800">{sale.customer?.name ?? "—"}</span>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b">
          Qabul soni
        </h3>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">{"O'lcham"}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">{"Jo'natildi"}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Qabul soni</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    {item.thicknessMm}×{item.widthMm}×{item.lengthM}m
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {item.sentCount ?? 0} dona
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumberInput
                      min={0}
                      max={item.sentCount ?? 0}
                      value={receivedCounts[item.id] ?? 0}
                      onChange={(e) =>
                        handleCountChange(item.id, Number(e.target.value))
                      }
                      className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Ombordan yangi item qo'shish ───────────────────── */}
        {warehouseItems.filter((w) => w.quantity > 0).length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-3">Qo&apos;shimcha qabul (ombordan)</p>

            {newItems.length > 0 && (
              <div className="mb-3 space-y-1">
                {newItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-700">{item.thicknessMm}&times;{item.widthMm}&times;{item.lengthM}m — {item.sentCount} dona</span>
                    <button
                      onClick={() => setNewItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 ml-3"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value ? Number(e.target.value) : "");
                  setNewItemCount(1);
                }}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— O&apos;lcham tanlang —</option>
                {warehouseItems.filter((w) => w.quantity > 0).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.thicknessMm}&times;{w.widthMm}&times;{w.lengthM}m ({w.quantity} dona)
                  </option>
                ))}
              </select>
              <NumberInput
                placeholder="Miqdor"
                min={1}
                max={warehouseItems.find((w) => w.id === selectedWarehouseId)?.quantity ?? 1}
                value={newItemCount}
                onChange={(e) => setNewItemCount(Number(e.target.value))}
                className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <NumberInput
                placeholder="$/m³"
                min={0}
                step={0.01}
                value={newItemPrice || ""}
                onChange={(e) => setNewItemPrice(Number(e.target.value))}
                className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddNewItem}
                disabled={!selectedWarehouseId || newItemCount < 1 || newItemPrice <= 0}
                className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Qo&apos;shish
              </button>
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
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Yuklanmoqda..." : "Qabul tasdiqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
