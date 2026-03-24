"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { useI18n } from "@/i18n";
import {
  getSales,
  createSale,
  deleteSale,
  getAvailableTimber,
  type SaleWithRelations,
  type AvailableTimber,
  type PaymentType,
} from "@/lib/actions/sales";
import { getClients } from "@/lib/actions/clients";

// ==========================================
// TYPES
// ==========================================

type Client = {
  id: number;
  name: string;
  phone: string | null;
  totalDebt: number;
};

type SaleFormData = {
  clientId: string;
  wagonTimberId: string;
  quantity: string;
  pricePerCubicUsd: string;
  saleDate: string;
  notes: string;
  paymentType: PaymentType;
  paidAmount: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm: SaleFormData = {
  clientId: "",
  wagonTimberId: "",
  quantity: "",
  pricePerCubicUsd: "",
  saleDate: todayStr(),
  notes: "",
  paymentType: "full",
  paidAmount: "",
};

// ==========================================
// HELPERS
// ==========================================

function calcCubic(timber: AvailableTimber | null, qty: number): number {
  if (!timber || qty <= 0) return 0;
  return (timber.widthMm / 1000) * (timber.thicknessMm / 1000) * timber.lengthM * qty;
}

function fmt2(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timberLabel(t: AvailableTimber): string {
  const wagon = t.wagon ? `Vagon #${t.wagon.wagonNumber}` : "Vagon ?";
  return `${wagon} — ${t.thicknessMm}×${t.widthMm}×${t.lengthM}m — ${t.remainingQuantity ?? 0} dona qolgan`;
}

// ==========================================
// PAGE
// ==========================================

export default function SalesPage() {
  const { t } = useI18n();

  const [salesList, setSalesList] = useState<SaleWithRelations[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timberList, setTimberList] = useState<AvailableTimber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [form, setForm] = useState<SaleFormData>(emptyForm);

  // ----------------------------------------
  // Data loading
  // ----------------------------------------

  async function loadAll() {
    setIsLoading(true);
    try {
      const [salesData, clientsData, timberData] = await Promise.all([
        getSales(),
        getClients(),
        getAvailableTimber(),
      ]);
      setSalesList(salesData);
      setClients(clientsData as Client[]);
      setTimberList(timberData);
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xatolik:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // ----------------------------------------
  // Computed: real-time hisoblash
  // ----------------------------------------

  const selectedTimber = useMemo(
    () => timberList.find((t) => t.id === Number(form.wagonTimberId)) ?? null,
    [timberList, form.wagonTimberId]
  );

  const qty = Number(form.quantity) || 0;
  const pricePerCubic = Number(form.pricePerCubicUsd) || 0;
  const computedCubic = calcCubic(selectedTimber, qty);
  const computedTotal = computedCubic * pricePerCubic;
  const paidAmount = Number(form.paidAmount) || 0;
  const debtAmount = form.paymentType === "partial" ? Math.max(0, computedTotal - paidAmount) : 0;

  const maxQty = selectedTimber?.remainingQuantity ?? 0;

  // ----------------------------------------
  // Modal handlers
  // ----------------------------------------

  function openModal() {
    setForm({ ...emptyForm, saleDate: todayStr() });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(emptyForm);
  }

  function setField<K extends keyof SaleFormData>(key: K, value: SaleFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ----------------------------------------
  // Submit
  // ----------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.wagonTimberId || !form.quantity || !form.pricePerCubicUsd) return;
    if (qty <= 0 || pricePerCubic <= 0) return;
    if (selectedTimber && qty > maxQty) return;

    setIsSubmitting(true);
    try {
      await createSale({
        clientId: Number(form.clientId),
        wagonTimberId: Number(form.wagonTimberId),
        quantity: qty,
        pricePerCubicUsd: pricePerCubic,
        saleDate: form.saleDate,
        notes: form.notes.trim() || undefined,
        paymentType: form.paymentType,
        paidAmount: form.paymentType === "partial" ? paidAmount : undefined,
      });
      await loadAll();
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik yuz berdi";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ----------------------------------------
  // Delete
  // ----------------------------------------

  async function handleDelete(id: number) {
    try {
      await deleteSale(id);
      await loadAll();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  }

  // ----------------------------------------
  // Statistics
  // ----------------------------------------

  const totalSalesCount = salesList.length;
  const totalCubic = salesList.reduce((sum, s) => sum + s.cubicMeters, 0);
  const totalAmount = salesList.reduce((sum, s) => sum + s.totalAmountUsd, 0);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.sales.title}</h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.sales.newSale}
        </button>
      </div>

      {/* Statistics */}
      {!isLoading && salesList.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              {t.common.total} sotuvlar
            </p>
            <p className="text-2xl font-bold text-slate-800">{totalSalesCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Jami kub (m³)
            </p>
            <p className="text-2xl font-bold text-blue-600">{fmt2(totalCubic)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Jami summa ($)
            </p>
            <p className="text-2xl font-bold text-green-600">${fmt2(totalAmount)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.loading}</div>
        ) : salesList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t.common.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.common.date}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.sales.client}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{t.sales.timber}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t.sales.quantity}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t.sales.cubic}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t.sales.pricePerCubic}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t.sales.totalAmount}</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {salesList.map((sale, index) => {
                  const wt = sale.wagonTimber;
                  const timberInfo = wt
                    ? `${wt.thicknessMm}×${wt.widthMm}×${wt.lengthM}m`
                    : "—";
                  return (
                    <tr
                      key={sale.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-600">{sale.saleDate}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {sale.client?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                        {timberInfo}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {sale.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {fmt2(sale.cubicMeters)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        ${fmt2(sale.pricePerCubicUsd)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        ${fmt2(sale.totalAmountUsd)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {deleteConfirmId === sale.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(sale.id)}
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
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(sale.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title={t.common.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==========================================
          MODAL: Yangi sotuv
      ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal card */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg z-10 max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                {t.sales.newSale}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal body — scrollable */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

              {/* 1. Mijoz tanlash */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.sales.client} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.clientId}
                  onChange={(e) => setField("clientId", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-white"
                >
                  <option value="">— Mijoz tanlang —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.totalDebt > 0 ? ` (qarzi: $${fmt2(c.totalDebt)})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Taxta tanlash */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.sales.timber} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.wagonTimberId}
                  onChange={(e) => {
                    setField("wagonTimberId", e.target.value);
                    setField("quantity", "");
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-white"
                >
                  <option value="">— Taxta tanlang —</option>
                  {timberList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {timberLabel(t)}
                    </option>
                  ))}
                </select>
                {timberList.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">Omborda mavjud taxta yo&apos;q</p>
                )}
              </div>

              {/* 3. Soni */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.sales.quantity} <span className="text-red-500">*</span>
                  {selectedTimber && (
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      (max: {maxQty} dona)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={maxQty || undefined}
                  value={form.quantity}
                  onChange={(e) => setField("quantity", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                {selectedTimber && qty > maxQty && qty > 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    Soni ombordagi miqdordan ({maxQty}) oshib ketdi
                  </p>
                )}
              </div>

              {/* 4. Narx $/kub */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Narx ($/kub) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={form.pricePerCubicUsd}
                  onChange={(e) => setField("pricePerCubicUsd", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>

              {/* 5. Avtomatik hisoblash */}
              {(computedCubic > 0 || computedTotal > 0) && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-green-700 font-medium">{t.sales.cubic}</p>
                    <p className="text-lg font-bold text-green-800">{fmt2(computedCubic)} m³</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 font-medium">{t.sales.totalAmount}</p>
                    <p className="text-lg font-bold text-green-800">${fmt2(computedTotal)}</p>
                  </div>
                </div>
              )}

              {/* 6. To'lov turi */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t.sales.paymentType} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 flex-wrap">
                  {(
                    [
                      { value: "full", label: t.sales.fullPayment },
                      { value: "partial", label: t.sales.partialPayment },
                      { value: "debt", label: t.sales.onDebt },
                    ] as { value: PaymentType; label: string }[]
                  ).map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer text-sm font-medium transition-colors select-none ${
                        form.paymentType === value
                          ? value === "full"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : value === "partial"
                            ? "border-amber-400 bg-amber-50 text-amber-700"
                            : "border-red-400 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentType"
                        value={value}
                        checked={form.paymentType === value}
                        onChange={() => {
                          setField("paymentType", value);
                          setField("paidAmount", "");
                        }}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 7. Qisman to'lov: qancha to'landi */}
              {form.paymentType === "partial" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To&apos;langan summa ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    max={computedTotal > 0 ? computedTotal : undefined}
                    value={form.paidAmount}
                    onChange={(e) => setField("paidAmount", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                  />
                  {debtAmount > 0 && (
                    <p className="mt-1 text-xs text-red-500 font-medium">
                      Qarz: ${fmt2(debtAmount)}
                    </p>
                  )}
                </div>
              )}

              {/* 8. Sana */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.common.date} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.saleDate}
                  onChange={(e) => setField("saleDate", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>

              {/* 9. Izoh */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.common.notes}
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder={t.common.notes}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 pb-1">
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
                    !form.clientId ||
                    !form.wagonTimberId ||
                    qty <= 0 ||
                    pricePerCubic <= 0 ||
                    (selectedTimber !== null && qty > maxQty) ||
                    (form.paymentType === "partial" && paidAmount <= 0)
                  }
                  className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
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
