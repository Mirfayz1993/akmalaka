"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import { createTransport } from "@/lib/actions/wagons";
import { t } from "@/i18n/uz";

interface Partner {
  id: number;
  name: string;
  type: string;
}

interface TransportForDefault {
  supplierId: number | null;
  codeUzSupplierId: number | null;
  codeKzSupplierId: number | null;
  truckOwnerId: number | null;
  expenseNdsPartnerId: number | null;
  expenseUslugaPartnerId: number | null;
  expenseTupikPartnerId: number | null;
  expenseXranneiPartnerId: number | null;
  expenseOrtishPartnerId: number | null;
  expenseTushirishPartnerId: number | null;
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
  transports: TransportForDefault[];
  onSuccess?: () => void;
}

function calcCub(thicknessMm: string, widthMm: string, lengthM: string, count: string): number {
  const t = parseFloat(thicknessMm) || 0;
  const w = parseFloat(widthMm) || 0;
  const l = parseFloat(lengthM) || 0;
  const c = parseFloat(count) || 0;
  return (t / 1000) * (w / 1000) * l * c;
}

// Eng ko'p ishlatilgan hamkorni qaytaradi.
// Agar bitta bo'lsa — o'sha, agar ko'p bo'lsa — eng ko'p ishlatilgan,
// agar tarix bo'lmasa — birinchi ro'yxatga olingan (eng kichik ID).
function getMostUsedPartnerId(
  partnerList: { id: number }[],
  transports: TransportForDefault[],
  getField: (tr: TransportForDefault) => number | null | undefined
): string {
  if (partnerList.length === 0) return "";
  if (partnerList.length === 1) return String(partnerList[0].id);

  const counts = new Map<number, number>();
  for (const tr of transports) {
    const pid = getField(tr);
    if (pid && partnerList.some((p) => p.id === pid)) {
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    // Tarix yo'q — birinchi ro'yxatga olingan hamkor
    return String(partnerList[0].id);
  }

  let maxCount = 0;
  let mostUsedId = partnerList[0].id;
  for (const [id, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedId = id;
    }
  }
  return String(mostUsedId);
}

export default function WagonModal({ isOpen, onClose, type, partners, transports, onSuccess }: WagonModalProps) {
  // ── Partner listalari (useState dan oldin hisoblash) ──
  const russiaSuppliers = partners.filter((p) => p.type === "russia_supplier");
  const codeSuppliers = partners.filter((p) => p.type === "code_supplier");
  const serviceProviders = partners.filter((p) => p.type === "service_provider");
  const truckOwners = partners.filter((p) => p.type === "truck_owner");

  // ── Default partner ID larini hisoblash ──
  const defaultSupplierId = getMostUsedPartnerId(russiaSuppliers, transports, (tr) => tr.supplierId);
  const defaultCodeUzSupplierId = getMostUsedPartnerId(codeSuppliers, transports, (tr) => tr.codeUzSupplierId);
  const defaultCodeKzSupplierId = getMostUsedPartnerId(codeSuppliers, transports, (tr) => tr.codeKzSupplierId);
  const defaultTruckOwnerId = getMostUsedPartnerId(truckOwners, transports, (tr) => tr.truckOwnerId);
  const defaultExpenseNdsPartnerId = getMostUsedPartnerId(serviceProviders, transports, (tr) => tr.expenseNdsPartnerId);
  const defaultExpenseUslugaPartnerId = getMostUsedPartnerId(serviceProviders, transports, (tr) => tr.expenseUslugaPartnerId);
  const defaultExpenseTupikPartnerId = getMostUsedPartnerId(serviceProviders, transports, (tr) => tr.expenseTupikPartnerId);
  const defaultExpenseXranneiPartnerId = getMostUsedPartnerId(serviceProviders, transports, (tr) => tr.expenseXranneiPartnerId);
  const defaultExpenseOrtishPartnerId = getMostUsedPartnerId(serviceProviders, transports, (tr) => tr.expenseOrtishPartnerId);
  const defaultExpenseTushirishPartnerId = getMostUsedPartnerId(serviceProviders, transports, (tr) => tr.expenseTushirishPartnerId);

  // Section 1 — Asosiy ma'lumotlar
  const [number, setNumber] = useState("");
  const [sentAt, setSentAt] = useState("");
  const [arrivedAt, setArrivedAt] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [tonnage, setTonnage] = useState("");
  const [supplierId, setSupplierId] = useState(defaultSupplierId);

  // Section 2 — Kodlar (faqat wagon)
  const [codeUzPricePerTon, setCodeUzPricePerTon] = useState("");
  const [codeUzSupplierId, setCodeUzSupplierId] = useState(defaultCodeUzSupplierId);
  const [codeKzPricePerTon, setCodeKzPricePerTon] = useState("");
  const [codeKzSupplierId, setCodeKzSupplierId] = useState(defaultCodeKzSupplierId);

  // Section 3 — Yog'ochlar
  const [timberRows, setTimberRows] = useState<TimberRow[]>([
    { thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" },
  ]);

  // Section 4 — RUB narxi
  const [rubPricePerCubic, setRubPricePerCubic] = useState("");

  // Section 5 — Xarajatlar
  const [expenseNds, setExpenseNds] = useState("");
  const [expenseNdsPartnerId, setExpenseNdsPartnerId] = useState(defaultExpenseNdsPartnerId);
  const [expenseUsluga, setExpenseUsluga] = useState("");
  const [expenseUslugaPartnerId, setExpenseUslugaPartnerId] = useState(defaultExpenseUslugaPartnerId);
  const [expenseTupik, setExpenseTupik] = useState("");
  const [expenseTupikPartnerId, setExpenseTupikPartnerId] = useState(defaultExpenseTupikPartnerId);
  const [expenseXrannei, setExpenseXrannei] = useState("");
  const [expenseXranneiPartnerId, setExpenseXranneiPartnerId] = useState(defaultExpenseXranneiPartnerId);
  const [expenseOrtish, setExpenseOrtish] = useState("");
  const [expenseOrtishPartnerId, setExpenseOrtishPartnerId] = useState(defaultExpenseOrtishPartnerId);
  const [expenseTushurish, setExpenseTushurish] = useState("");
  const [expenseTushirishPartnerId, setExpenseTushirishPartnerId] = useState(defaultExpenseTushirishPartnerId);

  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);

  const [truckOwnerId, setTruckOwnerId] = useState(defaultTruckOwnerId);
  const [truckOwnerPayment, setTruckOwnerPayment] = useState("");

  const [isLoading, setIsLoading] = useState(false);

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
    // Yangi qo'shimcha xarajatga ham default service_provider qo'shamiz
    const defaultServiceProvider = getMostUsedPartnerId(serviceProviders, transports, (tr) => tr.expenseNdsPartnerId);
    setAdditionalExpenses((prev) => [...prev, { name: "", amount: "", partnerId: defaultServiceProvider }]);
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
    setSupplierId(defaultSupplierId);
    setCodeUzPricePerTon("");
    setCodeUzSupplierId(defaultCodeUzSupplierId);
    setCodeKzPricePerTon("");
    setCodeKzSupplierId(defaultCodeKzSupplierId);
    setTimberRows([{ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" }]);
    setRubPricePerCubic("");
    setExpenseNds("");
    setExpenseNdsPartnerId(defaultExpenseNdsPartnerId);
    setExpenseUsluga("");
    setExpenseUslugaPartnerId(defaultExpenseUslugaPartnerId);
    setExpenseTupik("");
    setExpenseTupikPartnerId(defaultExpenseTupikPartnerId);
    setExpenseXrannei("");
    setExpenseXranneiPartnerId(defaultExpenseXranneiPartnerId);
    setExpenseOrtish("");
    setExpenseOrtishPartnerId(defaultExpenseOrtishPartnerId);
    setExpenseTushurish("");
    setExpenseTushirishPartnerId(defaultExpenseTushirishPartnerId);
    setAdditionalExpenses([]);
    setTruckOwnerId(defaultTruckOwnerId);
    setTruckOwnerPayment("");
    setIsLoading(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // ── Majburiy hamkor tekshiruvi ──
  function validatePartners(): boolean {
    if (type === "truck" && parseFloat(truckOwnerPayment) > 0 && !truckOwnerId) {
      toast.error("Yuk mashina egasini tanlang (majburiy)");
      return false;
    }
    if (parseFloat(codeUzPricePerTon) > 0 && !codeUzSupplierId) {
      toast.error("Kod UZ hamkorini tanlang (majburiy)");
      return false;
    }
    if (parseFloat(codeKzPricePerTon) > 0 && !codeKzSupplierId) {
      toast.error("Kod KZ hamkorini tanlang (majburiy)");
      return false;
    }
    if (parseFloat(rubPricePerCubic) > 0 && !supplierId) {
      toast.error("Yog'och ta'minotchisini tanlang (majburiy)");
      return false;
    }
    if (parseFloat(expenseNds) > 0 && !expenseNdsPartnerId) {
      toast.error("NDS xarajati uchun hamkorni tanlang (majburiy)");
      return false;
    }
    if (parseFloat(expenseUsluga) > 0 && !expenseUslugaPartnerId) {
      toast.error("Usluga xarajati uchun hamkorni tanlang (majburiy)");
      return false;
    }
    if (parseFloat(expenseTupik) > 0 && !expenseTupikPartnerId) {
      toast.error("Tupik xarajati uchun hamkorni tanlang (majburiy)");
      return false;
    }
    if (parseFloat(expenseXrannei) > 0 && !expenseXranneiPartnerId) {
      toast.error("Xrannei xarajati uchun hamkorni tanlang (majburiy)");
      return false;
    }
    if (parseFloat(expenseOrtish) > 0 && !expenseOrtishPartnerId) {
      toast.error("Ortish xarajati uchun hamkorni tanlang (majburiy)");
      return false;
    }
    if (parseFloat(expenseTushurish) > 0 && !expenseTushirishPartnerId) {
      toast.error("Tushurish xarajati uchun hamkorni tanlang (majburiy)");
      return false;
    }
    for (let i = 0; i < additionalExpenses.length; i++) {
      const exp = additionalExpenses[i];
      if (parseFloat(exp.amount) > 0 && !exp.partnerId) {
        toast.error(`Qo'shimcha xarajat #${i + 1} uchun hamkorni tanlang (majburiy)`);
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    if (!validatePartners()) return;
    setIsLoading(true);
    try {
      await createTransport({
        type,
        number: number || undefined,
        sentAt: sentAt || undefined,
        arrivedAt: arrivedAt || undefined,
        fromLocation: fromLocation || undefined,
        toLocation: toLocation || undefined,
        tonnage: type === "wagon" && tonnage ? tonnage : undefined,
        truckOwnerId: type === "truck" && truckOwnerId ? parseInt(truckOwnerId) : undefined,
        truckOwnerPayment: type === "truck" && truckOwnerPayment ? truckOwnerPayment : undefined,
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
      },
      timberRows
        .filter((r) => r.thicknessMm !== "" && r.widthMm !== "" && r.lengthM !== "" && r.russiaCount !== "")
        .map((r) => ({
          thicknessMm: parseInt(r.thicknessMm),
          widthMm: parseInt(r.widthMm),
          lengthM: parseFloat(r.lengthM),
          russiaCount: parseInt(r.russiaCount),
        }))
      );
      resetForm();
      toast.success("Transport yaratildi");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
  const selectClass =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white";
  const selectRequiredClass =
    "w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none bg-white";
  const labelClass = "block text-xs text-slate-600 mb-1";
  const sectionTitleClass = "text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200";

  // Summa > 0 lekin hamkor tanlanmagan bo'lsa qizil chegara ko'rsatish
  function expenseSelectClass(amount: string, partnerId: string) {
    return `${parseFloat(amount) > 0 && !partnerId ? selectRequiredClass : selectClass} mt-1`;
  }

  const modalTitle = type === "wagon" ? t.wagons.newWagon : t.wagons.newTruck;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="xl">
      <div className="space-y-6">
        {/* ── Section 1: Asosiy ma'lumotlar ── */}
        <section>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">{t.wagons.basicInfo}</h3>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700">
              Yo&apos;lda
            </span>
          </div>
          <div className="space-y-4">
            {/* Vagon raqami */}
            <div>
              <label className={labelClass}>{type === "wagon" ? t.wagons.wagonNumber : "Yuk mashina raqami"} *</label>
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

            {/* Vagon uchun tonnaj, truck uchun egasi va to'lov */}
            {type === "wagon" ? (
              <div>
                <label className={labelClass}>{t.wagons.tonnage}</label>
                <NumberInput
                  className={inputClass}
                  placeholder="65"
                  value={tonnage}
                  onChange={(e) => setTonnage(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className={labelClass}>
                  Yuk mashina egasiga beriladigan pul <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    className={inputClass}
                    placeholder="0"
                    value={truckOwnerPayment}
                    onChange={(e) => setTruckOwnerPayment(e.target.value)}
                  />
                  <span className="text-sm text-slate-500 whitespace-nowrap">$</span>
                  <select
                    className={parseFloat(truckOwnerPayment) > 0 && !truckOwnerId ? selectRequiredClass : selectClass}
                    value={truckOwnerId}
                    onChange={(e) => setTruckOwnerId(e.target.value)}
                  >
                    <option value="">— Egasi —</option>
                    {truckOwners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {parseFloat(truckOwnerPayment) > 0 && !truckOwnerId && (
                  <p className="text-xs text-red-500 mt-1">Egasini tanlash majburiy</p>
                )}
              </div>
            )}

            {/* Rossiya ta'minotchisi */}
            <div>
              <label className={labelClass}>
                {t.wagons.supplier}
                {parseFloat(rubPricePerCubic) > 0 && <span className="text-red-500 ml-1">*</span>}
              </label>
              <select
                className={parseFloat(rubPricePerCubic) > 0 && !supplierId ? selectRequiredClass : selectClass}
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
              {parseFloat(rubPricePerCubic) > 0 && !supplierId && (
                <p className="text-xs text-red-500 mt-1">Ta'minotchini tanlash majburiy</p>
              )}
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
                    className={parseFloat(codeUzPricePerTon) > 0 && !codeUzSupplierId ? selectRequiredClass : selectClass}
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
                  {parseFloat(codeUzPricePerTon) > 0 && !codeUzSupplierId && (
                    <p className="text-xs text-red-500 mt-1">Kod UZ hamkorini tanlash majburiy</p>
                  )}
                </div>
              </div>

              {/* Kod KZ */}
              <div>
                <span className="text-xs font-medium text-blue-600 mb-2 block">{t.wagons.codeKz}</span>
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
                    className={parseFloat(codeKzPricePerTon) > 0 && !codeKzSupplierId ? selectRequiredClass : selectClass}
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
                  {parseFloat(codeKzPricePerTon) > 0 && !codeKzSupplierId && (
                    <p className="text-xs text-red-500 mt-1">Kod KZ hamkorini tanlash majburiy</p>
                  )}
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
                  <NumberInput
                    className={inputClass}
                    placeholder="50"
                    value={row.thicknessMm}
                    onChange={(e) => handleTimberChange(idx, "thicknessMm", e.target.value)}
                  />
                  <NumberInput
                    className={inputClass}
                    placeholder="100"
                    value={row.widthMm}
                    onChange={(e) => handleTimberChange(idx, "widthMm", e.target.value)}
                  />
                  <NumberInput
                    className={inputClass}
                    placeholder="6"
                    value={row.lengthM}
                    onChange={(e) => handleTimberChange(idx, "lengthM", e.target.value)}
                  />
                  <NumberInput
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
                <label className={labelClass}>
                  {t.wagons.nds}
                  {parseFloat(expenseNds) > 0 && <span className="text-red-500 ml-1">*</span>}
                </label>
                <NumberInput
                  className={inputClass}
                  placeholder="0"
                  value={expenseNds}
                  onChange={(e) => setExpenseNds(e.target.value)}
                />
                <select
                  className={expenseSelectClass(expenseNds, expenseNdsPartnerId)}
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
                <label className={labelClass}>
                  {t.wagons.usluga}
                  {parseFloat(expenseUsluga) > 0 && <span className="text-red-500 ml-1">*</span>}
                </label>
                <NumberInput
                  className={inputClass}
                  placeholder="0"
                  value={expenseUsluga}
                  onChange={(e) => setExpenseUsluga(e.target.value)}
                />
                <select
                  className={expenseSelectClass(expenseUsluga, expenseUslugaPartnerId)}
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
                <label className={labelClass}>
                  {t.wagons.tupik}
                  {parseFloat(expenseTupik) > 0 && <span className="text-red-500 ml-1">*</span>}
                </label>
                <NumberInput
                  className={inputClass}
                  placeholder="0"
                  value={expenseTupik}
                  onChange={(e) => setExpenseTupik(e.target.value)}
                />
                <select
                  className={expenseSelectClass(expenseTupik, expenseTupikPartnerId)}
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
                <label className={labelClass}>
                  {t.wagons.xrannei}
                  {parseFloat(expenseXrannei) > 0 && <span className="text-red-500 ml-1">*</span>}
                </label>
                <NumberInput
                  className={inputClass}
                  placeholder="0"
                  value={expenseXrannei}
                  onChange={(e) => setExpenseXrannei(e.target.value)}
                />
                <select
                  className={expenseSelectClass(expenseXrannei, expenseXranneiPartnerId)}
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
                <label className={labelClass}>
                  {t.wagons.ortish}
                  {parseFloat(expenseOrtish) > 0 && <span className="text-red-500 ml-1">*</span>}
                </label>
                <NumberInput
                  className={inputClass}
                  placeholder="0"
                  value={expenseOrtish}
                  onChange={(e) => setExpenseOrtish(e.target.value)}
                />
                <select
                  className={expenseSelectClass(expenseOrtish, expenseOrtishPartnerId)}
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
                <label className={labelClass}>
                  {t.wagons.tushurish}
                  {parseFloat(expenseTushurish) > 0 && <span className="text-red-500 ml-1">*</span>}
                </label>
                <NumberInput
                  className={inputClass}
                  placeholder="0"
                  value={expenseTushurish}
                  onChange={(e) => setExpenseTushurish(e.target.value)}
                />
                <select
                  className={expenseSelectClass(expenseTushurish, expenseTushirishPartnerId)}
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
                <NumberInput
                  className={inputClass}
                  placeholder="Summa ($)"
                  value={exp.amount}
                  onChange={(e) => handleAdditionalExpenseChange(idx, "amount", e.target.value)}
                />
                <select
                  className={parseFloat(exp.amount) > 0 && !exp.partnerId ? selectRequiredClass : selectClass}
                  value={exp.partnerId}
                  onChange={(e) => handleAdditionalExpenseChange(idx, "partnerId", e.target.value)}
                >
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {parseFloat(exp.amount) > 0 && !exp.partnerId && (
                  <p className="text-xs text-red-500">Hamkorni tanlash majburiy</p>
                )}
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
