"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/i18n";
import type { Translations } from "@/i18n";
import { DollarSign, CreditCard, Banknote, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  getDebts,
  getTotalDebt,
  makePayment,
  deleteDebt,
} from "@/lib/actions/debts";
import type { DebtWithRelations, DebtPayment, MakePaymentData, PaymentCurrency, PaymentMethod } from "@/lib/actions/debts";

// ==========================================
// TYPES
// ==========================================

type FilterMode = "all" | "active";
type DebtTab = "client_debt" | "my_debt";

type PaymentForm = {
  amount: string;
  currency: PaymentCurrency;
  exchangeRate: string;
  paymentMethod: PaymentMethod;
  date: string;
  notes: string;
};

const emptyPaymentForm = (): PaymentForm => ({
  amount: "",
  currency: "USD",
  exchangeRate: "",
  paymentMethod: "cash",
  date: new Date().toISOString().split("T")[0],
  notes: "",
});

// ==========================================
// HELPERS
// ==========================================

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusBadge(status: string | null, t: Translations) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          {t.debts.status.paid}
        </span>
      );
    case "partially_paid":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          {t.debts.status.partially_paid}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {t.debts.status.active}
        </span>
      );
  }
}

function getMethodLabel(method: string, t: Translations) {
  switch (method) {
    case "bank_transfer":
      return t.debts.paymentMethod.bank_transfer;
    case "card":
      return t.debts.paymentMethod.card;
    default:
      return t.debts.paymentMethod.cash;
  }
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function DebtsPage() {
  const { t } = useI18n();

  // Data
  const [debtsList, setDebtsList] = useState<DebtWithRelations[]>([]);
  const [totals, setTotals] = useState({ totalDebt: 0, totalPaid: 0, totalRemaining: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<DebtTab>("client_debt");

  // UI state
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedDebtId, setExpandedDebtId] = useState<number | null>(null);
  const [paymentModalDebt, setPaymentModalDebt] = useState<DebtWithRelations | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Payment form
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ----------------------------------------
  // Load data
  // ----------------------------------------

  async function loadData(debtType: DebtTab = activeTab) {
    setIsLoading(true);
    try {
      const [allDebts, totalData] = await Promise.all([
        getDebts(undefined, debtType),
        getTotalDebt(debtType),
      ]);
      setDebtsList(allDebts);
      setTotals(totalData);
    } catch (err) {
      console.error("Qarzlarni yuklashda xatolik:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ----------------------------------------
  // Filtered list
  // ----------------------------------------

  const filteredDebts = useMemo(() => {
    if (filterMode === "active") {
      return debtsList.filter(
        (d) => d.status === "active" || d.status === "partially_paid"
      );
    }
    return debtsList;
  }, [debtsList, filterMode]);

  // ----------------------------------------
  // Payment modal
  // ----------------------------------------

  function openPaymentModal(debt: DebtWithRelations) {
    setPaymentModalDebt(debt);
    setPaymentForm(emptyPaymentForm());
  }

  function closePaymentModal() {
    setPaymentModalDebt(null);
    setPaymentForm(emptyPaymentForm());
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentModalDebt) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const data: MakePaymentData = {
        amount,
        currency: "USD",
        paymentMethod: paymentForm.paymentMethod,
        date: paymentForm.date,
        notes: paymentForm.notes.trim() || undefined,
      };
      await makePayment(paymentModalDebt.id, data);
      await loadData();
      closePaymentModal();
    } catch (err) {
      console.error("To'lovda xatolik:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ----------------------------------------
  // Delete
  // ----------------------------------------

  async function handleDelete(id: number) {
    try {
      await deleteDebt(id);
      if (expandedDebtId === id) setExpandedDebtId(null);
      await loadData();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div>
      {/* Page title */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">{t.debts.title}</h1>

        {/* Filter toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterMode === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Hammasi
          </button>
          <button
            onClick={() => setFilterMode("active")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterMode === "active"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Faqat faol
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab("client_debt")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "client_debt"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mijoz qarzlari
        </button>
        <button
          onClick={() => setActiveTab("my_debt")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "my_debt"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mening qarzlarim
        </button>
      </div>

      {/* ---- STAT CARDS ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Jami qarz */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
              {t.debts.totalDebt}
            </p>
            <p className="text-2xl font-bold text-red-600 truncate">
              ${fmt(totals.totalDebt)}
            </p>
          </div>
        </div>

        {/* To'langan */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
              {t.debts.paid}
            </p>
            <p className="text-2xl font-bold text-green-600 truncate">
              ${fmt(totals.totalPaid)}
            </p>
          </div>
        </div>

        {/* Qolgan */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
              {t.debts.remaining}
            </p>
            <p className="text-2xl font-bold text-yellow-600 truncate">
              ${fmt(totals.totalRemaining)}
            </p>
          </div>
        </div>
      </div>

      {/* ---- TABLE ---- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.loading}</div>
        ) : filteredDebts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    {activeTab === "client_debt" ? "Mijoz" : "Kimga qarzdormiz"}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Sotuv</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Jami $</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">To&apos;langan $</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Qolgan $</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-40">Progres</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">{t.common.status}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.common.date}</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebts.map((debt, index) => {
                  const paidPct =
                    debt.totalAmountUsd > 0
                      ? Math.min(100, ((debt.paidAmountUsd ?? 0) / debt.totalAmountUsd) * 100)
                      : 0;
                  const isExpanded = expandedDebtId === debt.id;

                  return (
                    <React.Fragment key={debt.id}>
                      {/* Main row */}
                      <tr
                        className={`border-b border-slate-100 transition-colors ${
                          isExpanded ? "bg-slate-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-400">{index + 1}</td>

                        {/* Mijoz / Yetkazuvchi */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">
                            {activeTab === "my_debt"
                              ? (debt.supplierName ?? "—")
                              : (debt.client?.name ?? "—")}
                          </p>
                          {activeTab === "client_debt" && debt.client?.phone && (
                            <p className="text-xs text-slate-400">{debt.client.phone}</p>
                          )}
                        </td>

                        {/* Sotuv */}
                        <td className="px-4 py-3 text-slate-600">
                          {debt.sale ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                              <DollarSign className="w-3 h-3" />
                              Sotuv #{debt.sale.id} — ${fmt(debt.totalAmountUsd)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Jami */}
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          ${fmt(debt.totalAmountUsd)}
                        </td>

                        {/* To'langan */}
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          ${fmt(debt.paidAmountUsd ?? 0)}
                        </td>

                        {/* Qolgan */}
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          ${fmt(debt.remainingAmountUsd)}
                        </td>

                        {/* Progress bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  paidPct >= 100
                                    ? "bg-green-500"
                                    : paidPct > 0
                                    ? "bg-yellow-500"
                                    : "bg-red-400"
                                }`}
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-10 text-right">
                              {paidPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(debt.status, t)}
                        </td>

                        {/* Sana */}
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {debt.dueDate ?? (debt.createdAt ? new Date(debt.createdAt).toLocaleDateString("uz-UZ") : "—")}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* To'lov qilish */}
                            {debt.status !== "paid" && (
                              <button
                                onClick={() => openPaymentModal(debt)}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap"
                              >
                                {t.debts.makePayment}
                              </button>
                            )}

                            {/* To'lovlar tarixi toggle */}
                            <button
                              onClick={() =>
                                setExpandedDebtId(isExpanded ? null : debt.id)
                              }
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                              title="To'lovlar tarixi"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {/* O'chirish */}
                            {deleteConfirmId === debt.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(debt.id)}
                                  className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                                >
                                  {t.common.confirm}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                                >
                                  {t.common.cancel}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(debt.id)}
                                className="p-1 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                title={t.common.delete}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded: To'lovlar tarixi */}
                      {isExpanded && (
                        <tr key={`expanded-${debt.id}`} className="bg-blue-50/40">
                          <td colSpan={10} className="px-6 py-4">
                            <PaymentsHistory payments={debt.payments} t={t} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- PAYMENT MODAL ---- */}
      {paymentModalDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePaymentModal}
          />

          {/* Modal card */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {t.debts.makePayment}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === "my_debt" ? paymentModalDebt.supplierName : paymentModalDebt.client?.name} — Qolgan:{" "}
                  <span className="font-semibold text-red-600">
                    ${fmt(paymentModalDebt.remainingAmountUsd)}
                  </span>
                </p>
              </div>
              <button
                onClick={closePaymentModal}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePaymentSubmit} className="px-6 py-5 space-y-4">
              {/* Valyuta */}
              <input type="hidden" name="currency" value="USD" />

              {/* Summa */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Summa (USD) <span className="text-red-500">*</span>
                  {paymentModalDebt && (
                    <span className="text-xs text-slate-500 ml-2">
                      Maksimum: ${paymentModalDebt.remainingAmountUsd.toFixed(2)}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  max={paymentModalDebt?.remainingAmountUsd}
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {paymentForm.amount && paymentModalDebt && parseFloat(paymentForm.amount) > paymentModalDebt.remainingAmountUsd && (
                  <p className="text-xs text-red-500 mt-1">
                    Summa qarz qoldig&apos;idan katta bo&apos;lishi mumkin emas
                  </p>
                )}
              </div>


              {/* To'lov usuli radio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  To&apos;lov usuli <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      { value: "cash", label: t.debts.paymentMethod.cash },
                      { value: "bank_transfer", label: t.debts.paymentMethod.bank_transfer },
                      { value: "card", label: t.debts.paymentMethod.card },
                    ] as { value: PaymentMethod; label: string }[]
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={opt.value}
                        checked={paymentForm.paymentMethod === opt.value}
                        onChange={() =>
                          setPaymentForm((f) => ({ ...f, paymentMethod: opt.value }))
                        }
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sana */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.common.date} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.date}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.common.notes}
                </label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder={t.common.notes}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !paymentForm.amount ||
                    parseFloat(paymentForm.amount) <= 0 ||
                    (paymentModalDebt != null && parseFloat(paymentForm.amount) > paymentModalDebt.remainingAmountUsd)
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

// ==========================================
// PAYMENTS HISTORY SUB-COMPONENT
// ==========================================

function PaymentsHistory({
  payments,
  t,
}: {
  payments: DebtPayment[];
  t: Translations;
}) {
  if (payments.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic py-1">
        To&apos;lovlar tarixi yo&apos;q
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
        To&apos;lovlar tarixi
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-3 py-2 font-semibold text-slate-500 w-6">#</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">{t.common.date}</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Summa</th>
              <th className="text-center px-3 py-2 font-semibold text-slate-500">{t.common.currency}</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">Kurs</th>
              <th className="text-right px-3 py-2 font-semibold text-slate-500">USD summa</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Usul</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">{t.common.notes}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr
                key={p.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.date}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-800">
                  ${p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    USD
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-slate-500">
                  —
                </td>
                <td className="px-3 py-2 text-right font-semibold text-green-700">
                  ${p.amountInUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {getMethodLabel(p.paymentMethod, t)}
                </td>
                <td className="px-3 py-2 text-slate-400">{p.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
