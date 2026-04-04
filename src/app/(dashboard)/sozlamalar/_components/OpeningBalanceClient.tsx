"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setOpeningBalances } from "@/lib/actions/cash";
import type { Partner } from "@/lib/actions/partners";

interface Props {
  partners: Partner[];
  currentUsdBalance: number;
  currentRubBalance: number;
}

type PartnerRow = {
  partnerId: number;
  name: string;
  type: string;
  usdAmount: string;
  rubAmount: string;
  description: string;
};

export default function OpeningBalanceClient({
  partners,
  currentUsdBalance,
  currentRubBalance,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [usdCash, setUsdCash] = useState("");
  const [rubCash, setRubCash] = useState("");
  const [rubRate, setRubRate] = useState("");
  const [rows, setRows] = useState<PartnerRow[]>(
    partners.map((p) => ({
      partnerId: p.id,
      name: p.name,
      type: p.type,
      usdAmount: "",
      rubAmount: "",
      description: "",
    }))
  );
  const [saving, setSaving] = useState(false);

  function updateRow(partnerId: number, field: "usdAmount" | "rubAmount" | "description", value: string) {
    setRows((prev) =>
      prev.map((r) => (r.partnerId === partnerId ? { ...r, [field]: value } : r))
    );
  }

  async function handleSubmit() {
    const usd = parseFloat(usdCash) || 0;
    const rub = parseFloat(rubCash) || 0;
    const rate = parseFloat(rubRate) || 0;
    const partnerEntries = rows
      .map((r) => ({
        partnerId: r.partnerId,
        usdAmount: parseFloat(r.usdAmount) || 0,
        rubAmount: parseFloat(r.rubAmount) || 0,
        description: r.description || undefined,
      }))
      .filter((r) => r.usdAmount !== 0 || r.rubAmount !== 0);

    if (usd === 0 && rub === 0 && partnerEntries.length === 0) {
      toast.error("Hech qanday summa kiritilmadi");
      return;
    }

    setSaving(true);
    try {
      await setOpeningBalances({ usdCash: usd, rubCash: rub, rubRate: rate, partners: partnerEntries });
      toast.success("Boshlang'ich qoldiqlar saqlandi");
      setUsdCash("");
      setRubCash("");
      setRubRate("");
      setRows((prev) => prev.map((r) => ({ ...r, usdAmount: "", rubAmount: "", description: "" })));
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  const typeLabel: Record<string, string> = {
    supplier: "Ta'minotchi",
    wood_buyer: "Mijoz",
    expense_partner: "Xarajat",
    other: "Boshqa",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Boshlang&apos;ich qoldiqlar</h1>

      {/* Kassa */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-700">Kassa qoldiqlari</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Dollar kassa ($)
              {currentUsdBalance !== 0 && (
                <span className="ml-2 text-xs text-slate-400">
                  Hozirgi: ${currentUsdBalance.toFixed(2)}
                </span>
              )}
            </label>
            <input
              type="number"
              value={usdCash}
              onChange={(e) => setUsdCash(e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Rubl kassa (₽)
                {currentRubBalance !== 0 && (
                  <span className="ml-2 text-xs text-slate-400">
                    Hozirgi: {currentRubBalance.toLocaleString("ru-RU")} ₽
                  </span>
                )}
              </label>
              <input
                type="number"
                value={rubCash}
                onChange={(e) => setRubCash(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                O&apos;rtacha kurs (₽/$)
                <span className="ml-1 text-xs text-slate-400">— o'rtacha kurs hisoblash uchun</span>
              </label>
              <input
                type="number"
                value={rubRate}
                onChange={(e) => setRubRate(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hamkorlar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-1">Hamkorlar balansi</h2>
        <p className="text-xs text-slate-400 mb-4">
          Musbat (+) = ular bizga qarz. Manfiy (−) = biz ularga qarzamiz.
        </p>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Hamkorlar topilmadi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-2 font-medium text-slate-600 pr-4">Hamkor</th>
                  <th className="text-left pb-2 font-medium text-slate-600 pr-4">Turi</th>
                  <th className="text-center pb-2 font-medium text-slate-600 pr-2">USD ($)</th>
                  <th className="text-center pb-2 font-medium text-slate-600 pr-2">RUB (₽)</th>
                  <th className="text-left pb-2 font-medium text-slate-600">Izoh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.partnerId}>
                    <td className="py-2 pr-4 font-medium text-slate-800">{row.name}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{typeLabel[row.type] ?? row.type}</td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        value={row.usdAmount}
                        onChange={(e) => updateRow(row.partnerId, "usdAmount", e.target.value)}
                        placeholder="0"
                        className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        value={row.rubAmount}
                        onChange={(e) => updateRow(row.partnerId, "rubAmount", e.target.value)}
                        placeholder="0"
                        className="w-32 border border-slate-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.partnerId, "description", e.target.value)}
                        placeholder="Izoh..."
                        className="w-40 border border-slate-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </div>
  );
}
