"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { buyCode } from "@/lib/actions/codes";
import type { Partner } from "@/lib/actions/partners";
import ShortDateInput from "@/components/ui/ShortDateInput";

interface CodeBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: Partner[];
}

export default function CodeBuyModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
}: CodeBuyModalProps) {
  const [type, setType] = useState<"kz" | "uz" | "afgon">("kz");
  const [supplierId, setSupplierId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeSuppliers = partners.filter((p) => p.type === "code_supplier");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      setError("Ta'minotchi tanlang");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await buyCode({
        type,
        supplierId: Number(supplierId),
        quantity,
        date: date || undefined,
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
    setSupplierId("");
    setQuantity(1);
    setDate(new Date().toISOString().slice(0, 10));
    setError(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Kod sotib olish" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tur */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tur
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "kz" | "uz" | "afgon")}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="kz">KZ</option>
            <option value="uz">UZ</option>
            <option value="afgon">Afgon</option>
          </select>
        </div>

        {/* Ta'minotchi */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Ta&apos;minotchi
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Ta&apos;minotchi tanlang</option>
            {codeSuppliers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Soni */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Soni
          </label>
          <NumberInput
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Sana */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Sana
          </label>
          <ShortDateInput
            value={date}
            onChange={setDate}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
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
            {isLoading ? "Yuklanmoqda..." : "Sotib olish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
