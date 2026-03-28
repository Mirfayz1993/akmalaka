"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { createTransport } from "@/lib/actions/wagons";
import { t } from "@/i18n/uz";

interface Partner {
  id: number;
  name: string;
  type: string;
}

interface TimberRow {
  thicknessMm: string;
  widthMm: string;
  lengthM: string;
  russiaCount: string;
}

interface AdditionalExpense {
  name: string;
  amount: string;
  partnerId: string;
}

interface WagonModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "wagon" | "truck";
  partners: Partner[];
  onSuccess?: () => void;
}

function calcCub(thicknessMm: string, widthMm: string, lengthM: string, count: string): number {
  const t = parseFloat(thicknessMm) || 0;
  const w = parseFloat(widthMm) || 0;
  const l = parseFloat(lengthM) || 0;
  const c = parseFloat(count) || 0;
  return (t / 1000) * (w / 1000) * l * c;
}

export default function WagonModal({ isOpen, onClose, type, partners, onSuccess }: WagonModalProps) {
  // Section 1 — Asosiy ma'lumotlar
  const [number, setNumber] = useState("");
  const [sentAt, setSentAt] = useState("");
  const [arrivedAt, setArrivedAt] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [tonnage, setTonnage] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // Section 2 — Kodlar (faqat wagon)
  const [codeUzPricePerTon, setCodeUzPricePerTon] = useState("");
  const [codeUzSupplierId, setCodeUzSupplierId] = useState("");
  const [codeKzPricePerTon, setCodeKzPricePerTon] = useState("");
  const [codeKzSupplierId, setCodeKzSupplierId] = useState("");

  // Section 3 — Yog'ochlar
  const [timberRows, setTimberRows] = useState<TimberRow[]>([
    { thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" },
  ]);

  // Section 4 — RUB narxi
  const [rubPricePerCubic, setRubPricePerCubic] = useState("");

  // Section 5 — Xarajatlar
  const [expenseNds, setExpenseNds] = useState("");
  const [expenseNdsPartnerId, setExpenseNdsPartnerId] = useState("");
  const [expenseUsluga, setExpenseUsluga] = useState("");
  const [expenseUslugaPartnerId, setExpenseUslugaPartnerId] = useState("");
  const [expenseTupik, setExpenseTupik] = useState("");
  const [expenseTupikPartnerId, setExpenseTupikPartnerId] = useState("");
  const [expenseXrannei, setExpenseXrannei] = useState("");
  const [expenseXranneiPartnerId, setExpenseXranneiPartnerId] = useState("");
  const [expenseOrtish, setExpenseOrtish] = useState("");
  const [expenseOrtishPartnerId, setExpenseOrtishPartnerId] = useState("");
  const [expenseTushurish, setExpenseTushurish] = useState("");
  const [expenseTushirishPartnerId, setExpenseTushirishPartnerId] = useState("");

  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const russiaSuppliers = partners.filter((p) => p.type === "russia_supplier");
  const codeSuppliers = partners.filter((p) => p.type === "code_supplier");
  const serviceProviders = partners.filter((p) => p.type === "service_provider");

  // Hisoblashlar
  const tonnageNum = parseFloat(tonnage) || 0;
  const codeUzTotal = tonnageNum * (parseFloat(codeUzPricePerTon) || 0);
  const codeKzTotal = tonnageNum * (parseFloat(codeKzPricePerTon) || 0);

  const totalCubRussia = timberRows.reduce(
    (sum, row) => sum + calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.russiaCount),
    0
  );

  const rubPriceNum = parseFloat(rubPricePerCubic) || 0;
  const totalRub = totalCubRussia * rubPriceNum;

  function handleAddTimberRow() {
    setTimberRows((prev) => [
      ...prev,
      { thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" },
    ]);
  }

  function handleRemoveTimberRow(idx: number) {
    setTimberRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleTimberChange(idx: number, field: keyof TimberRow, value: string) {
    setTimberRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  function handleAddAdditionalExpense() {
    setAdditionalExpenses((prev) => [...prev, { name: "", amount: "", partnerId: "" }]);
  }

  function handleRemoveAdditionalExpense(idx: number) {
    setAdditionalExpenses((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAdditionalExpenseChange(
    idx: number,
    field: keyof AdditionalExpense,
    value: string
  ) {
    setAdditionalExpenses((prev) =>
      prev.map((exp, i) => (i === idx ? { ...exp, [field]: value } : exp))
    );
  }

  function resetForm() {
    setNumber("");
    setSentAt("");
    setArrivedAt("");
    setFromLocation("");
    setToLocation("");
    setTonnage("");
    setSupplierId("");
    setCodeUzPricePerTon("");
    setCodeUzSupplierId("");
    setCodeKzPricePerTon("");
    setCodeKzSupplierId("");
    setTimberRows([{ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" }]);
    setRubPricePerCubic("");
    setExpenseNds("");
    setExpenseNdsPartnerId("");
    setExpenseUsluga("");
    setExpenseUslugaPartnerId("");
    setExpenseTupik("");
    setExpenseTupikPartnerId("");
    setExpenseXrannei("");
    setExpenseXranneiPartnerId("");
    setExpenseOrtish("");
    setExpenseOrtishPartnerId("");
    setExpenseTushurish("");
    setExpenseTushirishPartnerId("");
    setAdditionalExpenses([]);
    setIsLoading(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    setIsLoading(true);
    try {
      await createTransport({
        type,
        number: number || undefined,
        sentAt: sentAt || undefined,
        arrivedAt: arrivedAt || undefined,
        fromLocation: fromLocation || undefined,
        toLocation: toLocation || undefined,
        tonnage: tonnage || undefined,
        supplierId: supplierId ? parseInt(supplierId) : undefined,
        // Kodlar (faqat wagon)
        codeUzPricePerTon: codeUzPricePerTon || undefined,
        codeUzSupplierId: codeUzSupplierId ? parseInt(codeUzSupplierId) : undefined,
        codeKzPricePerTon: codeKzPricePerTon || undefined,
        codeKzSupplierId: codeKzSupplierId ? parseInt(codeKzSupplierId) : undefined,
        // RUB
        rubPricePerCubic: rubPricePerCubic || undefined,
        // Xarajatlar
        expenseNds: expenseNds || "0",
        expenseNdsPartnerId: expenseNdsPartnerId ? parseInt(expenseNdsPartnerId) : undefined,
        expenseUsluga: expenseUsluga || "0",
        expenseUslugaPartnerId: expenseUslugaPartnerId ? parseInt(expenseUslugaPartnerId) : undefined,
        expenseTupik: expenseTupik || "0",
        expenseTupikPartnerId: expenseTupikPartnerId ? parseInt(expenseTupikPartnerId) : undefined,
        expenseXrannei: expenseXrannei || "0",
        expenseXranneiPartnerId: expenseXranneiPartnerId ? parseInt(expenseXranneiPartnerId) : undefined,
        expenseOrtish: expenseOrtish || "0",
        expenseOrtishPartnerId: expenseOrtishPartnerId ? parseInt(expenseOrtishPartnerId) : undefined,
        expenseTushurish: expenseTushurish || "0",
        expenseTushirishPartnerId: expenseTushirishPartnerId ? parseInt(expenseTushirishPartnerId) : undefined,
      });
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
  const selectClass =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white";
  const labelClass = "block text-xs text-slate-600 mb-1";
  const sectionTitleClass = "text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200";

  const modalTitle = type === "wagon" ? t.wagons.newWagon : t.wagons.newTruck;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="xl">
      <div className="space-y-6">
        {/* ── Section 1: Asosiy ma'lumotlar ── */}
        <section>
          <h3 className={sectionTitleClass}>{t.wagons.basicInfo}</h3>
          <div className="space-y-4">
            {/* Vagon raqami */}
            <div>
              <label className={labelClass}>{t.wagons.wagonNumber} *</label>
              <input
                className={inputClass}
                placeholder="58374291"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>

            {/* Sanalar */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.wagons.sentAt}</label>
                <input
                  type="date"
                  className={inputClass}
                  value={sentAt}
                  onChange={(e) => setSentAt(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>{t.wagons.arrivedAt}</label>
                <input
                  type="date"
                  className={inputClass}
                  value={arrivedAt}
                  onChange={(e) => setArrivedAt(e.target.value)}
                />
              </div>
            </div>

            {/* Qayerdan / Qayerga */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.wagons.from} *</label>
                <input
                  className={inputClass}
                  placeholder="Krasnoyarsk"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>{t.wagons.to} *</label>
                <input
                  className={inputClass}
                  placeholder="Toshkent"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Tonnaj */}
            <div>
              <label className={labelClass}>{t.wagons.tonnage}</label>
              <input
                type="number"
                className={inputClass}
                placeholder="65"
                value={tonnage}
                onChange={(e) => setTonnage(e.target.value)}
              />
            </div>

            {/* Rossiya ta'minotchisi */}
            <div>
              <label className={labelClass}>{t.wagons.supplier}</label>
              <select
                className={selectClass}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">— Tanlang —</option>
                {russiaSuppliers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Section 2: Kodlar (faqat wagon) ── */}
        {type === "wagon" && (
          <section>
            <h3 className={sectionTitleClass}>{t.wagons.codes}</h3>
            <div className="space-y-3">
              {/* Kod UZ */}
              <div>
                <span className="text-xs font-medium text-blue-600 mb-2 block">{t.wagons.codeUz}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder={t.wagons.pricePerTon}
                      value={codeUzPricePerTon}
                      onChange={(e) => setCodeUzPricePerTon(e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">$/t</span>
                  <span className="text-sm font-semibold text-green-600 whitespace-nowrap min-w-[90px]">
                    {t.wagons.total}: ${codeUzTotal.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2">
                  <select
                    className={selectClass}
                    value={codeUzSupplierId}
                    onChange={(e) => setCodeUzSupplierId(e.target.value)}
                  >
                    <option value="">Kimdan olindi...</option>
                    {codeSuppliers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kod KZ */}
              <div>
                <span className="text-xs font-medium text-blue-600 mb-2 block">{t.wagons.codeKz}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder={t.wagons.pricePerTon}
                      value={codeKzPricePerTon}
                      onChange={(e) => setCodeKzPricePerTon(e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">$/t</span>
                  <span className="text-sm font-semibold text-green-600 whitespace-nowrap min-w-[90px]">
                    {t.wagons.total}: ${codeKzTotal.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2">
                  <select
                    className={selectClass}
                    value={codeKzSupplierId}
                    onChange={(e) => setCodeKzSupplierId(e.target.value)}
                  >
                    <option value="">Kimdan olindi...</option>
                    {codeSuppliers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 3: Yog'ochlar ── */}
        <section>
          <h3 className={sectionTitleClass}>{t.wagons.timbers}</h3>
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-6 gap-2 text-xs text-slate-500 font-medium px-1">
              <span>{t.wagons.thickness}</span>
              <span>{t.wagons.width}</span>
              <span>{t.wagons.length}</span>
              <span>{t.wagons.russiaCount}</span>
              <span>{t.wagons.cubicMeters}</span>
              <span></span>
            </div>

            {timberRows.map((row, idx) => {
              const cub = calcCub(row.thicknessMm, row.widthMm, row.lengthM, row.russiaCount);
              return (
                <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="50"
                    value={row.thicknessMm}
                    onChange={(e) => handleTimberChange(idx, "thicknessMm", e.target.value)}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="100"
                    value={row.widthMm}
                    onChange={(e) => handleTimberChange(idx, "widthMm", e.target.value)}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="6"
                    value={row.lengthM}
                    onChange={(e) => handleTimberChange(idx, "lengthM", e.target.value)}
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="100"
                    value={row.russiaCount}
                    onChange={(e) => handleTimberChange(idx, "russiaCount", e.target.value)}
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    {cub.toFixed(3)}
                  </span>
                  <button
                    onClick={() => handleRemoveTimberRow(idx)}
                    disabled={timberRows.length === 1}
                    className="p-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}

            <button
              onClick={handleAddTimberRow}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              <Plus size={15} />
              {"Qator qo'shish"}
            </button>

            {/* Jami kub */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-sm text-slate-600">
                {t.wagons.totalCubRussia}:{" "}
                <span className="font-semibold text-slate-800">{totalCubRussia.toFixed(3)} m³</span>
              </span>
            </div>
          </div>
        </section>

        {/* ── Section 4: Yog'och xaridi (RUB) ── */}
        <section>
          <h3 className={sectionTitleClass}>{t.wagons.timberPurchase}</h3>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>{t.wagons.rubPerCubic}</label>
              <input
                type="number"
                className={inputClass}
                placeholder="15000"
                value={rubPricePerCubic}
                onChange={(e) => setRubPricePerCubic(e.target.value)}
              />
            </div>
            <div className="text-sm text-slate-600">
              {t.wagons.totalRub}:{" "}
              <span className="font-semibold text-slate-800">
                {totalRub.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} RUB
              </span>
            </div>
          </div>
        </section>

        {/* ── Section 5: Xarajatlar ── */}
        <section>
          <h3 className={sectionTitleClass}>{t.wagons.expenses}</h3>
          <div className="space-y-3">
            {/* NDS + Usluga */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.wagons.nds}</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={expenseNds}
                  onChange={(e) => setExpenseNds(e.target.value)}
                />
                <select
                  className={`${selectClass} mt-1`}
                  value={expenseNdsPartnerId}
                  onChange={(e) => setExpenseNdsPartnerId(e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.wagons.usluga}</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={expenseUsluga}
                  onChange={(e) => setExpenseUsluga(e.target.value)}
                />
                <select
                  className={`${selectClass} mt-1`}
                  value={expenseUslugaPartnerId}
                  onChange={(e) => setExpenseUslugaPartnerId(e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tupik + Xrannei */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.wagons.tupik}</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={expenseTupik}
                  onChange={(e) => setExpenseTupik(e.target.value)}
                />
                <select
                  className={`${selectClass} mt-1`}
                  value={expenseTupikPartnerId}
                  onChange={(e) => setExpenseTupikPartnerId(e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.wagons.xrannei}</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={expenseXrannei}
                  onChange={(e) => setExpenseXrannei(e.target.value)}
                />
                <select
                  className={`${selectClass} mt-1`}
                  value={expenseXranneiPartnerId}
                  onChange={(e) => setExpenseXranneiPartnerId(e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ortish + Tushurish */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.wagons.ortish}</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={expenseOrtish}
                  onChange={(e) => setExpenseOrtish(e.target.value)}
                />
                <select
                  className={`${selectClass} mt-1`}
                  value={expenseOrtishPartnerId}
                  onChange={(e) => setExpenseOrtishPartnerId(e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.wagons.tushurish}</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={expenseTushurish}
                  onChange={(e) => setExpenseTushurish(e.target.value)}
                />
                <select
                  className={`${selectClass} mt-1`}
                  value={expenseTushirishPartnerId}
                  onChange={(e) => setExpenseTushirishPartnerId(e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Qo'shimcha xarajatlar */}
            {additionalExpenses.map((exp, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{"Qo'shimcha"} #{idx + 1}</span>
                  <button
                    onClick={() => handleRemoveAdditionalExpense(idx)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  className={inputClass}
                  placeholder="Nomi"
                  value={exp.name}
                  onChange={(e) => handleAdditionalExpenseChange(idx, "name", e.target.value)}
                />
                <input
                  type="number"
                  className={inputClass}
                  placeholder="Summa ($)"
                  value={exp.amount}
                  onChange={(e) => handleAdditionalExpenseChange(idx, "amount", e.target.value)}
                />
                <select
                  className={selectClass}
                  value={exp.partnerId}
                  onChange={(e) => handleAdditionalExpenseChange(idx, "partnerId", e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ))}

            <button
              onClick={handleAddAdditionalExpense}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={15} />
              {t.wagons.additionalExpense}
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50"
        >
          {t.common.cancel}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t.common.loading : t.common.create}
        </button>
      </div>
    </Modal>
  );
}
