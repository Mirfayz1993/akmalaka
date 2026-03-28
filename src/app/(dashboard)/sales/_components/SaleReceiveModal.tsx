"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { receiveSale } from "@/lib/actions/sales";

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
}

export default function SaleReceiveModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
}: SaleReceiveModalProps) {
  const [receivedCounts, setReceivedCounts] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }))
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
                    <input
                      type="number"
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
