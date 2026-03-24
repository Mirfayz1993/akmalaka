"use client";

import { useI18n } from "@/i18n";
import { useState, useEffect, useCallback } from "react";
import {
  getCurrencyRates,
  createCurrencyRate,
  deleteCurrencyRate,
} from "@/lib/actions/currency";
import { Globe, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

type CurrencyRate = {
  id: number;
  date: string;
  usdToRub: number;
  usdToUzs: number;
  createdAt?: Date | null;
};

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function CurrencyPage() {
  const { t } = useI18n();

  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDate, setFormDate] = useState(todayString());
  const [formUsdToRub, setFormUsdToRub] = useState("");
  const [formUsdToUzs, setFormUsdToUzs] = useState("0");
  const [formError, setFormError] = useState("");

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCurrencyRates();
      setRates(data as CurrencyRate[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const latestRate = rates.length > 0 ? rates[0] : null;

  // Modal open/close
  function openModal() {
    setFormDate(todayString());
    setFormUsdToRub("");
    setFormUsdToUzs("0");
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const rubVal = parseFloat(formUsdToRub);

    if (!formDate) {
      setFormError(t.common.date + " " + t.common.noData.toLowerCase());
      return;
    }
    if (isNaN(rubVal) || rubVal <= 0) {
      setFormError("USD/RUB " + t.common.noData.toLowerCase());
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await createCurrencyRate({
        date: formDate,
        usdToRub: rubVal,
        usdToUzs: 0,
      });
      closeModal();
      await loadRates();
    } catch {
      setFormError("Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deleteCurrencyRate(id);
      await loadRates();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.nav.currency}</h1>
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t.common.add}
        </button>
      </div>

      {/* Latest rate cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* USD → RUB card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">
                USD → RUB
              </span>
            </div>
            {latestRate && (
              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                {formatDate(latestRate.date)}
              </span>
            )}
          </div>
          {latestRate ? (
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-emerald-800 leading-none">
                {latestRate.usdToRub.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-lg font-semibold text-emerald-600 mb-0.5">₽</span>
            </div>
          ) : (
            <span className="text-base text-emerald-500 italic">{t.common.noData}</span>
          )}
          <p className="text-xs text-emerald-600 mt-1.5">1 USD = ? RUB</p>
        </div>

      </div>

      {/* Rates table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">
            {t.common.currency} — {t.nav.currency}
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">{t.common.loading}</div>
        ) : rates.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">{t.common.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t.common.date}
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    USD / RUB
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((rate, idx) => (
                  <tr
                    key={rate.id}
                    className={`hover:bg-slate-50 transition-colors ${idx === 0 ? "bg-indigo-50/40" : ""}`}
                  >
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {formatDate(rate.date)}
                      {idx === 0 && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
                          last
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-mono">
                      <span className="font-semibold text-emerald-700">
                        {rate.usdToRub.toLocaleString("ru-RU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-slate-400 ml-1 text-xs">₽</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(rate.id)}
                        disabled={deleting === rate.id}
                        className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleting === rate.id ? "..." : t.common.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  {t.common.add} — {t.nav.currency}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Date field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  {t.common.date}
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors bg-slate-50 hover:bg-white"
                />
              </div>

              {/* USD to RUB */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  1 USD = ? RUB
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formUsdToRub}
                    onChange={(e) => setFormUsdToRub(e.target.value)}
                    placeholder="90.00"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-12 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors bg-slate-50 hover:bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600">
                    ₽
                  </span>
                </div>
              </div>


              {/* Error message */}
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  {saving ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
