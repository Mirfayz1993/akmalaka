"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import {
  getCashOperations,
  getCashBalance,
  createCashOperation,
  deleteCashOperation,
  createCurrencyExchange,
} from "@/lib/actions/cash";
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, RefreshCw } from "lucide-react";

// ==========================================
// TYPES
// ==========================================

type CashOperation = {
  id: number;
  type: string;
  category: string;
  amount: number;
  currency: string;
  relatedSaleId: number | null;
  relatedExpenseId: number | null;
  relatedDebtId: number | null;
  description: string;
  date: string;
  notes: string | null;
  createdAt: Date | null;
};

type BalanceData = {
  income: number;
  expense: number;
  balance: number;
};

type CashBalance = {
  USD: BalanceData;
  RUB: BalanceData;
};

type FormData = {
  type: "income" | "expense";
  category: "sale" | "code_sale" | "partner_payment" | "expense" | "debt_payment";
  amount: string;
  currency: "USD" | "RUB";
  description: string;
  date: string;
  notes: string;
};

const emptyForm: FormData = {
  type: "income",
  category: "sale",
  amount: "",
  currency: "USD",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

type ExchangeFormData = {
  amountUsd: string;
  rate: string;
  date: string;
  notes: string;
};

const emptyExchangeForm: ExchangeFormData = {
  amountUsd: "",
  rate: "90",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

// ==========================================
// HELPERS
// ==========================================

function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    RUB: "₽",
  };
  const symbol = symbols[currency] ?? currency;
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

// ==========================================
// PAGE
// ==========================================

export default function CashPage() {
  const { t } = useI18n();

  const [operations, setOperations] = useState<CashOperation[]>([]);
  const [balance, setBalance] = useState<CashBalance>({
    USD: { income: 0, expense: 0, balance: 0 },
    RUB: { income: 0, expense: 0, balance: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  // Filtr holati
  const [filterType, setFilterType] = useState<"" | "income" | "expense">("");
  const [filterCurrency, setFilterCurrency] = useState<"" | "USD" | "RUB">("");

  // Valyuta almashtirish modal holati
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeForm, setExchangeForm] = useState<ExchangeFormData>(emptyExchangeForm);
  const [isExchangeSubmitting, setIsExchangeSubmitting] = useState(false);

  // ==========================================
  // DATA LOADING
  // ==========================================

  async function loadData() {
    setIsLoading(true);
    try {
      const [ops, bal] = await Promise.all([
        getCashOperations(
          filterType || filterCurrency
            ? {
                type: filterType || undefined,
                currency: filterCurrency || undefined,
              }
            : undefined
        ),
        getCashBalance(),
      ]);
      setOperations(ops as CashOperation[]);
      setBalance(bal);
    } catch (err) {
      console.error("Kassa ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterCurrency]);

  // ==========================================
  // MODAL
  // ==========================================

  function openModal() {
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await createCashOperation({
        type: form.type,
        category: form.category,
        amount,
        currency: form.currency,
        description: form.description.trim(),
        date: form.date,
        notes: form.notes.trim() || undefined,
      });
      await loadData();
      closeModal();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCashOperation(id);
      await loadData();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  }

  // ==========================================
  // EXCHANGE MODAL
  // ==========================================

  function openExchangeModal() {
    setExchangeForm(emptyExchangeForm);
    setShowExchangeModal(true);
  }

  function closeExchangeModal() {
    setShowExchangeModal(false);
    setExchangeForm(emptyExchangeForm);
  }

  async function handleExchangeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountUsd = parseFloat(exchangeForm.amountUsd);
    const rate = parseFloat(exchangeForm.rate);
    if (isNaN(amountUsd) || amountUsd <= 0 || isNaN(rate) || rate <= 0) return;

    setIsExchangeSubmitting(true);
    try {
      await createCurrencyExchange(amountUsd, rate, exchangeForm.date, exchangeForm.notes.trim() || undefined);
      await loadData();
      closeExchangeModal();
    } catch (err) {
      console.error("Valyuta almashtirishda xatolik:", err);
    } finally {
      setIsExchangeSubmitting(false);
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-7 h-7 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">{t.cash.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openExchangeModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Valyuta almashtirish
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.cash.newOperation}
          </button>
        </div>
      </div>

      {/* ── Balans kartochkalari ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* USD */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 border border-green-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-green-700 uppercase tracking-wide">USD</span>
            <span className="text-2xl">🇺🇸</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">{t.cash.income}:</span>
              <span className="font-semibold text-green-700">
                {formatAmount(balance.USD.income, "USD")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-500">{t.cash.expense}:</span>
              <span className="font-semibold text-red-600">
                {formatAmount(balance.USD.expense, "USD")}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-green-200">
              <span className="font-semibold text-slate-700">{t.cash.balance}:</span>
              <span
                className={`font-bold text-base ${
                  balance.USD.balance >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatAmount(balance.USD.balance, "USD")}
              </span>
            </div>
          </div>
        </div>

        {/* RUB */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">RUB</span>
            <span className="text-2xl">🇷🇺</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">{t.cash.income}:</span>
              <span className="font-semibold text-green-700">
                {formatAmount(balance.RUB.income, "RUB")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-500">{t.cash.expense}:</span>
              <span className="font-semibold text-red-600">
                {formatAmount(balance.RUB.expense, "RUB")}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-blue-200">
              <span className="font-semibold text-slate-700">{t.cash.balance}:</span>
              <span
                className={`font-bold text-base ${
                  balance.RUB.balance >= 0 ? "text-blue-700" : "text-red-600"
                }`}
              >
                {formatAmount(balance.RUB.balance, "RUB")}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Filtr paneli ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Tur filtri */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          <button
            onClick={() => setFilterType("")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === ""
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Hammasi
          </button>
          <button
            onClick={() => setFilterType("income")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === "income"
                ? "bg-green-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.cash.income}
          </button>
          <button
            onClick={() => setFilterType("expense")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === "expense"
                ? "bg-red-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.cash.expense}
          </button>
        </div>

        {/* Valyuta filtri */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {(["", "USD", "RUB"] as const).map((cur) => (
            <button
              key={cur}
              onClick={() => setFilterCurrency(cur)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterCurrency === cur
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cur === "" ? "Hammasi" : cur}
            </button>
          ))}
        </div>
      </div>

      {/* ── Jadval ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.loading}</div>
        ) : operations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.common.date}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Turi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategoriya</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Summa</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.common.currency}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.common.notes}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Bog&apos;lanish</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, index) => (
                  <tr
                    key={op.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 text-slate-600">{op.date}</td>
                    <td className="px-4 py-3">
                      {op.type === "income" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <ArrowUpCircle className="w-3 h-3" />
                          {t.cash.type.income}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <ArrowDownCircle className="w-3 h-3" />
                          {t.cash.type.expense}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.cash.category[op.category as keyof typeof t.cash.category] ?? op.category}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          op.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {op.type === "income" ? "+" : "-"}
                        {formatAmount(op.amount, op.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                        {op.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {op.description}
                    </td>
                    <td className="px-4 py-3">
                      {op.relatedSaleId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Sotuv #{op.relatedSaleId}
                        </span>
                      ) : op.relatedDebtId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Qarz #{op.relatedDebtId}
                        </span>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {deleteConfirmId === op.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(op.id)}
                              className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                            >
                              {t.common.confirm}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              {t.common.cancel}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(op.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Jami footer */}
      {!isLoading && operations.length > 0 && (
        <div className="mt-3 flex items-center gap-6 text-sm text-slate-500 px-1">
          <span>
            {t.common.total}:{" "}
            <span className="font-semibold text-slate-700">{operations.length}</span> ta operatsiya
          </span>
        </div>
      )}

      {/* ── Valyuta almashtirish modali ── */}
      {showExchangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeExchangeModal}
          />

          {/* Modal card */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">
                USD &rarr; RUB Konvertatsiya
              </h2>
              <button
                onClick={closeExchangeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleExchangeSubmit} className="px-6 py-5 space-y-4">
              {/* Summa ($) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Summa ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={exchangeForm.amountUsd}
                  onChange={(e) => setExchangeForm((f) => ({ ...f, amountUsd: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>

              {/* Kurs */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kurs (1 USD = ? RUB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={exchangeForm.rate}
                  onChange={(e) => setExchangeForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="90"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>

              {/* Sana */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sana <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={exchangeForm.date}
                  onChange={(e) => setExchangeForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Izoh
                </label>
                <textarea
                  rows={2}
                  value={exchangeForm.notes}
                  onChange={(e) => setExchangeForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Qo'shimcha ma'lumot..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Natija preview */}
              {exchangeForm.amountUsd && exchangeForm.rate && parseFloat(exchangeForm.amountUsd) > 0 && parseFloat(exchangeForm.rate) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <span className="text-sm font-semibold text-emerald-700">
                    Natija: ${parseFloat(exchangeForm.amountUsd).toLocaleString("en-US")} &rarr; &#8381;{(parseFloat(exchangeForm.amountUsd) * parseFloat(exchangeForm.rate)).toLocaleString("en-US")}
                  </span>
                </div>
              )}

              {/* Tugmalar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeExchangeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={
                    isExchangeSubmitting ||
                    !exchangeForm.amountUsd ||
                    parseFloat(exchangeForm.amountUsd) <= 0 ||
                    !exchangeForm.rate ||
                    parseFloat(exchangeForm.rate) <= 0
                  }
                  className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isExchangeSubmitting ? t.common.loading : "Almashtirilsin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal card */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-800">
                {t.cash.newOperation}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Turi — radio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Turi <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={form.type === "income"}
                      onChange={() => setForm((f) => ({ ...f, type: "income" }))}
                      className="accent-green-600"
                    />
                    <span className="flex items-center gap-1 text-sm text-green-700 font-medium">
                      <ArrowUpCircle className="w-4 h-4" />
                      {t.cash.type.income}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={form.type === "expense"}
                      onChange={() => setForm((f) => ({ ...f, type: "expense" }))}
                      className="accent-red-600"
                    />
                    <span className="flex items-center gap-1 text-sm text-red-700 font-medium">
                      <ArrowDownCircle className="w-4 h-4" />
                      {t.cash.type.expense}
                    </span>
                  </label>
                </div>
              </div>

              {/* Kategoriya */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kategoriya <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as FormData["category"],
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="sale">{t.cash.category.sale}</option>
                  <option value="code_sale">{t.cash.category.code_sale}</option>
                  <option value="partner_payment">{t.cash.category.partner_payment}</option>
                  <option value="expense">{t.cash.category.expense}</option>
                  <option value="debt_payment">{t.cash.category.debt_payment}</option>
                </select>
              </div>

              {/* Summa + Valyuta — bir qatorda */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Summa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.common.currency} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        currency: e.target.value as FormData["currency"],
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>
              </div>

              {/* Izoh (description — majburiy) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Izoh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Operatsiya izohi..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Sana */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.common.date} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Qo'shimcha izoh (notes) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.common.notes}
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Qo'shimcha ma'lumot..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Tugmalar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !form.description.trim() ||
                    !form.amount ||
                    parseFloat(form.amount) <= 0
                  }
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isSubmitting ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
