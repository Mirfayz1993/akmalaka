"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { updateTransport, addTransportExpense, deleteTransportExpense } from "@/lib/actions/wagons";
import { createTimber, updateTimber, deleteTimber } from "@/lib/actions/timbers";
import { t } from "@/i18n/uz";

interface Partner {
  id: number;
  name: string;
  type: string;
}

interface ExpenseItem {
  id: number;
  name: string;
  amount: string;
  partnerId: number | null;
}

interface TimberItem {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  russiaCount: number;
  tashkentCount: number | null;
  customerCount: number | null;
}

interface FullTransport {
  id: number;
  type: string;
  number: string | null;
  sentAt: string | null;
  arrivedAt: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  tonnage: string | null;
  supplierId: number | null;
  codeUzPricePerTon: string | null;
  codeUzSupplierId: number | null;
  codeKzPricePerTon: string | null;
  codeKzSupplierId: number | null;
  rubPricePerCubic: string | null;
  expenseNds: string | null;
  expenseNdsPartnerId: number | null;
  expenseUsluga: string | null;
  expenseUslugaPartnerId: number | null;
  expenseTupik: string | null;
  expenseTupikPartnerId: number | null;
  expenseXrannei: string | null;
  expenseXranneiPartnerId: number | null;
  expenseOrtish: string | null;
  expenseOrtishPartnerId: number | null;
  expenseTushurish: string | null;
  expenseTushirishPartnerId: number | null;
  truckOwnerId: number | null;
  truckOwnerPayment: string | null;
  expenses: ExpenseItem[];
  timbers: TimberItem[];
}

interface WagonEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transport: FullTransport | null;
  partners: Partner[];
  onSuccess: () => void;
}

function calcCub(thicknessMm: number, widthMm: number, lengthM: string, count: number): number {
  return (thicknessMm / 1000) * (widthMm / 1000) * (parseFloat(lengthM) || 0) * count;
}

export default function WagonEditModal({
  isOpen,
  onClose,
  transport,
  partners,
  onSuccess,
}: WagonEditModalProps) {
  // Section 1 state
  const [number, setNumber] = useState("");
  const [sentAt, setSentAt] = useState("");
  const [arrivedAt, setArrivedAt] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [tonnage, setTonnage] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // Section 2 state (kodlar)
  const [codeUzPricePerTon, setCodeUzPricePerTon] = useState("");
  const [codeUzSupplierId, setCodeUzSupplierId] = useState("");
  const [codeKzPricePerTon, setCodeKzPricePerTon] = useState("");
  const [codeKzSupplierId, setCodeKzSupplierId] = useState("");

  // Section 3 — taxtalar
  const [timberList, setTimberList] = useState<TimberItem[]>([]);
  const [newTimber, setNewTimber] = useState({
    thicknessMm: "",
    widthMm: "",
    lengthM: "",
    russiaCount: "",
  });

  // Section 4 — RUB
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

  // Truck fields
  const [truckOwnerId, setTruckOwnerId] = useState("");
  const [truckOwnerPayment, setTruckOwnerPayment] = useState("");

  // Dynamic expenses
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpensePartnerId, setNewExpensePartnerId] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Transport o'zgarganda state larni to'ldirish
  useEffect(() => {
    if (!transport) return;
    setNumber(transport.number ?? "");
    setSentAt(transport.sentAt ?? "");
    setArrivedAt(transport.arrivedAt ?? "");
    setFromLocation(transport.fromLocation ?? "");
    setToLocation(transport.toLocation ?? "");
    setTonnage(transport.tonnage ?? "");
    setSupplierId(transport.supplierId ? String(transport.supplierId) : "");
    setCodeUzPricePerTon(transport.codeUzPricePerTon ?? "");
    setCodeUzSupplierId(
      transport.codeUzSupplierId ? String(transport.codeUzSupplierId) : ""
    );
    setCodeKzPricePerTon(transport.codeKzPricePerTon ?? "");
    setCodeKzSupplierId(
      transport.codeKzSupplierId ? String(transport.codeKzSupplierId) : ""
    );
    setTimberList(transport.timbers ?? []);
    setRubPricePerCubic(transport.rubPricePerCubic ?? "");
    setExpenseNds(transport.expenseNds ?? "");
    setExpenseNdsPartnerId(
      transport.expenseNdsPartnerId ? String(transport.expenseNdsPartnerId) : ""
    );
    setExpenseUsluga(transport.expenseUsluga ?? "");
    setExpenseUslugaPartnerId(
      transport.expenseUslugaPartnerId
        ? String(transport.expenseUslugaPartnerId)
        : ""
    );
    setExpenseTupik(transport.expenseTupik ?? "");
    setExpenseTupikPartnerId(
      transport.expenseTupikPartnerId
        ? String(transport.expenseTupikPartnerId)
        : ""
    );
    setExpenseXrannei(transport.expenseXrannei ?? "");
    setExpenseXranneiPartnerId(
      transport.expenseXranneiPartnerId
        ? String(transport.expenseXranneiPartnerId)
        : ""
    );
    setExpenseOrtish(transport.expenseOrtish ?? "");
    setExpenseOrtishPartnerId(
      transport.expenseOrtishPartnerId
        ? String(transport.expenseOrtishPartnerId)
        : ""
    );
    setExpenseTushurish(transport.expenseTushurish ?? "");
    setExpenseTushirishPartnerId(
      transport.expenseTushirishPartnerId
        ? String(transport.expenseTushirishPartnerId)
        : ""
    );
    setTruckOwnerId(transport.truckOwnerId ? String(transport.truckOwnerId) : "");
    setTruckOwnerPayment(transport.truckOwnerPayment ?? "");
    setExpenses(transport.expenses ?? []);
  }, [transport]);

  const russiaSuppliers = partners.filter((p) => p.type === "russia_supplier");
  const codeSuppliers = partners.filter((p) => p.type === "code_supplier");
  const serviceProviders = partners.filter((p) => p.type === "service_provider");
  const truckOwners = partners.filter((p) => p.type === "truck_owner");

  // Hisoblashlar
  const tonnageNum = parseFloat(tonnage) || 0;
  const codeUzTotal = tonnageNum * (parseFloat(codeUzPricePerTon) || 0);
  const codeKzTotal = tonnageNum * (parseFloat(codeKzPricePerTon) || 0);

  const totalCubRussia = timberList.reduce(
    (sum, t) => sum + calcCub(t.thicknessMm, t.widthMm, t.lengthM, t.russiaCount),
    0
  );
  const totalCubTashkent = timberList.reduce(
    (sum, t) =>
      sum + calcCub(t.thicknessMm, t.widthMm, t.lengthM, t.tashkentCount ?? 0),
    0
  );
  const rubPriceNum = parseFloat(rubPricePerCubic) || 0;
  const totalRub = totalCubTashkent * rubPriceNum;

  async function handleTashkentBlur(timberId: number, value: string) {
    const num = value === "" ? null : parseInt(value, 10);
    const val = num !== null && isNaN(num) ? null : num;
    await updateTimber(timberId, { tashkentCount: val ?? undefined });
    setTimberList((prev) =>
      prev.map((item) =>
        item.id === timberId ? { ...item, tashkentCount: val } : item
      )
    );
  }

  async function handleAddTimber() {
    if (!transport) return;
    const nt = newTimber;
    if (!nt.thicknessMm || !nt.widthMm || !nt.lengthM || !nt.russiaCount) return;
    const created = await createTimber({
      transportId: transport.id,
      thicknessMm: parseInt(nt.thicknessMm),
      widthMm: parseInt(nt.widthMm),
      lengthM: parseFloat(nt.lengthM),
      russiaCount: parseInt(nt.russiaCount),
    });
    setTimberList((prev) => [
      ...prev,
      { ...created, tashkentCount: null, customerCount: null },
    ]);
    setNewTimber({ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" });
  }

  async function handleDeleteTimber(id: number) {
    await deleteTimber(id);
    setTimberList((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleAddExpense() {
    if (!transport || !newExpenseName.trim() || !newExpenseAmount) return;
    const expense = await addTransportExpense(transport.id, {
      name: newExpenseName.trim(),
      amount: newExpenseAmount,
      partnerId: newExpensePartnerId ? parseInt(newExpensePartnerId) : undefined,
    });
    setExpenses((prev) => [...prev, expense]);
    setNewExpenseName("");
    setNewExpenseAmount("");
    setNewExpensePartnerId("");
  }

  async function handleDeleteExpense(id: number) {
    await deleteTransportExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSave() {
    if (!transport) return;
    setIsLoading(true);
    try {
      await updateTransport(transport.id, {
        number: number || undefined,
        sentAt: sentAt || undefined,
        arrivedAt: arrivedAt || undefined,
        fromLocation: fromLocation || undefined,
        toLocation: toLocation || undefined,
        tonnage: tonnage || undefined,
        supplierId: supplierId ? parseInt(supplierId) : undefined,
        codeUzPricePerTon: codeUzPricePerTon || undefined,
        codeUzSupplierId: codeUzSupplierId ? parseInt(codeUzSupplierId) : undefined,
        codeKzPricePerTon: codeKzPricePerTon || undefined,
        codeKzSupplierId: codeKzSupplierId ? parseInt(codeKzSupplierId) : undefined,
        rubPricePerCubic: rubPricePerCubic || undefined,
        expenseNds: expenseNds || "0",
        expenseNdsPartnerId: expenseNdsPartnerId
          ? parseInt(expenseNdsPartnerId)
          : undefined,
        expenseUsluga: expenseUsluga || "0",
        expenseUslugaPartnerId: expenseUslugaPartnerId
          ? parseInt(expenseUslugaPartnerId)
          : undefined,
        expenseTupik: expenseTupik || "0",
        expenseTupikPartnerId: expenseTupikPartnerId
          ? parseInt(expenseTupikPartnerId)
          : undefined,
        expenseXrannei: expenseXrannei || "0",
        expenseXranneiPartnerId: expenseXranneiPartnerId
          ? parseInt(expenseXranneiPartnerId)
          : undefined,
        expenseOrtish: expenseOrtish || "0",
        expenseOrtishPartnerId: expenseOrtishPartnerId
          ? parseInt(expenseOrtishPartnerId)
          : undefined,
        expenseTushurish: expenseTushurish || "0",
        expenseTushirishPartnerId: expenseTushirishPartnerId
          ? parseInt(expenseTushirishPartnerId)
          : undefined,
        truckOwnerId: truckOwnerId ? parseInt(truckOwnerId) : undefined,
        truckOwnerPayment: truckOwnerPayment || undefined,
      });
      onSuccess();
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
  const sectionTitleClass =
    "text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vagonni tahrirlash" size="xl">
      <div className="space-y-6">
        {/* ── Section 1: Asosiy ma'lumotlar ── */}
        <section>
          <h3 className={sectionTitleClass}>{t.wagons.basicInfo}</h3>
          <div className="space-y-4">
            {/* Vagon raqami */}
            <div>
              <label className={labelClass}>{t.wagons.wagonNumber}</label>
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
                <label className={labelClass}>{t.wagons.from}</label>
                <input
                  className={inputClass}
                  placeholder="Krasnoyarsk"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>{t.wagons.to}</label>
                <input
                  className={inputClass}
                  placeholder="Toshkent"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Tonnaj — faqat wagon */}
            {transport?.type === "wagon" && (
              <div>
                <label className={labelClass}>{t.wagons.tonnage}</label>
                <NumberInput
                  className={inputClass}
                  placeholder="65"
                  value={tonnage}
                  onChange={(e) => setTonnage(e.target.value)}
                />
              </div>
            )}

            {/* Truck uchun: egasi va to'lov */}
            {transport?.type === "truck" && (
              <div>
                <label className={labelClass}>Yuk mashina egasiga beriladigan pul</label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    className={inputClass}
                    placeholder="0"
                    value={truckOwnerPayment}
                    onChange={(e) => setTruckOwnerPayment(e.target.value)}
                  />
                  <span className="text-sm text-slate-500 whitespace-nowrap">$</span>
                  <select
                    className={selectClass}
                    value={truckOwnerId}
                    onChange={(e) => setTruckOwnerId(e.target.value)}
                  >
                    <option value="">— Egasi —</option>
                    {truckOwners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
        {transport?.type === "wagon" && (
          <section>
            <h3 className={sectionTitleClass}>{t.wagons.codes}</h3>
            <div className="space-y-3">
              {/* Kod UZ */}
              <div>
                <span className="text-xs font-medium text-blue-600 mb-2 block">
                  {t.wagons.codeUz}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <NumberInput
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
                <span className="text-xs font-medium text-blue-600 mb-2 block">
                  {t.wagons.codeKz}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <NumberInput
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

          {/* Mavjud taxtalar jadvali */}
          {timberList.length > 0 && (
            <div className="space-y-1 mb-4">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_80px_80px_36px] gap-2 text-xs text-slate-500 font-medium px-1">
                <span>O&apos;lcham</span>
                <span className="text-center">{t.wagons.russiaCount}</span>
                <span className="text-center">{t.wagons.tashkentCount}</span>
                <span className="text-center">{t.wagons.customerCount}</span>
                <span></span>
              </div>
              {timberList.map((timber) => (
                <div
                  key={timber.id}
                  className="grid grid-cols-[1fr_80px_80px_80px_36px] gap-2 items-center bg-slate-50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {timber.thicknessMm}×{timber.widthMm}×{timber.lengthM}m
                  </span>
                  <span className="text-sm text-center text-slate-600">
                    {timber.russiaCount}
                  </span>
                  <NumberInput
                    defaultValue={timber.tashkentCount ?? ""}
                    placeholder="—"
                    min={0}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    onBlur={(e) => handleTashkentBlur(timber.id, e.target.value)}
                  />
                  <span className="text-sm text-center text-slate-500">
                    {timber.customerCount ?? 0}
                  </span>
                  <button
                    onClick={() => handleDeleteTimber(timber.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Yangi taxta qo'shish */}
          <div className="border border-dashed border-slate-300 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">
              Yangi taxta qo&apos;shish:
            </p>
            <div className="grid grid-cols-5 gap-2 items-center">
              <NumberInput
                placeholder="Qalinlik (mm)"
                className={inputClass}
                value={newTimber.thicknessMm}
                onChange={(e) =>
                  setNewTimber((prev) => ({ ...prev, thicknessMm: e.target.value }))
                }
              />
              <NumberInput
                placeholder="Eni (mm)"
                className={inputClass}
                value={newTimber.widthMm}
                onChange={(e) =>
                  setNewTimber((prev) => ({ ...prev, widthMm: e.target.value }))
                }
              />
              <NumberInput
                placeholder="Uzunlik (m)"
                className={inputClass}
                value={newTimber.lengthM}
                onChange={(e) =>
                  setNewTimber((prev) => ({ ...prev, lengthM: e.target.value }))
                }
              />
              <NumberInput
                placeholder="Rossiya soni"
                className={inputClass}
                value={newTimber.russiaCount}
                onChange={(e) =>
                  setNewTimber((prev) => ({ ...prev, russiaCount: e.target.value }))
                }
              />
              <button
                onClick={handleAddTimber}
                className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg py-2 hover:bg-blue-50"
              >
                <Plus size={14} /> Qo&apos;shish
              </button>
            </div>
          </div>

          {/* Jami kub */}
          <div className="pt-2 border-t border-slate-100 mt-3 space-y-1">
            <p className="text-sm text-slate-600">
              {t.wagons.totalCubRussia}:{" "}
              <span className="font-semibold text-slate-800">
                {totalCubRussia.toFixed(3)} m³
              </span>
            </p>
            <p className="text-sm text-slate-600">
              {t.wagons.totalCubTashkent}:{" "}
              <span className="font-semibold text-slate-800">
                {totalCubTashkent.toFixed(3)} m³
              </span>
            </p>
          </div>
        </section>

        {/* ── Section 4: Yog'och xaridi (RUB) ── */}
        <section>
          <h3 className={sectionTitleClass}>{t.wagons.timberPurchase}</h3>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>{t.wagons.rubPerCubic}</label>
              <NumberInput
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
                <NumberInput
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.wagons.usluga}</label>
                <NumberInput
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tupik + Xrannei */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.wagons.tupik}</label>
                <NumberInput
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.wagons.xrannei}</label>
                <NumberInput
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ortish + Tushurish */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.wagons.ortish}</label>
                <NumberInput
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.wagons.tushurish}</label>
                <NumberInput
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mavjud qo'shimcha xarajatlar */}
            {expenses.map((exp) => (
              <div key={exp.id} className="border border-slate-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{exp.name}</span>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-sm text-slate-700">${Number(exp.amount).toFixed(2)}</p>
              </div>
            ))}

            {/* Yangi qo'shimcha xarajat qo'shish */}
            <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500">Qo&apos;shimcha xarajat qo&apos;shish</p>
              <input
                className={inputClass}
                placeholder="Nomi"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
              />
              <NumberInput
                className={inputClass}
                placeholder="Summa ($)"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
              />
              <select
                className={selectClass}
                value={newExpensePartnerId}
                onChange={(e) => setNewExpensePartnerId(e.target.value)}
              >
                <option value="">— {t.wagons.partner} —</option>
                {serviceProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleAddExpense}
                disabled={!newExpenseName.trim() || !newExpenseAmount}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={15} />
                Qo&apos;shish
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50"
        >
          {t.common.cancel}
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saqlanmoqda..." : t.common.save}
        </button>
      </div>
    </Modal>
  );
}
