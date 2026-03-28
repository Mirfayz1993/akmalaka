"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { createPartner } from "@/lib/actions/partners";
import type { Partner } from "@/lib/actions/partners";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const partnerTypes: { value: Partner["type"]; label: string }[] = [
  { value: "russia_supplier", label: "Rossiya ta\u2019minotchisi" },
  { value: "code_supplier", label: "Kod ta\u2019minotchisi" },
  { value: "code_buyer", label: "Kod xaridor" },
  { value: "wood_buyer", label: "Yog\u2018och xaridor" },
  { value: "service_provider", label: "Xizmat ko\u2018rsatuvchi" },
  { value: "truck_owner", label: "Yuk mashinasi egasi" },
  { value: "personal", label: "Shaxsiy" },
  { value: "exchanger", label: "Ayrboshlovchi" },
  { value: "partner", label: "Hamkor" },
];

export default function PartnerModal({
  isOpen,
  onClose,
  onSuccess,
}: PartnerModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Partner["type"]>("russia_supplier");
  const [phone, setPhone] = useState("+998");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setName("");
    setType("russia_supplier");
    setPhone("+998");
    setNotes("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createPartner({
        name: name.trim(),
        type,
        phone: phone.trim() && phone.trim() !== "+998" ? phone.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      handleClose();
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yangi hamkor" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Ism <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hamkor ismi"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tur <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Partner["type"])}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            {partnerTypes.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Telefon
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 000 00 00"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Izoh
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Qo\u2018shimcha ma\u2019lumot..."
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
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
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
