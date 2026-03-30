"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
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
  const [direction, setDirection] = useState<"pay" | "receive">("pay");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"usd" | "rub">("usd");
  const [description, setDescription] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setDirection("pay");
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

    const signedAmount = direction === "pay" ? -numAmount : numAmount;
    setLoading(true);
    try {
      await recordPayment({
        partnerId: partner.id,
        amount: signedAmount,
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
      title="To'lov qilish"
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

        {/* Direction buttons */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            To&apos;lov yo&apos;nalishi <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection("pay")}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                direction === "pay"
                  ? "bg-red-50 border-red-500 text-red-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              ↑ Biz to&apos;ladik
            </button>
            <button
              type="button"
              onClick={() => setDirection("receive")}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                direction === "receive"
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              ↓ Ular to&apos;ladi
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Summa <span className="text-red-500">*</span>
          </label>
          <NumberInput
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
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
            placeholder="To'lov sababi..."
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
