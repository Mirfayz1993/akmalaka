"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { receiveSale } from "@/lib/actions/sales";

type NewReceiveItem = {
  timberId?: number;
  transportId?: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  sentCount: number;
  pricePerCubicUsd: number;
};

type WagonTimber = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string | number;
  tashkentCount?: number | null;
};

type SaleDetail = {
  id: number;
  docNumber: string | null;
  customer: { name: string } | null;
  items: Array<{
    id: number;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: string | null;
    sentCount: number | null;
    receivedCount: number | null;
    timberId: number | null;
    transportId: number | null;
    transportName: string | null;
  }>;
};

interface SaleReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SaleDetail | null;
  wagonTimbers?: WagonTimber[];
  salePrice?: number;
}

export default function SaleReceiveModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
  wagonTimbers,
  salePrice,
}: SaleReceiveModalProps) {
  const [receivedCounts, setReceivedCounts] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItems, setNewItems] = useState<NewReceiveItem[]>([]);
  // Wagon timber selector
  const [selectedTimberId, setSelectedTimberId] = useState<number | "">("");
  const [addCount, setAddCount] = useState("");

  useEffect(() => {
    if (sale) {
      const initial: Record<number, number> = {};
      sale.items.forEach((item) => {
        initial[item.id] = item.sentCount ?? 0;
      });
      setReceivedCounts(initial);
    }
  }, [sale]);

  // Savdodagi transport (bitta vagon)
  const saleTransportId = sale?.items[0]?.transportId ?? null;

  function handleCountChange(itemId: number, value: number) {
    const item = sale?.items.find((i) => i.id === itemId);
    const max = item?.sentCount ?? 0;
    const clamped = Math.max(0, Math.min(value, max));
    setReceivedCounts((prev) => ({ ...prev, [itemId]: clamped }));
  }

  function handleAddFromWagon() {
    const timber = wagonTimbers?.find((t) => t.id === selectedTimberId);
    const count = parseInt(addCount);
    if (!timber || !count || count < 1) return;
    const price = salePrice ?? 0;
    setNewItems((prev) => [
      ...prev,
      {
        timberId: timber.id,
        transportId: saleTransportId ?? undefined,
        thicknessMm: timber.thicknessMm,
        widthMm: timber.widthMm,
        lengthM: parseFloat(String(timber.lengthM)),
        sentCount: count,
        pricePerCubicUsd: price,
      },
    ]);
    setSelectedTimberId("");
    setAddCount("");
  }

  const addCub = (() => {
    const timber = wagonTimbers?.find((t) => t.id === selectedTimberId);
    if (!timber || !addCount) return 0;
    const count = parseInt(addCount) || 0;
    return (timber.thicknessMm / 1000) * (timber.widthMm / 1000) * parseFloat(String(timber.lengthM)) * count;
  })();

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
    setSelectedTimberId("");
    setAddCount("");
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
                <th className="text-left px-4 py-3 font-medium text-slate-600">Vagon</th>
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
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {item.transportName ?? "—"}
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

        {/* ── Qo'shimcha qabul (vagondan) ─────────── */}
        {wagonTimbers && wagonTimbers.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-3">
              Qo&apos;shimcha qabul
              <span className="ml-2 text-xs font-normal text-slate-400">(vagondan, ${salePrice?.toFixed(2) ?? "—"}/m³ narxda)</span>
            </p>

            {newItems.length > 0 && (
              <div className="mb-3 space-y-1">
                {newItems.map((item, idx) => {
                  const itemCub = (item.thicknessMm / 1000) * (item.widthMm / 1000) * item.lengthM * item.sentCount;
                  const itemTotal = itemCub * item.pricePerCubicUsd;
                  return (
                    <div key={idx} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                      <span className="text-slate-700">
                        {item.thicknessMm}×{item.widthMm}×{item.lengthM}m —{" "}
                        <span className="font-medium">{item.sentCount} dona</span> —{" "}
                        <span className="text-green-700">{itemCub.toFixed(3)} m³</span> —{" "}
                        <span className="font-semibold text-blue-700">${itemTotal.toFixed(2)}</span>
                      </span>
                      <button onClick={() => setNewItems((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 ml-3">✕</button>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm mt-1">
                  <span className="text-slate-600 font-medium">Jami qo&apos;shimcha:</span>
                  <span>
                    <span className="font-semibold text-green-700">
                      {newItems.reduce((s, i) => s + (i.thicknessMm / 1000) * (i.widthMm / 1000) * i.lengthM * i.sentCount, 0).toFixed(3)} m³
                    </span>{" — "}
                    <span className="font-bold text-blue-700">
                      ${newItems.reduce((s, i) => { const c = (i.thicknessMm / 1000) * (i.widthMm / 1000) * i.lengthM * i.sentCount; return s + c * i.pricePerCubicUsd; }, 0).toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <p className="text-xs text-slate-500 mb-1">O&apos;lcham (vagondan)</p>
                <select
                  value={selectedTimberId}
                  onChange={(e) => setSelectedTimberId(e.target.value ? Number(e.target.value) : "")}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— O&apos;lcham tanlang —</option>
                  {wagonTimbers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.thicknessMm}×{t.widthMm}×{t.lengthM}m
                      {t.tashkentCount ? ` (${t.tashkentCount} dona)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Soni</p>
                <NumberInput
                  value={addCount}
                  placeholder="0"
                  min={1}
                  onChange={(e) => setAddCount(e.target.value)}
                  className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Kub m³</p>
                <div className="w-20 border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 text-sm text-slate-600 text-right">
                  {addCub.toFixed(3)}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Jami $</p>
                <div className="w-24 border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 text-sm text-blue-700 font-medium text-right">
                  ${(addCub * (salePrice ?? 0)).toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddFromWagon}
                disabled={!selectedTimberId || !addCount || parseInt(addCount) < 1}
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
