"use client";

import { useState, useEffect } from "react";
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

type TimberInfo = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string | number;
  tashkentCount: number | null;
  supplierCount?: number | null;
  customerCount: number | null;
};

type TransportItem = {
  id: number;
  number: string | null;
  status: string;
  timbers: TimberInfo[];
};

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: Partner[];
  transports: TransportItem[];
  warehouseItems: WarehouseItem[];
}

type CartRow = {
  timberId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  availableCount: number; // max qancha bor
  sentCount: string;
  warehouseId?: number;
};

function calcCub(t: number, w: number, l: string, c: string): number {
  return (t / 1000) * (w / 1000) * (parseFloat(l) || 0) * (parseFloat(c) || 0);
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
  const [transportId, setTransportId] = useState<number | "">("");
  const [cart, setCart] = useState<CartRow[]>([]);
  const [pricePerCubicUsd, setPricePerCubicUsd] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ombor qo'shish
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "">("");
  const [warehouseSentCount, setWarehouseSentCount] = useState(1);

  const woodBuyers = partners.filter((p) => p.type === "wood_buyer");

  // arrived yoki unloaded vagonlar (sotish mumkin bo'lganlar)
  const saleableTransports = transports.filter(
    (t) => t.status === "arrived" || t.status === "unloaded"
  );

  const selectedTransport = saleableTransports.find((t) => t.id === transportId);

  // Vagon o'zgarganda timberlar avtomatik chiqadi
  useEffect(() => {
    if (!selectedTransport) {
      setCart([]);
      return;
    }
    const rows: CartRow[] = selectedTransport.timbers
      .filter((timber) => {
        // arrived: tashkentCount bor, unloaded: supplierCount bor
        const count =
          selectedTransport.status === "unloaded"
            ? (timber.supplierCount ?? timber.tashkentCount ?? 0)
            : (timber.tashkentCount ?? 0);
        return count > 0;
      })
      .map((timber) => {
        const available =
          selectedTransport.status === "unloaded"
            ? (timber.supplierCount ?? timber.tashkentCount ?? 0)
            : (timber.tashkentCount ?? 0);
        return {
          timberId: timber.id,
          thicknessMm: timber.thicknessMm,
          widthMm: timber.widthMm,
          lengthM: String(timber.lengthM),
          availableCount: available,
          sentCount: "",
        };
      });
    setCart(rows);
  }, [transportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const price = parseFloat(pricePerCubicUsd) || 0;

  const totalCub = cart.reduce(
    (sum, row) => sum + calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount),
    0
  );
  const totalUsd = totalCub * price;

  function handleRowChange(idx: number, value: string) {
    setCart((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, sentCount: value } : row))
    );
  }

  function handleAddFromWarehouse() {
    const wItem = warehouseItems.find((w) => w.id === selectedWarehouseId);
    if (!wItem || warehouseSentCount < 1 || warehouseSentCount > wItem.quantity)
      return;
    setCart((prev) => [
      ...prev,
      {
        timberId: 0,
        thicknessMm: wItem.thicknessMm,
        widthMm: wItem.widthMm,
        lengthM: wItem.lengthM,
        availableCount: wItem.quantity,
        sentCount: String(warehouseSentCount),
        warehouseId: wItem.id,
      },
    ]);
    setSelectedWarehouseId("");
    setWarehouseSentCount(1);
  }

  function handleRemoveRow(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!customerId) { setError("Mijozni tanlang"); return; }
    if (!transportId) { setError("Vagonni tanlang (majburiy)"); return; }

    if (!price || price <= 0) { setError("$/m³ narxini kiriting"); return; }

    const validItems = cart.filter((row) => parseFloat(row.sentCount) > 0);
    if (validItems.length === 0) {
      setError("Kamida bitta yog'och qatori uchun soni kiriting");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSale({
        customerId: Number(customerId),
        items: validItems.map((row) => ({
          thicknessMm: row.thicknessMm,
          widthMm: row.widthMm,
          lengthM: parseFloat(row.lengthM),
          sentCount: parseInt(row.sentCount),
          pricePerCubicUsd: price,
          transportId: transportId ? Number(transportId) : undefined,
          timberId: row.timberId > 0 ? row.timberId : undefined,
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
    setTransportId("");
    setCart([]);
    setPricePerCubicUsd("");
    setError(null);
    setSelectedWarehouseId("");
    setWarehouseSentCount(1);
    onClose();
  }

  const inputCls =
    "border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400 w-full";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yangi savdo" size="xl">
      <div className="space-y-4">

        {/* Mijoz */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mijoz <span className="text-red-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">— Mijozni tanlang —</option>
            {woodBuyers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Vagon (MAJBURIY) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Vagon <span className="text-red-500">*</span>
          </label>
          <select
            value={transportId}
            onChange={(e) => setTransportId(e.target.value ? Number(e.target.value) : "")}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
              !transportId ? "border-red-300 bg-red-50" : "border-slate-300"
            }`}
          >
            <option value="">— Vagonni tanlang (majburiy) —</option>
            {saleableTransports.length === 0 && (
              <option disabled value="">
                Yetib kelgan yoki tushurilgan vagon yo&apos;q
              </option>
            )}
            {saleableTransports.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.number ?? `#${tr.id}`}
                {tr.status === "arrived" ? " — Yetib kelgan" : " — Tushurilgan"}
              </option>
            ))}
          </select>
          {!transportId && (
            <p className="text-xs text-red-500 mt-1">Vagonni tanlashingiz shart</p>
          )}
        </div>

        {/* Taxtalar jadvali */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Yog&apos;och sotuvi</p>
            {transportId && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">$/m³ narxi:</label>
                <NumberInput
                  value={pricePerCubicUsd}
                  placeholder="0.00"
                  onChange={(e) => setPricePerCubicUsd(e.target.value)}
                  className={`w-24 border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-400 text-center ${
                    !price && cart.some((r) => parseFloat(r.sentCount) > 0)
                      ? "border-red-300 bg-red-50"
                      : "border-slate-300"
                  }`}
                />
              </div>
            )}
          </div>

          {!transportId ? (
            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              Avval vagonni tanlang — taxtalar avtomatik chiqadi
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              Bu vagonda sotish uchun taxtalar topilmadi
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-2 py-2 text-left font-medium text-slate-600">O'lcham</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-600">Mavjud</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-600">Yuborish soni</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-600">Kub m³</th>
                    <th className="px-2 py-2 text-center font-medium text-slate-600">Jami $</th>
                    <th className="px-2 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((row, idx) => {
                    const kub = calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.sentCount);
                    const lineTotal = kub * price;
                    const sentNum = parseInt(row.sentCount) || 0;
                    const overLimit = sentNum > row.availableCount;
                    return (
                      <tr key={idx} className={`border-b border-slate-100 ${overLimit ? "bg-red-50" : ""}`}>
                        <td className="px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                          {row.warehouseId ? (
                            <span className="text-green-700">
                              {row.thicknessMm}×{row.widthMm}×{row.lengthM}m
                              <span className="ml-1 text-xs bg-green-100 text-green-600 px-1 rounded">ombor</span>
                            </span>
                          ) : (
                            <span>{row.thicknessMm}×{row.widthMm}×{row.lengthM}m</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center text-slate-500">
                          {row.availableCount}
                        </td>
                        <td className="px-1 py-1 text-center">
                          <NumberInput
                            value={row.sentCount}
                            placeholder="0"
                            onChange={(e) => handleRowChange(idx, e.target.value)}
                            className={`w-16 ${inputCls} text-center ${overLimit ? "border-red-400" : ""}`}
                          />
                          {overLimit && (
                            <p className="text-red-500 text-xs mt-0.5">Max: {row.availableCount}</p>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center text-slate-600">{kub.toFixed(3)}</td>
                        <td className="px-2 py-1.5 text-center font-medium text-green-700">
                          {lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-1 py-1">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="text-red-400 hover:text-red-600 px-1"
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
          )}

          {/* Jami */}
          {cart.length > 0 && (
            <div className="flex justify-between items-center mt-2 text-xs text-slate-600">
              <span>
                Jami kub: <b>{totalCub.toFixed(3)} m³</b>
              </span>
              <span className="text-green-700 font-semibold text-sm">
                Jami: ${totalUsd.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Ombordan qo'shish */}
        {warehouseItems.filter((w) => w.quantity > 0).length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Ombordan qo&apos;shish
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value ? Number(e.target.value) : "");
                  setWarehouseSentCount(1);
                }}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— O&apos;lcham tanlang —</option>
                {warehouseItems
                  .filter((w) => w.quantity > 0)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.thicknessMm}×{w.widthMm}×{w.lengthM}m ({w.quantity} dona)
                    </option>
                  ))}
              </select>
              <NumberInput
                placeholder="Miqdor"
                min={1}
                max={warehouseItems.find((w) => w.id === selectedWarehouseId)?.quantity ?? 1}
                value={warehouseSentCount}
                onChange={(e) => setWarehouseSentCount(Number(e.target.value))}
                className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddFromWarehouse}
                disabled={!selectedWarehouseId || warehouseSentCount < 1}
                className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Ombor
              </button>
            </div>
          </div>
        )}

        {/* Xato */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tugmalar */}
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
            disabled={saving || !customerId || !transportId}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
