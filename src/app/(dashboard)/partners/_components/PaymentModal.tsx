"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { recordPayment } from "@/lib/actions/partners";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partner: { id: number; name: string } | null;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  partner,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"usd" | "rub">("usd");
  const [description, setDescription] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setAmount("");
    setCurrency("usd");
    setDescription("");
    setDocNumber("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partner) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) return;

    setLoading(true);
    try {
      await recordPayment({
        partnerId: partner.id,
        amount: numAmount,
        currency,
        description: description.trim() || undefined,
        docNumber: docNumber.trim() || undefined,
      });
      handleClose();
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="To\u2018lov qilish"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Partner name (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Hamkor
          </label>
          <input
            type="text"
            value={partner?.name ?? ""}
            readOnly
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Summa <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">
            Musbat (+) = ular bizga to\u2018ladi. Manfiy (-) = biz ularga to\u2018ladik
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Valyuta
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "usd" | "rub")}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="usd">$ (Dollar)</option>
            <option value="rub">RUB (Rubl)</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tavsif
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="To\u2018lov sababi..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Doc number */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Hujjat raqami
          </label>
          <input
            type="text"
            value={docNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 4);
              setDocNumber(val);
            }}
            placeholder="0001"
            maxLength={4}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={loading || !amount || parseFloat(amount) === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
