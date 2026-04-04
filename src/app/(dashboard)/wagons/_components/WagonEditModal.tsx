"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Lock, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import {
  updateTransport,
  addTransportExpense,
  deleteTransportExpense,
  arriveTransport,
  unloadTransportWithWarehouse,
  closeTransport,
} from "@/lib/actions/wagons";
import { createTimber, updateTimber, deleteTimber } from "@/lib/actions/timbers";
import { getTransportFinancialSummary, type TransportSummary } from "@/lib/actions/transport-summary";
import { t } from "@/i18n/uz";

// ─── Tiplar ───────────────────────────────────────────────────────────────────

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
  supplierCount: number | null;
  customerCount: number | null;
}

// at_border is legacy (kept in DB enum), UI uses only 4 statuses
type TransportStatus = "in_transit" | "at_border" | "arrived" | "unloaded" | "closed";

type UnloadItem = {
  timberId: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};

interface FullTransport {
  id: number;
  type: string;
  number: string | null;
  status: TransportStatus;
  sentAt: string | null;
  arrivedAt: string | null;
  unloadedAt: string | null;
  closedAt: string | null;
  createdAt: Date | string | null;
  fromLocation: string | null;
  toLocation: string | null;
  tonnage: string | null;
  supplierId: number | null;
  supplier?: { name: string } | null;
  codeUzPricePerTon: string | null;
  codeUzSupplierId: number | null;
  codeKzPricePerTon: string | null;
  codeKzSupplierId: number | null;
  rubPricePerCubic: string | null;
  rubExchangeRate: string | null;
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

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────

function calcCub(thicknessMm: number, widthMm: number, lengthM: string, count: number): number {
  return (thicknessMm / 1000) * (widthMm / 1000) * (parseFloat(lengthM) || 0) * count;
}

function StaticField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: TransportStatus }) {
  const map: Record<TransportStatus, { label: string; cls: string }> = {
    in_transit: { label: "Yo'lda",       cls: "bg-yellow-100 text-yellow-700" },
    at_border:  { label: "Chegara",      cls: "bg-orange-100 text-orange-700" },
    arrived:    { label: "Yetib kelgan", cls: "bg-blue-100 text-blue-700" },
    unloaded:   { label: "Tushurilgan",  cls: "bg-purple-100 text-purple-700" },
    closed:     { label: "Yopilgan",     cls: "bg-slate-100 text-slate-500" },
  };
  const s = map[status];
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// Status ogohlantirish matnlari
const STATUS_WARNINGS: Record<string, { title: string; message: string }> = {
  arrived: {
    title: "Yetib kelgan statusiga o'tish",
    message:
      "Quyidagi ma'lumotlar o'zgartirib bo'lmaydigan bo'ladi: Vagon raqami, Jo'natilgan sana, Yetib kelgan sana, Qayerdan/Qayerga, Tonnaj, Rossiya ta'minotchisi, Kod UZ/KZ, Yuk mashina egasi to'lovi. Kod KZ, Kod UZ va Yuk mashina egasi balanslariga qarz yoziladi.",
  },
  unloaded: {
    title: "Tushurilgan statusiga o'tish",
    message:
      "Toshkent soni staticga o'tadi (o'zgartirib bo'lmaydi). Standart xarajatlar (NDS, Usluga, Tupik, Xranenie, Ortish, Tushurish) hamkor balanslariga qarz sifatida yoziladi. RUB kassadan pul chiqariladi.",
  },
  closed: {
    title: "Yopilgan statusiga o'tish",
    message:
      "Vagon yopiladi. Barcha ma'lumotlar muzlatiladi. Bu amalni bajarishdan oldin barcha yog'ochlar sotilgan yoki omborga tushirilgan bo'lishi kerak.",
  },
};

const NEXT_STATUS: Record<string, TransportStatus> = {
  in_transit: "arrived",
  at_border:  "arrived", // legacy: at_border also goes to arrived
  arrived:    "unloaded",
  unloaded:   "closed",
};

// ─── ASOSIY KOMPONENT ─────────────────────────────────────────────────────────

export default function WagonEditModal({
  isOpen,
  onClose,
  transport,
  partners,
  onSuccess,
}: WagonEditModalProps) {
  // ── Tahrirlash statelari (faqat in_transit da ishlaydi) ──
  const [number, setNumber] = useState("");
  const [sentAt, setSentAt] = useState("");
  const [arrivedAt, setArrivedAt] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [tonnage, setTonnage] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const [codeUzPricePerTon, setCodeUzPricePerTon] = useState("");
  const [codeUzSupplierId, setCodeUzSupplierId] = useState("");
  const [codeKzPricePerTon, setCodeKzPricePerTon] = useState("");
  const [codeKzSupplierId, setCodeKzSupplierId] = useState("");

  const [timberList, setTimberList] = useState<TimberItem[]>([]);
  const [newTimber, setNewTimber] = useState({ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" });

  const [rubPricePerCubic, setRubPricePerCubic] = useState("");

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

  const [truckOwnerId, setTruckOwnerId] = useState("");
  const [truckOwnerPayment, setTruckOwnerPayment] = useState("");

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpensePartnerId, setNewExpensePartnerId] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Status o'zgartirish ogohlantirish modali
  const [pendingStatus, setPendingStatus] = useState<TransportStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [unloadItems, setUnloadItems] = useState<UnloadItem[]>([]);

  // Moliyaviy hisobot (closed status uchun)
  const [summary, setSummary] = useState<TransportSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

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
    setCodeUzSupplierId(transport.codeUzSupplierId ? String(transport.codeUzSupplierId) : "");
    setCodeKzPricePerTon(transport.codeKzPricePerTon ?? "");
    setCodeKzSupplierId(transport.codeKzSupplierId ? String(transport.codeKzSupplierId) : "");
    setTimberList(transport.timbers ?? []);
    setRubPricePerCubic(transport.rubPricePerCubic ?? "");
    setExpenseNds(transport.expenseNds ?? "");
    setExpenseNdsPartnerId(transport.expenseNdsPartnerId ? String(transport.expenseNdsPartnerId) : "");
    setExpenseUsluga(transport.expenseUsluga ?? "");
    setExpenseUslugaPartnerId(transport.expenseUslugaPartnerId ? String(transport.expenseUslugaPartnerId) : "");
    setExpenseTupik(transport.expenseTupik ?? "");
    setExpenseTupikPartnerId(transport.expenseTupikPartnerId ? String(transport.expenseTupikPartnerId) : "");
    setExpenseXrannei(transport.expenseXrannei ?? "");
    setExpenseXranneiPartnerId(transport.expenseXranneiPartnerId ? String(transport.expenseXranneiPartnerId) : "");
    setExpenseOrtish(transport.expenseOrtish ?? "");
    setExpenseOrtishPartnerId(transport.expenseOrtishPartnerId ? String(transport.expenseOrtishPartnerId) : "");
    setExpenseTushurish(transport.expenseTushurish ?? "");
    setExpenseTushirishPartnerId(transport.expenseTushirishPartnerId ? String(transport.expenseTushirishPartnerId) : "");
    setTruckOwnerId(transport.truckOwnerId ? String(transport.truckOwnerId) : "");
    setTruckOwnerPayment(transport.truckOwnerPayment ?? "");
    setExpenses(transport.expenses ?? []);
  }, [transport]);

  // Closed statusda moliyaviy hisobotni yuklash
  useEffect(() => {
    if (!transport || transport.status !== "closed") { setSummary(null); return; }
    setIsSummaryLoading(true);
    getTransportFinancialSummary(transport.id)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setIsSummaryLoading(false));
  }, [transport]);

  // ── Partner listalari ──
  const russiaSuppliers = partners.filter((p) => p.type === "russia_supplier");
  const codeSuppliers = partners.filter((p) => p.type === "code_supplier");
  const serviceProviders = partners.filter((p) => p.type === "service_provider");
  const truckOwners = partners.filter((p) => p.type === "truck_owner");

  const status = transport?.status ?? "in_transit";
  const isInTransit = status === "in_transit" || status === "at_border";
  const isArrived = status === "arrived";
  const isUnloaded = status === "unloaded";
  const isClosed = status === "closed";

  // ── Hisoblashlar ──
  const tonnageNum = parseFloat(tonnage) || 0;
  const codeUzTotal = tonnageNum * (parseFloat(codeUzPricePerTon) || 0);
  const codeKzTotal = tonnageNum * (parseFloat(codeKzPricePerTon) || 0);

  const totalCubRussia = timberList.reduce(
    (sum, t) => sum + calcCub(t.thicknessMm, t.widthMm, t.lengthM, t.russiaCount),
    0
  );
  const totalCubTashkent = timberList.reduce(
    (sum, t) => sum + calcCub(t.thicknessMm, t.widthMm, t.lengthM, t.tashkentCount ?? 0),
    0
  );
  const totalCubSupplier = timberList.reduce(
    (sum, t) => sum + calcCub(t.thicknessMm, t.widthMm, t.lengthM, t.supplierCount ?? 0),
    0
  );

  const rubPriceNum = parseFloat(rubPricePerCubic || (transport?.rubPricePerCubic ?? "")) || 0;
  const totalRub = totalCubSupplier * rubPriceNum;
  const avgRate = parseFloat(transport?.rubExchangeRate ?? "") || 0;
  const totalUsd = avgRate > 0 ? totalRub / avgRate : 0;

  // ── Status o'zgartirish ──
  function handleStatusChange(newStatus: TransportStatus) {
    const next = NEXT_STATUS[status];
    if (newStatus !== next) return; // Faqat bitta keyingiga
    if (newStatus === "unloaded") {
      // Toshkent sonini default qilib omborga tushurish ro'yxatini to'ldirish
      const items: UnloadItem[] = timberList
        .filter((t) => (t.tashkentCount ?? 0) > 0)
        .map((t) => ({
          timberId: t.id,
          thicknessMm: t.thicknessMm,
          widthMm: t.widthMm,
          lengthM: String(t.lengthM),
          quantity: t.tashkentCount ?? 0,
        }));
      setUnloadItems(items);
    }
    setPendingStatus(newStatus);
  }

  async function confirmStatusChange() {
    if (!pendingStatus || !transport) return;
    setIsStatusLoading(true);
    setStatusError(null);
    try {
      let result: { ok: true } | { ok: false; error: string };
      if (pendingStatus === "arrived") {
        result = await arriveTransport(transport.id);
      } else if (pendingStatus === "unloaded") {
        result = await unloadTransportWithWarehouse(
          transport.id,
          unloadItems.map((i) => ({
            timberId: i.timberId,
            thicknessMm: i.thicknessMm,
            widthMm: i.widthMm,
            lengthM: parseFloat(i.lengthM),
            quantity: i.quantity,
          }))
        );
      } else if (pendingStatus === "closed") {
        result = await closeTransport(transport.id);
      } else {
        return;
      }
      if (!result.ok) {
        setStatusError(result.error);
        return;
      }
      toast.success(`Status muvaffaqiyatli o'zgartirildi`);
      setPendingStatus(null);
      setStatusError(null);
      onSuccess();
    } catch {
      setStatusError("Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setIsStatusLoading(false);
    }
  }

  // ── Timber amallar ──
  async function handleTashkentChange(timberId: number, value: string) {
    const num = value === "" ? 0 : parseInt(value, 10);
    const val = isNaN(num) ? 0 : num;
    await updateTimber(timberId, { tashkentCount: val });
    setTimberList((prev) =>
      prev.map((item) => (item.id === timberId ? { ...item, tashkentCount: val } : item))
    );
  }

  async function handleSupplierCountChange(timberId: number, value: string) {
    const num = value === "" ? 0 : parseInt(value, 10);
    const val = isNaN(num) ? 0 : num;
    await updateTimber(timberId, { supplierCount: val });
    setTimberList((prev) =>
      prev.map((item) => (item.id === timberId ? { ...item, supplierCount: val } : item))
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
      { ...created, tashkentCount: null, supplierCount: null, customerCount: null },
    ]);
    setNewTimber({ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" });
  }

  async function handleAddTashkentRow() {
    if (!transport) return;
    const nt = newTimber;
    if (!nt.thicknessMm || !nt.widthMm || !nt.lengthM) return;
    const tashkentCount = parseInt(nt.russiaCount) || 0;
    const created = await createTimber({
      transportId: transport.id,
      thicknessMm: parseInt(nt.thicknessMm),
      widthMm: parseInt(nt.widthMm),
      lengthM: parseFloat(nt.lengthM),
      russiaCount: 0,
    });
    await updateTimber(created.id, { tashkentCount });
    setTimberList((prev) => [
      ...prev,
      { ...created, russiaCount: 0, tashkentCount, supplierCount: null, customerCount: null },
    ]);
    setNewTimber({ thicknessMm: "", widthMm: "", lengthM: "", russiaCount: "" });
  }

  async function handleAddSupplierRow() {
    if (!transport) return;
    const nt = newTimber;
    if (!nt.thicknessMm || !nt.widthMm || !nt.lengthM) return;
    const supplierCount = parseInt(nt.russiaCount) || 0;
    const created = await createTimber({
      transportId: transport.id,
      thicknessMm: parseInt(nt.thicknessMm),
      widthMm: parseInt(nt.widthMm),
      lengthM: parseFloat(nt.lengthM),
      russiaCount: 0,
    });
    await updateTimber(created.id, { supplierCount });
    setTimberList((prev) => [
      ...prev,
      { ...created, russiaCount: 0, tashkentCount: 0, supplierCount, customerCount: null },
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
    if (!transport || isClosed) return;
    setIsLoading(true);
    try {
      if (isInTransit) {
        // Hamma narsani saqlash
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
          truckOwnerId: truckOwnerId ? parseInt(truckOwnerId) : undefined,
          truckOwnerPayment: truckOwnerPayment || undefined,
        });
      } else if (isArrived) {
        // Faqat RUB narx saqlash (asosiy ma'lumotlar static)
        await updateTransport(transport.id, {
          rubPricePerCubic: rubPricePerCubic || undefined,
        });
      }
      // Unloaded va Closed da asosiy saqlash yo'q (faqat qo'shimcha xarajat va timbers orqali)
      toast.success("Saqlandi");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }

  // ── CSS sinflari ──
  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
  const selectClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white";
  const labelClass = "block text-xs text-slate-600 mb-1";

  const partnerName = (id: string, list: Partner[]) =>
    list.find((p) => p.id === parseInt(id))?.name ?? "—";

  if (!transport) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Transport tahrirlash" size="xl">
        <div className="space-y-6">

          {/* ── ASOSIY MA'LUMOTLAR ── */}
          <section>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">{t.wagons.basicInfo}</h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                {/* Status o'zgartirish dropdown */}
                {!isClosed && NEXT_STATUS[status] && (
                  <button
                    onClick={() => handleStatusChange(NEXT_STATUS[status] as TransportStatus)}
                    className="text-xs px-2.5 py-1 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                  >
                    → {STATUS_WARNINGS[NEXT_STATUS[status]]?.title.split(" ")[0]}...
                  </button>
                )}
              </div>
            </div>

            {/* Sanalar (har doim ko'rinadi) */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div>📅 Yaratilgan: <span className="font-medium text-slate-700">{transport.createdAt ? (transport.createdAt instanceof Date ? transport.createdAt.toISOString().slice(0, 10) : String(transport.createdAt).slice(0, 10)) : "—"}</span></div>
              {transport.arrivedAt && <div>🚂 Yetib kelgan: <span className="font-medium text-slate-700">{transport.arrivedAt}</span></div>}
              {transport.unloadedAt && <div>📦 Tushurilgan: <span className="font-medium text-slate-700">{transport.unloadedAt}</span></div>}
              {transport.closedAt && <div>🔒 Yopilgan: <span className="font-medium text-slate-700">{transport.closedAt}</span></div>}
            </div>

            {isInTransit ? (
              /* Tahrirlash rejimi */
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{t.wagons.wagonNumber}</label>
                  <input className={inputClass} placeholder="58374291" value={number} onChange={(e) => setNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.wagons.sentAt}</label>
                    <input type="date" className={inputClass} value={sentAt} onChange={(e) => setSentAt(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.wagons.arrivedAt}</label>
                    <input type="date" className={inputClass} value={arrivedAt} onChange={(e) => setArrivedAt(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.wagons.from}</label>
                    <input className={inputClass} placeholder="Krasnoyarsk" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.wagons.to}</label>
                    <input className={inputClass} placeholder="Toshkent" value={toLocation} onChange={(e) => setToLocation(e.target.value)} />
                  </div>
                </div>
                {transport.type === "wagon" && (
                  <div>
                    <label className={labelClass}>{t.wagons.tonnage}</label>
                    <NumberInput className={inputClass} placeholder="65" value={tonnage} onChange={(e) => setTonnage(e.target.value)} />
                  </div>
                )}
                {transport.type === "truck" && (
                  <div>
                    <label className={labelClass}>Yuk mashina egasiga beriladigan pul</label>
                    <div className="flex items-center gap-2">
                      <NumberInput className={inputClass} placeholder="0" value={truckOwnerPayment} onChange={(e) => setTruckOwnerPayment(e.target.value)} />
                      <span className="text-sm text-slate-500 whitespace-nowrap">$</span>
                      <select className={selectClass} value={truckOwnerId} onChange={(e) => setTruckOwnerId(e.target.value)}>
                        <option value="">— Egasi —</option>
                        {truckOwners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className={labelClass}>{t.wagons.supplier}</label>
                  <select className={selectClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">— Tanlang —</option>
                    {russiaSuppliers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              /* Static ko'rinish */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <StaticField label={t.wagons.wagonNumber} value={transport.number} />
                  <StaticField label={t.wagons.sentAt} value={transport.sentAt} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StaticField label={t.wagons.from} value={transport.fromLocation} />
                  <StaticField label={t.wagons.to} value={transport.toLocation} />
                </div>
                {transport.type === "wagon" && (
                  <StaticField label={t.wagons.tonnage} value={transport.tonnage ? `${transport.tonnage} t` : null} />
                )}
                {transport.type === "truck" && (
                  <StaticField label="Yuk mashina egasiga to'lov" value={transport.truckOwnerPayment ? `$${transport.truckOwnerPayment}` : null} />
                )}
                <StaticField label={t.wagons.supplier} value={transport.supplier?.name} />
              </div>
            )}
          </section>

          {/* ── KODLAR (faqat wagon, faqat in_transit da tahrirlash) ── */}
          {transport.type === "wagon" && (
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">{t.wagons.codes}</h3>
              {isInTransit ? (
                <div className="space-y-3">
                  {/* Kod UZ */}
                  <div>
                    <span className="text-xs font-medium text-blue-600 mb-2 block">{t.wagons.codeUz}</span>
                    <div className="flex items-center gap-2">
                      <NumberInput className={inputClass} placeholder={t.wagons.pricePerTon} value={codeUzPricePerTon} onChange={(e) => setCodeUzPricePerTon(e.target.value)} />
                      <span className="text-xs text-slate-500 whitespace-nowrap">$/t</span>
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap min-w-[90px]">
                        {t.wagons.total}: ${codeUzTotal.toFixed(2)}
                      </span>
                    </div>
                    <select className={`${selectClass} mt-2`} value={codeUzSupplierId} onChange={(e) => setCodeUzSupplierId(e.target.value)}>
                      <option value="">Kimdan olindi...</option>
                      {codeSuppliers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {/* Kod KZ */}
                  <div>
                    <span className="text-xs font-medium text-blue-600 mb-2 block">{t.wagons.codeKz}</span>
                    <div className="flex items-center gap-2">
                      <NumberInput className={inputClass} placeholder={t.wagons.pricePerTon} value={codeKzPricePerTon} onChange={(e) => setCodeKzPricePerTon(e.target.value)} />
                      <span className="text-xs text-slate-500 whitespace-nowrap">$/t</span>
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap min-w-[90px]">
                        {t.wagons.total}: ${codeKzTotal.toFixed(2)}
                      </span>
                    </div>
                    <select className={`${selectClass} mt-2`} value={codeKzSupplierId} onChange={(e) => setCodeKzSupplierId(e.target.value)}>
                      <option value="">Kimdan olindi...</option>
                      {codeSuppliers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{t.wagons.codeUz}</p>
                      <p className="text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        {transport.codeUzPricePerTon ? `${transport.codeUzPricePerTon} $/t → $${(Number(transport.tonnage || 0) * Number(transport.codeUzPricePerTon)).toFixed(0)}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{t.wagons.codeKz}</p>
                      <p className="text-sm bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        {transport.codeKzPricePerTon ? `${transport.codeKzPricePerTon} $/t → $${(Number(transport.tonnage || 0) * Number(transport.codeKzPricePerTon)).toFixed(0)}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── YOG'OCHLAR ── */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">{t.wagons.timbers}</h3>

            {/* ROSSIYA STATIK KO'RINISH (har doim) */}
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Rossiya soni (statik)</p>
              {timberList.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_80px_90px_36px] gap-2 text-xs text-slate-400 font-medium px-1">
                    <span>O'lcham</span>
                    <span className="text-center">Rossiya</span>
                    <span className="text-center">Kub m³</span>
                    <span />
                  </div>
                  {timberList.map((timber) => (
                    <div key={timber.id} className="grid grid-cols-[1fr_80px_90px_36px] gap-2 items-center bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-slate-700">
                        {timber.thicknessMm}×{timber.widthMm}×{timber.lengthM}m
                      </span>
                      <span className="text-sm text-center text-slate-600">{timber.russiaCount}</span>
                      <span className="text-sm text-center font-medium text-slate-700">
                        {calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.russiaCount).toFixed(3)}
                      </span>
                      {isInTransit && (
                        <button onClick={() => handleDeleteTimber(timber.id)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                      {!isInTransit && <span />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-2">Yog'och qo'shilmagan</p>
              )}
              <div className="pt-2 mt-1 text-sm text-slate-600">
                {t.wagons.totalCubRussia}: <span className="font-semibold text-slate-800">{totalCubRussia.toFixed(3)} m³</span>
              </div>
            </div>

            {/* ROSSIYA QATOR QO'SHISH (faqat in_transit) */}
            {isInTransit && (
              <div className="border border-dashed border-slate-300 rounded-lg p-3 mb-3">
                <p className="text-xs text-slate-500 mb-2 font-medium">Yangi taxta qo'shish:</p>
                <div className="grid grid-cols-5 gap-2 items-center">
                  <NumberInput placeholder="Qalinlik (mm)" className={inputClass} value={newTimber.thicknessMm} onChange={(e) => setNewTimber((p) => ({ ...p, thicknessMm: e.target.value }))} />
                  <NumberInput placeholder="Eni (mm)" className={inputClass} value={newTimber.widthMm} onChange={(e) => setNewTimber((p) => ({ ...p, widthMm: e.target.value }))} />
                  <NumberInput placeholder="Uzunlik (m)" className={inputClass} value={newTimber.lengthM} onChange={(e) => setNewTimber((p) => ({ ...p, lengthM: e.target.value }))} />
                  <NumberInput placeholder="Rossiya soni" className={inputClass} value={newTimber.russiaCount} onChange={(e) => setNewTimber((p) => ({ ...p, russiaCount: e.target.value }))} />
                  <button onClick={handleAddTimber} className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg py-2 hover:bg-blue-50">
                    <Plus size={14} /> Qo'shish
                  </button>
                </div>
              </div>
            )}

            {/* TOSHKENT INPUTLAR (arrived statusi) */}
            {isArrived && (
              <div className="border border-blue-200 rounded-lg p-3 mb-3 bg-blue-50/30">
                <p className="text-xs font-semibold text-blue-700 mb-2">Toshkent soni (tahrirlash):</p>
                <div className="space-y-1 mb-3">
                  <div className="grid grid-cols-[80px_80px_70px_90px_80px_36px] gap-2 text-xs text-slate-400 font-medium px-1">
                    <span>Qalinlik</span>
                    <span>Eni</span>
                    <span>Uzunlik</span>
                    <span className="text-center">Toshkent</span>
                    <span className="text-center">Kub m³</span>
                    <span />
                  </div>
                  {timberList.map((timber) => (
                    <div key={timber.id} className="grid grid-cols-[80px_80px_70px_90px_80px_36px] gap-2 items-center bg-white rounded-lg px-3 py-2 border border-blue-100">
                      <span className="text-sm text-slate-600">{timber.thicknessMm}</span>
                      <span className="text-sm text-slate-600">{timber.widthMm}</span>
                      <span className="text-sm text-slate-600">{timber.lengthM}</span>
                      <NumberInput
                        defaultValue={timber.tashkentCount ?? ""}
                        placeholder="0"
                        min={0}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        onBlur={(e) => handleTashkentChange(timber.id, e.target.value)}
                      />
                      <span className="text-sm text-center font-medium text-slate-700">
                        {calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.tashkentCount ?? 0).toFixed(3)}
                      </span>
                      <button onClick={() => handleDeleteTimber(timber.id)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Yangi toshkent qatori */}
                <div className="border border-dashed border-blue-300 rounded-lg p-2">
                  <p className="text-xs text-blue-500 mb-2 font-medium">+ Qator qo'shish:</p>
                  <div className="grid grid-cols-5 gap-2">
                    <NumberInput placeholder="Qalinlik (mm)" className={inputClass} value={newTimber.thicknessMm} onChange={(e) => setNewTimber((p) => ({ ...p, thicknessMm: e.target.value }))} />
                    <NumberInput placeholder="Eni (mm)" className={inputClass} value={newTimber.widthMm} onChange={(e) => setNewTimber((p) => ({ ...p, widthMm: e.target.value }))} />
                    <NumberInput placeholder="Uzunlik (m)" className={inputClass} value={newTimber.lengthM} onChange={(e) => setNewTimber((p) => ({ ...p, lengthM: e.target.value }))} />
                    <NumberInput placeholder="Toshkent soni" className={inputClass} value={newTimber.russiaCount} onChange={(e) => setNewTimber((p) => ({ ...p, russiaCount: e.target.value }))} />
                    <button onClick={handleAddTashkentRow} className="flex items-center justify-center gap-1 text-sm text-blue-600 border border-blue-300 rounded-lg py-2 hover:bg-blue-50">
                      <Plus size={14} /> Qo'shish
                    </button>
                  </div>
                </div>
                <div className="pt-2 mt-1 text-sm text-blue-700 font-medium">
                  {t.wagons.totalCubTashkent}: <span className="font-bold">{totalCubTashkent.toFixed(3)} m³</span>
                </div>
              </div>
            )}

            {/* TOSHKENT STATIK + TA'MINOTCHI INPUTLAR (unloaded statusi) */}
            {(isUnloaded || isClosed) && (
              <>
                {/* Toshkent statik */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">Toshkent soni (statik)</p>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[1fr_80px_80px_90px_80px_90px] gap-2 text-xs text-slate-400 font-medium px-1">
                      <span>O'lcham</span>
                      <span className="text-center">Toshkent</span>
                      <span className="text-center">Kub m³</span>
                      <span className="text-center text-orange-500">Mijoz</span>
                      <span className="text-center text-orange-500">Kub m³</span>
                      <span />
                    </div>
                    {timberList.map((timber) => (
                      <div key={timber.id} className="grid grid-cols-[1fr_80px_80px_90px_80px_90px] gap-2 items-center bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium text-slate-700">{timber.thicknessMm}×{timber.widthMm}×{timber.lengthM}m</span>
                        <span className="text-sm text-center text-slate-600">{timber.tashkentCount ?? 0}</span>
                        <span className="text-sm text-center font-medium text-slate-700">
                          {calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.tashkentCount ?? 0).toFixed(3)}
                        </span>
                        <span className="text-sm text-center text-orange-600 font-medium">{timber.customerCount ?? 0}</span>
                        <span className="text-sm text-center text-orange-700 font-medium">
                          {calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.customerCount ?? 0).toFixed(3)}
                        </span>
                        <span />
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 mt-1 flex gap-4 text-sm text-slate-600">
                    <span>{t.wagons.totalCubTashkent}: <span className="font-semibold">{totalCubTashkent.toFixed(3)} m³</span></span>
                    <span className="text-orange-600">Mijoz qabul: <span className="font-semibold">
                      {timberList.reduce((sum, t) => sum + calcCub(t.thicknessMm, t.widthMm, t.lengthM, t.customerCount ?? 0), 0).toFixed(3)} m³
                    </span></span>
                  </div>
                </div>

                {/* Ta'minotchi inputlar */}
                <div className="border border-purple-200 rounded-lg p-3 mb-3 bg-purple-50/30">
                  <p className="text-xs font-semibold text-purple-700 mb-2">Ta'minotchi soni (tahrirlash):</p>
                  <div className="space-y-1 mb-3">
                    <div className="grid grid-cols-[80px_80px_70px_90px_80px_36px] gap-2 text-xs text-slate-400 font-medium px-1">
                      <span>Qalinlik</span>
                      <span>Eni</span>
                      <span>Uzunlik</span>
                      <span className="text-center">Ta'minotchi</span>
                      <span className="text-center">Kub m³</span>
                      <span />
                    </div>
                    {timberList.map((timber) => (
                      <div key={timber.id} className="grid grid-cols-[80px_80px_70px_90px_80px_36px] gap-2 items-center bg-white rounded-lg px-3 py-2 border border-purple-100">
                        <span className="text-sm text-slate-600">{timber.thicknessMm}</span>
                        <span className="text-sm text-slate-600">{timber.widthMm}</span>
                        <span className="text-sm text-slate-600">{timber.lengthM}</span>
                        {isUnloaded ? (
                          <NumberInput
                            defaultValue={timber.supplierCount ?? ""}
                            placeholder="0"
                            min={0}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            onBlur={(e) => handleSupplierCountChange(timber.id, e.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-center text-slate-600">{timber.supplierCount ?? 0}</span>
                        )}
                        <span className="text-sm text-center font-medium text-slate-700">
                          {calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.supplierCount ?? 0).toFixed(3)}
                        </span>
                        {isUnloaded ? (
                          <button onClick={() => handleDeleteTimber(timber.id)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                  </div>
                  {isUnloaded && (
                    <div className="border border-dashed border-purple-300 rounded-lg p-2 mb-2">
                      <p className="text-xs text-purple-500 mb-2 font-medium">+ Qator qo'shish:</p>
                      <div className="grid grid-cols-5 gap-2">
                        <NumberInput placeholder="Qalinlik (mm)" className={inputClass} value={newTimber.thicknessMm} onChange={(e) => setNewTimber((p) => ({ ...p, thicknessMm: e.target.value }))} />
                        <NumberInput placeholder="Eni (mm)" className={inputClass} value={newTimber.widthMm} onChange={(e) => setNewTimber((p) => ({ ...p, widthMm: e.target.value }))} />
                        <NumberInput placeholder="Uzunlik (m)" className={inputClass} value={newTimber.lengthM} onChange={(e) => setNewTimber((p) => ({ ...p, lengthM: e.target.value }))} />
                        <NumberInput placeholder="Ta'minotchi soni" className={inputClass} value={newTimber.russiaCount} onChange={(e) => setNewTimber((p) => ({ ...p, russiaCount: e.target.value }))} />
                        <button onClick={handleAddSupplierRow} className="flex items-center justify-center gap-1 text-sm text-purple-600 border border-purple-300 rounded-lg py-2 hover:bg-purple-50">
                          <Plus size={14} /> Qo'shish
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-purple-700 font-medium">
                    {t.wagons.totalCubSupplier}: <span className="font-bold">{totalCubSupplier.toFixed(3)} m³</span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ── YOG'OCH XARIDI (RUB) ── */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">{t.wagons.timberPurchase}</h3>
            {isInTransit ? (
              /* Yo'lda: faqat RUB narx kirish */
              <div>
                <label className={labelClass}>{t.wagons.rubPerCubic}</label>
                <NumberInput className={inputClass} placeholder="15000" value={rubPricePerCubic} onChange={(e) => setRubPricePerCubic(e.target.value)} />
              </div>
            ) : isArrived ? (
              /* Yetib kelgan: RUB narx + Toshkent kub hisob */
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>{t.wagons.rubPerCubic}</label>
                  <NumberInput className={inputClass} placeholder="15000" value={rubPricePerCubic} onChange={(e) => setRubPricePerCubic(e.target.value)} />
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>{t.wagons.totalCubTashkent}: <span className="font-semibold">{totalCubTashkent.toFixed(3)} m³</span></p>
                  <p>Kutilgan RUB: <span className="font-semibold">{(totalCubTashkent * (parseFloat(rubPricePerCubic) || 0)).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽</span></p>
                </div>
              </div>
            ) : (
              /* Tushurilgan / Yopilgan: static + Ta'minotchi hisob */
              <div className="space-y-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  <p className="text-sm text-slate-600">{t.wagons.rubPerCubic}: <span className="font-semibold">{transport.rubPricePerCubic || "—"} ₽</span></p>
                </div>
                <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-200 space-y-1">
                  <p className="text-sm text-slate-600">{t.wagons.totalCubSupplier}: <span className="font-semibold">{totalCubSupplier.toFixed(3)} m³</span></p>
                  <p className="text-sm text-slate-600">Jami RUB: <span className="font-semibold text-purple-700">{totalRub.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽</span></p>
                  {avgRate > 0 && (
                    <p className="text-sm text-slate-600">
                      O'rtacha kurs {avgRate.toFixed(0)} ₽/$ → <span className="font-semibold text-green-700">${totalUsd.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── XARAJATLAR ── */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">{t.wagons.expenses}</h3>

            {isInTransit || isArrived ? (
              /* Tahrirlash rejimi */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.wagons.nds}</label>
                    <NumberInput className={inputClass} placeholder="0" value={expenseNds} onChange={(e) => setExpenseNds(e.target.value)} />
                    <select className={`${selectClass} mt-1`} value={expenseNdsPartnerId} onChange={(e) => setExpenseNdsPartnerId(e.target.value)}>
                      <option value="">— {t.wagons.partner} —</option>
                      {serviceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.wagons.usluga}</label>
                    <NumberInput className={inputClass} placeholder="0" value={expenseUsluga} onChange={(e) => setExpenseUsluga(e.target.value)} />
                    <select className={`${selectClass} mt-1`} value={expenseUslugaPartnerId} onChange={(e) => setExpenseUslugaPartnerId(e.target.value)}>
                      <option value="">— {t.wagons.partner} —</option>
                      {serviceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.wagons.tupik}</label>
                    <NumberInput className={inputClass} placeholder="0" value={expenseTupik} onChange={(e) => setExpenseTupik(e.target.value)} />
                    <select className={`${selectClass} mt-1`} value={expenseTupikPartnerId} onChange={(e) => setExpenseTupikPartnerId(e.target.value)}>
                      <option value="">— {t.wagons.partner} —</option>
                      {serviceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.wagons.xrannei}</label>
                    <NumberInput className={inputClass} placeholder="0" value={expenseXrannei} onChange={(e) => setExpenseXrannei(e.target.value)} />
                    <select className={`${selectClass} mt-1`} value={expenseXranneiPartnerId} onChange={(e) => setExpenseXranneiPartnerId(e.target.value)}>
                      <option value="">— {t.wagons.partner} —</option>
                      {serviceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.wagons.ortish}</label>
                    <NumberInput className={inputClass} placeholder="0" value={expenseOrtish} onChange={(e) => setExpenseOrtish(e.target.value)} />
                    <select className={`${selectClass} mt-1`} value={expenseOrtishPartnerId} onChange={(e) => setExpenseOrtishPartnerId(e.target.value)}>
                      <option value="">— {t.wagons.partner} —</option>
                      {serviceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.wagons.tushurish}</label>
                    <NumberInput className={inputClass} placeholder="0" value={expenseTushurish} onChange={(e) => setExpenseTushurish(e.target.value)} />
                    <select className={`${selectClass} mt-1`} value={expenseTushirishPartnerId} onChange={(e) => setExpenseTushirishPartnerId(e.target.value)}>
                      <option value="">— {t.wagons.partner} —</option>
                      {serviceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Static standart xarajatlar */
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: t.wagons.nds, val: transport.expenseNds, pid: transport.expenseNdsPartnerId },
                  { label: t.wagons.usluga, val: transport.expenseUsluga, pid: transport.expenseUslugaPartnerId },
                  { label: t.wagons.tupik, val: transport.expenseTupik, pid: transport.expenseTupikPartnerId },
                  { label: t.wagons.xrannei, val: transport.expenseXrannei, pid: transport.expenseXranneiPartnerId },
                  { label: t.wagons.ortish, val: transport.expenseOrtish, pid: transport.expenseOrtishPartnerId },
                  { label: t.wagons.tushurish, val: transport.expenseTushurish, pid: transport.expenseTushirishPartnerId },
                ].map(({ label, val, pid }) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{val ? `$${Number(val).toFixed(2)}` : "—"}</p>
                    {pid && (
                      <p className="text-xs text-slate-400">{partners.find((p) => p.id === pid)?.name ?? ""}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Qo'shimcha xarajatlar (har doim, closed da ham) */}
            {expenses.map((exp) => (
              <div key={exp.id} className="border border-slate-200 rounded-lg p-3 space-y-1 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{exp.name}</span>
                  {!isClosed && (
                    <button onClick={() => handleDeleteExpense(exp.id)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700">${Number(exp.amount).toFixed(2)}</p>
              </div>
            ))}

            {/* Yangi qo'shimcha xarajat (faqat not-closed) */}
            {!isClosed && (
              <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2 mt-3">
                <p className="text-xs font-medium text-slate-500">Qo'shimcha xarajat qo'shish</p>
                <input className={inputClass} placeholder="Nomi" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} />
                <NumberInput className={inputClass} placeholder="Summa ($)" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} />
                <select className={selectClass} value={newExpensePartnerId} onChange={(e) => setNewExpensePartnerId(e.target.value)}>
                  <option value="">— {t.wagons.partner} —</option>
                  {serviceProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                  onClick={handleAddExpense}
                  disabled={!newExpenseName.trim() || !newExpenseAmount}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={15} /> Qo'shish
                </button>
              </div>
            )}
          </section>
        </div>

          {/* ── MOLIYAVIY HISOBOT (faqat closed) ── */}
          {isClosed && (
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
                <DollarSign size={15} className="text-green-600" />
                Moliyaviy hisobot
              </h3>

              {isSummaryLoading ? (
                <p className="text-sm text-slate-400 text-center py-4">Yuklanmoqda...</p>
              ) : summary ? (
                <div className="space-y-4">

                  {/* Jami ko'rsatkichlar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-red-500 mb-1 flex items-center justify-center gap-1">
                        <TrendingDown size={12} /> Jami xarajat
                      </p>
                      <p className="text-base font-bold text-red-700">
                        ${summary.totalExpensesUsd.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-500 mb-1 flex items-center justify-center gap-1">
                        <TrendingUp size={12} /> Jami daromad
                      </p>
                      <p className="text-base font-bold text-green-700">
                        ${summary.totalIncomeUsd.toFixed(2)}
                      </p>
                    </div>
                    <div className={`border rounded-lg p-3 text-center ${summary.netProfitUsd >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
                      <p className={`text-xs mb-1 ${summary.netProfitUsd >= 0 ? "text-blue-500" : "text-orange-500"}`}>
                        Sof foyda
                      </p>
                      <p className={`text-base font-bold ${summary.netProfitUsd >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                        {summary.netProfitUsd >= 0 ? "+" : ""}${summary.netProfitUsd.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Xarajatlar tafsiloti */}
                  {summary.expenseBreakdown.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Xarajatlar tafsiloti</p>
                      <div className="space-y-1">
                        {summary.expenseBreakdown.map((exp, i) => (
                          <div key={i} className="flex items-center justify-between bg-red-50/50 rounded-lg px-3 py-1.5">
                            <span className="text-sm text-slate-600">{exp.name}</span>
                            <span className="text-sm font-semibold text-red-600">${exp.amountUsd.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hamkorlarga qarzlar */}
                  {summary.ourDebts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Bizning qarzlarimiz (hamkorlarga)</p>
                      <div className="space-y-1">
                        {summary.ourDebts.map((debt, i) => (
                          <div key={i} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-1.5 border border-orange-100">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{debt.partnerName}</p>
                              <p className="text-xs text-slate-400">{debt.description ?? ""} {debt.createdAt ? `• ${debt.createdAt}` : ""}</p>
                            </div>
                            <span className="text-sm font-semibold text-orange-600">
                              -{debt.amount.toFixed(2)} {debt.currency.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mijozlar qarzi */}
                  {summary.customerDebts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Mijozlar qarzi (bizga)</p>
                      <div className="space-y-1">
                        {summary.customerDebts.map((debt, i) => (
                          <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{debt.customerName}</p>
                              <p className="text-xs text-slate-400">
                                Jami: ${debt.totalSentUsd.toFixed(2)} • To'langan: ${debt.paidAmount.toFixed(2)} {debt.createdAt ? `• ${debt.createdAt}` : ""}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">
                              +${debt.remaining.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.ourDebts.length === 0 && summary.customerDebts.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">Hech qanday qarz mavjud emas</p>
                  )}
                </div>
              ) : null}
            </section>
          )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
          >
            {t.common.cancel}
          </button>
          {!isClosed && (isInTransit || isArrived) && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Saqlanmoqda..." : t.common.save}
            </button>
          )}
        </div>
      </Modal>

      {/* Omborxonaga tushurish modali (faqat unloaded uchun) */}
      {pendingStatus === "unloaded" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} className="text-orange-500" />
              <h3 className="text-base font-semibold text-slate-800">Omborxonaga tushurish</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Quyidagi o&apos;lchamlar omborxonaga tushiriladi. Kerak bo&apos;lmaganlarni o&apos;chirib tashlang.
            </p>
            {unloadItems.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg mb-4">
                Toshkent soni kiritilgan taxtalar topilmadi
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-medium text-slate-600">O&apos;lcham</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Soni (dona)</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unloadItems.map((item) => (
                      <tr key={item.timberId} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-slate-700">
                          {item.thicknessMm}×{item.widthMm}×{item.lengthM}m
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setUnloadItems((prev) => prev.filter((i) => i.timberId !== item.timberId))}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {statusError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-red-700 mb-1">Xatolik — status o&apos;zgarmadi:</p>
                <p className="text-sm text-red-600 whitespace-pre-line">{statusError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                disabled={isStatusLoading}
                onClick={() => { setPendingStatus(null); setStatusError(null); }}
                className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                disabled={isStatusLoading}
                onClick={confirmStatusChange}
                className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isStatusLoading ? "Bajarilmoqda..." : "Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status o'zgartirish ogohlantirish modali (arrived, closed uchun) */}
      {pendingStatus && pendingStatus !== "unloaded" && STATUS_WARNINGS[pendingStatus] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} className="text-orange-500" />
              <h3 className="text-base font-semibold text-slate-800">
                {STATUS_WARNINGS[pendingStatus].title}
              </h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              {STATUS_WARNINGS[pendingStatus].message}
            </p>

            {statusError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm font-semibold text-red-700 mb-1">Xatolik — status o'zgarmadi:</p>
                <p className="text-sm text-red-600 whitespace-pre-line">{statusError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                disabled={isStatusLoading}
                onClick={() => { setPendingStatus(null); setStatusError(null); }}
                className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                disabled={isStatusLoading}
                onClick={confirmStatusChange}
                className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isStatusLoading ? "Bajarilmoqda..." : "Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
