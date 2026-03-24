"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  DollarSign,
  Truck,
  X,
  ChevronDown,
  Calculator,
} from "lucide-react";
import {
  getCustomsCodes,
  createCustomsCode,
  updateCustomsCode,
  deleteCustomsCode,
  sellCode,
  getCodeSales,
  deleteCodeSale,
} from "@/lib/actions/customs-codes";
import { getWagons } from "@/lib/actions/wagons";
import { getClients } from "@/lib/actions/clients";

// ==========================================
// TYPES
// ==========================================

type WagonOption = {
  id: number;
  wagonNumber: string;
  shipmentId: number | null;
  fromLocation: string | null;
  toLocation: string | null;
  rubToUsdRate: number | null;
  purchaseDate: string | null;
  totalCubicMeters: number | null;
  transportCostUsd: number | null;
  unloadingCostUsd: number | null;
  status: string | null;
  notes: string | null;
  createdAt: Date | null;
  timberCount: number;
};

type ClientOption = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  type: string | null;
  notes: string | null;
  createdAt: Date | null;
  totalDebt: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomsCode = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CodeSale = any;

type CodeFormData = {
  soni: string;
  oy: string;
  kodUz: string;
  kzKod: string;
  jonatishJoyi: string;
  kelishJoyi: string;
  dataZayavki: string;
  tonna: string;
  yuboruvchi: string;
  qabulQiluvchi: string;
  nomerVagon: string;
  nomerOtpravka: string;
  fakticheskiyVes: string;
  okruglonniyVes: string;
  stavkaKz: string;
  stavkaUz: string;
  avgonTarif: string;
  tolov: string;
  paymentType: "cash" | "debt";
  supplierName: string;
  usageType: "own" | "sold";
  wagonId: string;
  notes: string;
};

type SellFormData = {
  clientId: string;
  buyerName: string;
  buyerPhone: string;
  saleStavkaKz: string;
  saleStavkaUz: string;
  paymentType: "cash" | "debt";
  saleDate: string;
  notes: string;
};

const emptyCodeForm: CodeFormData = {
  soni: "",
  oy: "",
  kodUz: "",
  kzKod: "",
  jonatishJoyi: "",
  kelishJoyi: "",
  dataZayavki: "",
  tonna: "",
  yuboruvchi: "",
  qabulQiluvchi: "",
  nomerVagon: "",
  nomerOtpravka: "",
  fakticheskiyVes: "",
  okruglonniyVes: "",
  stavkaKz: "",
  stavkaUz: "",
  avgonTarif: "",
  tolov: "",
  paymentType: "cash",
  supplierName: "",
  usageType: "own",
  wagonId: "",
  notes: "",
};

const emptySellForm: SellFormData = {
  clientId: "",
  buyerName: "",
  buyerPhone: "",
  saleStavkaKz: "",
  saleStavkaUz: "",
  paymentType: "cash",
  saleDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

// ==========================================
// HELPERS
// ==========================================

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }: { status: string | null }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Faol
      </span>
    );
  }
  if (status === "used") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Ishlatilgan
      </span>
    );
  }
  if (status === "sold") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        Sotilgan
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      {status ?? "—"}
    </span>
  );
}

// ==========================================
// MAIN PAGE CONTENT
// ==========================================

function CodesPageContent() {
  const searchParams = useSearchParams();
  const wagonIdParam = searchParams.get("wagonId");

  // Data
  const [codes, setCodes] = useState<CustomsCode[]>([]);
  const [sales, setSales] = useState<CodeSale[]>([]);
  const [wagons, setWagons] = useState<WagonOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<"codes" | "sales">("codes");
  const [isLoading, setIsLoading] = useState(true);
  const [isSalesLoading, setIsSalesLoading] = useState(false);

  // Code modal
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<CustomsCode | null>(null);
  const [codeForm, setCodeForm] = useState<CodeFormData>(emptyCodeForm);
  const [isCodeSubmitting, setIsCodeSubmitting] = useState(false);

  // Sell modal
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellingCode, setSellingCode] = useState<CustomsCode | null>(null);
  const [sellForm, setSellForm] = useState<SellFormData>(emptySellForm);
  const [isSellSubmitting, setIsSellSubmitting] = useState(false);

  // Delete confirm
  const [deleteCodeConfirmId, setDeleteCodeConfirmId] = useState<number | null>(null);
  const [deleteSaleConfirmId, setDeleteSaleConfirmId] = useState<number | null>(null);

  // ==========================================
  // Auto-calculations for code form
  // ==========================================

  const calcTarifKz = useMemo(() => {
    const ves = parseFloat(codeForm.okruglonniyVes);
    const stavka = parseFloat(codeForm.stavkaKz);
    if (!isNaN(ves) && !isNaN(stavka)) return ves * stavka;
    return 0;
  }, [codeForm.okruglonniyVes, codeForm.stavkaKz]);

  const calcTarifUz = useMemo(() => {
    const ves = parseFloat(codeForm.okruglonniyVes);
    const stavka = parseFloat(codeForm.stavkaUz);
    if (!isNaN(ves) && !isNaN(stavka)) return ves * stavka;
    return 0;
  }, [codeForm.okruglonniyVes, codeForm.stavkaUz]);

  const calcObshiyTarif = useMemo(() => {
    const avgon = parseFloat(codeForm.avgonTarif) || 0;
    return calcTarifKz + calcTarifUz + avgon;
  }, [calcTarifKz, calcTarifUz, codeForm.avgonTarif]);

  // ==========================================
  // Auto-calculations for sell form
  // ==========================================

  const sellCalcTarifKz = useMemo(() => {
    if (!sellingCode) return 0;
    const ves = sellingCode.okruglonniyVes || 0;
    const stavka = parseFloat(sellForm.saleStavkaKz);
    if (!isNaN(stavka)) return ves * stavka;
    return 0;
  }, [sellingCode, sellForm.saleStavkaKz]);

  const sellCalcTarifUz = useMemo(() => {
    if (!sellingCode) return 0;
    const ves = sellingCode.okruglonniyVes || 0;
    const stavka = parseFloat(sellForm.saleStavkaUz);
    if (!isNaN(stavka)) return ves * stavka;
    return 0;
  }, [sellingCode, sellForm.saleStavkaUz]);

  const sellCalcObshiy = useMemo(() => {
    const avgon = sellingCode?.avgonTarif || 0;
    return sellCalcTarifKz + sellCalcTarifUz + avgon;
  }, [sellCalcTarifKz, sellCalcTarifUz, sellingCode]);

  const sellProfit = useMemo(() => {
    if (!sellingCode) return 0;
    const oldObshiy = sellingCode.obshiyTarif || 0;
    return sellCalcObshiy - oldObshiy;
  }, [sellingCode, sellCalcObshiy]);

  // ==========================================
  // Load data
  // ==========================================

  async function loadCodes() {
    setIsLoading(true);
    try {
      const data = await getCustomsCodes(wagonIdParam ? { wagonId: Number(wagonIdParam) } : undefined);
      setCodes(data);
    } catch (err) {
      console.error("Kodlarni yuklashda xatolik:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSales() {
    setIsSalesLoading(true);
    try {
      const data = await getCodeSales();
      setSales(data);
    } catch (err) {
      console.error("Sotuvlarni yuklashda xatolik:", err);
    } finally {
      setIsSalesLoading(false);
    }
  }

  async function loadWagons() {
    try {
      const data = await getWagons();
      setWagons(data);
    } catch {
      setWagons([]);
    }
  }

  async function loadClients() {
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      setClients([]);
    }
  }

  useEffect(() => {
    loadCodes();
    loadWagons();
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "sales" && sales.length === 0) {
      loadSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ==========================================
  // Code CRUD
  // ==========================================

  function openAddCodeModal() {
    setEditingCode(null);
    setCodeForm(emptyCodeForm);
    setIsCodeModalOpen(true);
  }

  function openEditCodeModal(code: CustomsCode) {
    setEditingCode(code);
    setCodeForm({
      soni: code.soni || "",
      oy: code.oy || "",
      kodUz: code.kodUz || "",
      kzKod: code.kzKod || "",
      jonatishJoyi: code.jonatishJoyi || "",
      kelishJoyi: code.kelishJoyi || "",
      dataZayavki: code.dataZayavki || "",
      tonna: code.tonna != null ? String(code.tonna) : "",
      yuboruvchi: code.yuboruvchi || "",
      qabulQiluvchi: code.qabulQiluvchi || "",
      nomerVagon: code.nomerVagon || "",
      nomerOtpravka: code.nomerOtpravka || "",
      fakticheskiyVes: code.fakticheskiyVes != null ? String(code.fakticheskiyVes) : "",
      okruglonniyVes: code.okruglonniyVes != null ? String(code.okruglonniyVes) : "",
      stavkaKz: code.stavkaKz != null ? String(code.stavkaKz) : "",
      stavkaUz: code.stavkaUz != null ? String(code.stavkaUz) : "",
      avgonTarif: code.avgonTarif != null ? String(code.avgonTarif) : "",
      tolov: code.tolov != null ? String(code.tolov) : "",
      paymentType: "cash",
      supplierName: "",
      usageType: code.usageType || "own",
      wagonId: code.wagonId != null ? String(code.wagonId) : "",
      notes: code.notes || "",
    });
    setIsCodeModalOpen(true);
  }

  function closeCodeModal() {
    setIsCodeModalOpen(false);
    setEditingCode(null);
    setCodeForm(emptyCodeForm);
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsCodeSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        soni: codeForm.soni.trim() || undefined,
        oy: codeForm.oy || undefined,
        kodUz: codeForm.kodUz.trim() || undefined,
        kzKod: codeForm.kzKod.trim() || undefined,
        jonatishJoyi: codeForm.jonatishJoyi.trim() || undefined,
        kelishJoyi: codeForm.kelishJoyi.trim() || undefined,
        dataZayavki: codeForm.dataZayavki || undefined,
        tonna: codeForm.tonna ? Number(codeForm.tonna) : undefined,
        yuboruvchi: codeForm.yuboruvchi.trim() || undefined,
        qabulQiluvchi: codeForm.qabulQiluvchi.trim() || undefined,
        nomerVagon: codeForm.nomerVagon.trim() || undefined,
        nomerOtpravka: codeForm.nomerOtpravka.trim() || undefined,
        fakticheskiyVes: codeForm.fakticheskiyVes ? Number(codeForm.fakticheskiyVes) : undefined,
        okruglonniyVes: codeForm.okruglonniyVes ? Number(codeForm.okruglonniyVes) : undefined,
        stavkaKz: codeForm.stavkaKz ? Number(codeForm.stavkaKz) : undefined,
        stavkaUz: codeForm.stavkaUz ? Number(codeForm.stavkaUz) : undefined,
        avgonTarif: codeForm.avgonTarif ? Number(codeForm.avgonTarif) : undefined,
        tarifKz: calcTarifKz || undefined,
        tarifUz: calcTarifUz || undefined,
        obshiyTarif: calcObshiyTarif || undefined,
        tolov: codeForm.tolov ? Number(codeForm.tolov) : undefined,
        paymentType: codeForm.tolov ? codeForm.paymentType : undefined,
        supplierName: codeForm.paymentType === "debt" ? codeForm.supplierName.trim() || undefined : undefined,
        usageType: codeForm.usageType,
        wagonId: codeForm.usageType === "own" && codeForm.wagonId ? Number(codeForm.wagonId) : undefined,
        notes: codeForm.notes.trim() || undefined,
      };

      if (editingCode) {
        await updateCustomsCode(editingCode.id, payload);
      } else {
        await createCustomsCode(payload);
      }
      await loadCodes();
      closeCodeModal();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsCodeSubmitting(false);
    }
  }

  async function handleDeleteCode(id: number) {
    try {
      await deleteCustomsCode(id);
      await loadCodes();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
    } finally {
      setDeleteCodeConfirmId(null);
    }
  }

  // ==========================================
  // Assign to wagon (change status to used)
  // ==========================================

  async function handleAssignToWagon(code: CustomsCode) {
    try {
      await updateCustomsCode(code.id, { usageType: "own", status: "used" });
      await loadCodes();
    } catch (err) {
      console.error("Vagonga biriktirishda xatolik:", err);
    }
  }

  // ==========================================
  // Sell code
  // ==========================================

  function openSellModal(code: CustomsCode) {
    setSellingCode(code);
    setSellForm(emptySellForm);
    setIsSellModalOpen(true);
  }

  function closeSellModal() {
    setIsSellModalOpen(false);
    setSellingCode(null);
    setSellForm(emptySellForm);
  }

  async function handleSellSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sellingCode) return;
    if (!sellForm.clientId && !sellForm.buyerName.trim()) return;

    setIsSellSubmitting(true);
    try {
      await sellCode(sellingCode.id, {
        clientId: sellForm.clientId ? Number(sellForm.clientId) : undefined,
        buyerName: sellForm.buyerName.trim() || undefined,
        buyerPhone: sellForm.buyerPhone.trim() || undefined,
        saleStavkaKz: Number(sellForm.saleStavkaKz) || 0,
        saleStavkaUz: Number(sellForm.saleStavkaUz) || 0,
        paymentType: sellForm.paymentType as "cash" | "debt",
        saleDate: sellForm.saleDate,
        notes: sellForm.notes.trim() || undefined,
      });
      await loadCodes();
      setSales([]);
      closeSellModal();
    } catch (err) {
      console.error("Sotishda xatolik:", err);
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSellSubmitting(false);
    }
  }

  // ==========================================
  // Delete sale
  // ==========================================

  async function handleDeleteSale(id: number) {
    try {
      await deleteCodeSale(id);
      await loadSales();
    } catch (err) {
      console.error("Sotuvni o'chirishda xatolik:", err);
    } finally {
      setDeleteSaleConfirmId(null);
    }
  }

  // ==========================================
  // Filtered codes
  // ==========================================

  const filteredCodes = useMemo(() => {
    if (!wagonIdParam) return codes;
    const wId = Number(wagonIdParam);
    return codes.filter((c: CustomsCode) => c.wagonId === wId);
  }, [codes, wagonIdParam]);

  // Code buyers from clients
  const codeBuyers = useMemo(() => {
    return clients.filter((c) => c.type === "code_buyer");
  }, [clients]);

  // ==========================================
  // Input class helper
  // ==========================================

  const inputClass =
    "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";
  const readonlyClass =
    "w-full px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-600 font-medium";

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div>
      {/* Breadcrumb when filtered by wagon */}
      {wagonIdParam && (
        <div className="mb-4">
          <Link
            href="/wagons"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            &larr; Vagonlar
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Bojxona kodlari
          {wagonIdParam && (
            <span className="text-base font-normal text-slate-400 ml-2">
              (Vagon #{wagonIdParam})
            </span>
          )}
        </h1>
        {activeTab === "codes" && (
          <button
            onClick={openAddCodeModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Kod qo&apos;shish
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("codes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "codes"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck size={15} />
          Kodlar
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "sales"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <DollarSign size={15} />
          Sotilgan kodlar
        </button>
      </div>

      {/* ===================== TAB 1: CODES TABLE ===================== */}
      {activeTab === "codes" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
          ) : filteredCodes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Ma&apos;lumot topilmadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-3 py-3 font-semibold text-slate-600 w-8">#</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-600">Kod UZ</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-600">KZ kod</th>
                    <th className="text-left px-3 py-3 font-semibold text-slate-600">Vagon</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">Okr.ves</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">St.KZ</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">Tarif KZ</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">St.UZ</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">Tarif UZ</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">Avg.tarif</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">Obshiy</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-600">To&apos;lov</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-600">Holat</th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[240px]">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code: CustomsCode, index: number) => (
                    <tr
                      key={code.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-800">{code.kodUz || "—"}</td>
                      <td className="px-3 py-3 text-slate-600">{code.kzKod || "—"}</td>
                      <td className="px-3 py-3 text-slate-600">{code.nomerVagon || "—"}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{fmt(code.okruglonniyVes)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{fmt(code.stavkaKz)}</td>
                      <td className="px-3 py-3 text-right text-slate-700 font-medium">{fmt(code.tarifKz)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{fmt(code.stavkaUz)}</td>
                      <td className="px-3 py-3 text-right text-slate-700 font-medium">{fmt(code.tarifUz)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{fmt(code.avgonTarif)}</td>
                      <td className="px-3 py-3 text-right text-slate-800 font-semibold">{fmt(code.obshiyTarif)}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{fmt(code.tolov)}</td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={code.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Vagonga biriktirish — faqat active */}
                          {code.status === "active" && (
                            <button
                              onClick={() => handleAssignToWagon(code)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                              title="Vagonga biriktirish"
                            >
                              <Truck size={12} />
                              Vagonga
                            </button>
                          )}
                          {/* Sotish — faqat active */}
                          {code.status === "active" && (
                            <button
                              onClick={() => openSellModal(code)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                              title="Sotish"
                            >
                              <DollarSign size={12} />
                              Sotish
                            </button>
                          )}
                          {/* Tahrirlash */}
                          <button
                            onClick={() => openEditCodeModal(code)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            title="Tahrirlash"
                          >
                            <Pencil size={13} />
                          </button>
                          {/* O'chirish */}
                          {deleteCodeConfirmId === code.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteCode(code.id)}
                                className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                              >
                                Ha
                              </button>
                              <button
                                onClick={() => setDeleteCodeConfirmId(null)}
                                className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              >
                                Yo&apos;q
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteCodeConfirmId(code.id)}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 size={13} />
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
      )}

      {/* ===================== TAB 2: SOLD CODES TABLE ===================== */}
      {activeTab === "sales" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isSalesLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Ma&apos;lumot topilmadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Kod</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Xaridor</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Yangi St.KZ</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Yangi St.UZ</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Yangi Tarif</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Foyda</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Sana</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale: CodeSale, index: number) => (
                    <tr
                      key={sale.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {sale.customsCode?.kodUz || sale.customsCode?.kzKod || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {sale.client?.name || sale.buyerName || "—"}
                        </div>
                        {(sale.buyerPhone || sale.client?.phone) && (
                          <div className="text-xs text-slate-400">
                            {sale.buyerPhone || sale.client?.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(sale.saleStavkaKz)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(sale.saleStavkaUz)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(sale.saleObshiyTarif)}</td>
                      <td className="px-4 py-3 text-right">
                        {sale.profitUsd != null ? (
                          <span
                            className={
                              sale.profitUsd >= 0
                                ? "font-semibold text-green-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {sale.profitUsd >= 0 ? "+" : ""}
                            {fmt(sale.profitUsd)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{sale.saleDate || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {deleteSaleConfirmId === sale.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteSale(sale.id)}
                                className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                              >
                                Ha
                              </button>
                              <button
                                onClick={() => setDeleteSaleConfirmId(null)}
                                className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              >
                                Yo&apos;q
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteSaleConfirmId(sale.id)}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 size={13} />
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
      )}

      {/* ===================== KOD QO'SHISH / TAHRIRLASH MODAL ===================== */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeCodeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl z-10 my-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingCode ? "Kodni tahrirlash" : "Kod qo'shish"}
              </h2>
              <button
                onClick={closeCodeModal}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCodeSubmit} className="px-6 py-5 space-y-4">
              {/* Row 1: Soni, Oy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Soni</label>
                  <input
                    type="text"
                    value={codeForm.soni}
                    onChange={(e) => setCodeForm((f) => ({ ...f, soni: e.target.value }))}
                    placeholder="Tartib raqami"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Oy</label>
                  <select
                    value={codeForm.oy}
                    onChange={(e) => setCodeForm((f) => ({ ...f, oy: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Oyni tanlang</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Kod UZ, KZ kod */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Kod UZ</label>
                  <input
                    type="text"
                    value={codeForm.kodUz}
                    onChange={(e) => setCodeForm((f) => ({ ...f, kodUz: e.target.value }))}
                    placeholder="O'zbekiston kod raqami"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>KZ kod</label>
                  <input
                    type="text"
                    value={codeForm.kzKod}
                    onChange={(e) => setCodeForm((f) => ({ ...f, kzKod: e.target.value }))}
                    placeholder="Qozog'iston kod raqami"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 3: Jo'natish joyi, Kelish joyi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Jo&apos;natish joyi</label>
                  <input
                    type="text"
                    value={codeForm.jonatishJoyi}
                    onChange={(e) => setCodeForm((f) => ({ ...f, jonatishJoyi: e.target.value }))}
                    placeholder="Jo'natish manzili"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Kelish joyi</label>
                  <input
                    type="text"
                    value={codeForm.kelishJoyi}
                    onChange={(e) => setCodeForm((f) => ({ ...f, kelishJoyi: e.target.value }))}
                    placeholder="Kelish manzili"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 4: Data zayavki, Tonna */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data zayavki</label>
                  <input
                    type="date"
                    value={codeForm.dataZayavki}
                    onChange={(e) => setCodeForm((f) => ({ ...f, dataZayavki: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tonna</label>
                  <input
                    type="number"
                    step="0.01"
                    value={codeForm.tonna}
                    onChange={(e) => setCodeForm((f) => ({ ...f, tonna: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 5: Yuboruvchi, Qabul qiluvchi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Yuboruvchi</label>
                  <input
                    type="text"
                    value={codeForm.yuboruvchi}
                    onChange={(e) => setCodeForm((f) => ({ ...f, yuboruvchi: e.target.value }))}
                    placeholder="Yuboruvchi nomi"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Qabul qiluvchi</label>
                  <input
                    type="text"
                    value={codeForm.qabulQiluvchi}
                    onChange={(e) => setCodeForm((f) => ({ ...f, qabulQiluvchi: e.target.value }))}
                    placeholder="Qabul qiluvchi nomi"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 6: Nomer vagon, Nomer otpravka */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nomer vagon</label>
                  <input
                    type="text"
                    value={codeForm.nomerVagon}
                    onChange={(e) => setCodeForm((f) => ({ ...f, nomerVagon: e.target.value }))}
                    placeholder="Vagon raqami"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nomer otpravka</label>
                  <input
                    type="text"
                    value={codeForm.nomerOtpravka}
                    onChange={(e) => setCodeForm((f) => ({ ...f, nomerOtpravka: e.target.value }))}
                    placeholder="Otpravka raqami"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 7: Fakticheskiy ves, Okruglonniy ves */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fakticheskiy ves</label>
                  <input
                    type="number"
                    step="0.01"
                    value={codeForm.fakticheskiyVes}
                    onChange={(e) => setCodeForm((f) => ({ ...f, fakticheskiyVes: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Okruglonniy ves</label>
                  <input
                    type="number"
                    step="0.01"
                    value={codeForm.okruglonniyVes}
                    onChange={(e) => setCodeForm((f) => ({ ...f, okruglonniyVes: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 8: Stavka KZ, Stavka UZ, Avg'on tarif (inputs) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Stavka KZ</label>
                  <input
                    type="number"
                    step="0.01"
                    value={codeForm.stavkaKz}
                    onChange={(e) => setCodeForm((f) => ({ ...f, stavkaKz: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Stavka UZ</label>
                  <input
                    type="number"
                    step="0.01"
                    value={codeForm.stavkaUz}
                    onChange={(e) => setCodeForm((f) => ({ ...f, stavkaUz: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Avg&apos;on tarif</label>
                  <input
                    type="number"
                    step="0.01"
                    value={codeForm.avgonTarif}
                    onChange={(e) => setCodeForm((f) => ({ ...f, avgonTarif: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 9: Auto-calculated fields (read-only) */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={14} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Avtomatik hisoblangan tariflar
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tarif KZ</label>
                    <div className={readonlyClass}>{fmt(calcTarifKz)}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tarif UZ</label>
                    <div className={readonlyClass}>{fmt(calcTarifUz)}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Obshiy tarif</label>
                    <div className="w-full px-3 py-2 border border-blue-100 rounded-lg text-sm bg-blue-50 text-blue-700 font-semibold">
                      {fmt(calcObshiyTarif)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 10: To'lov */}
              <div>
                <label className={labelClass}>To&apos;lov</label>
                <input
                  type="number"
                  step="0.01"
                  value={codeForm.tolov}
                  onChange={(e) => setCodeForm((f) => ({ ...f, tolov: e.target.value }))}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>

              {/* Row 10b: To'lov turi (radio) */}
              {codeForm.tolov && Number(codeForm.tolov) > 0 && (
                <div>
                  <label className={labelClass}>To&apos;lov turi</label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="codePaymentType"
                        value="cash"
                        checked={codeForm.paymentType === "cash"}
                        onChange={() => setCodeForm((f) => ({ ...f, paymentType: "cash", supplierName: "" }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Naqd to&apos;lash</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="codePaymentType"
                        value="debt"
                        checked={codeForm.paymentType === "debt"}
                        onChange={() => setCodeForm((f) => ({ ...f, paymentType: "debt" }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Qarzga olish</span>
                    </label>
                  </div>

                  {/* Kod sotuvchi (supplier name) - only when debt */}
                  {codeForm.paymentType === "debt" && (
                    <div className="mt-3">
                      <label className={labelClass}>Kod sotuvchi</label>
                      <input
                        type="text"
                        value={codeForm.supplierName}
                        onChange={(e) => setCodeForm((f) => ({ ...f, supplierName: e.target.value }))}
                        placeholder="Kod sotuvchi ismi..."
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Row 11: Usage type (radio) */}
              <div>
                <label className={labelClass}>Foydalanish turi</label>
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="usageType"
                      value="own"
                      checked={codeForm.usageType === "own"}
                      onChange={() => setCodeForm((f) => ({ ...f, usageType: "own", wagonId: "" }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">O&apos;z vagonimiz</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="usageType"
                      value="sold"
                      checked={codeForm.usageType === "sold"}
                      onChange={() => setCodeForm((f) => ({ ...f, usageType: "sold", wagonId: "" }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Sotish uchun</span>
                  </label>
                </div>
              </div>

              {/* Row 12: If "O'z vagonimiz" → select wagon from dropdown */}
              {codeForm.usageType === "own" && (
                <div>
                  <label className={labelClass}>Vagonni tanlang</label>
                  <div className="relative">
                    <select
                      value={codeForm.wagonId}
                      onChange={(e) => setCodeForm((f) => ({ ...f, wagonId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Vagonni tanlang...</option>
                      {wagons.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.wagonNumber} {w.fromLocation ? `(${w.fromLocation}→${w.toLocation ?? "?"})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Izoh */}
              <div>
                <label className={labelClass}>Izoh</label>
                <textarea
                  rows={2}
                  value={codeForm.notes}
                  onChange={(e) => setCodeForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Qo'shimcha izoh..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeCodeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isCodeSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isCodeSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== SOTISH MODAL ===================== */}
      {isSellModalOpen && sellingCode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeSellModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg z-10 my-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Kodni sotish</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kod: {sellingCode.kodUz || sellingCode.kzKod || "—"} &nbsp;|&nbsp;
                  Okr.ves: {sellingCode.okruglonniyVes || "—"} &nbsp;|&nbsp;
                  Obshiy: {fmt(sellingCode.obshiyTarif)}
                </p>
              </div>
              <button
                onClick={closeSellModal}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSellSubmit} className="px-6 py-5 space-y-4">
              {/* Client selection */}
              <div>
                <label className={labelClass}>Xaridor (mijoz)</label>
                <select
                  value={sellForm.clientId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const client = codeBuyers.find((c) => String(c.id) === cId);
                    setSellForm((f) => ({
                      ...f,
                      clientId: cId,
                      buyerName: client ? client.name : f.buyerName,
                      buyerPhone: client?.phone || f.buyerPhone,
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Mijozni tanlang yoki qo&apos;lda kiriting</option>
                  {codeBuyers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual buyer name if no client selected */}
              {!sellForm.clientId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>
                      Xaridor ismi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sellForm.buyerName}
                      onChange={(e) => setSellForm((f) => ({ ...f, buyerName: e.target.value }))}
                      placeholder="Xaridor ismi"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Telefon</label>
                    <input
                      type="text"
                      value={sellForm.buyerPhone}
                      onChange={(e) => setSellForm((f) => ({ ...f, buyerPhone: e.target.value }))}
                      placeholder="+998 90 000 00 00"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* New Stavka KZ, New Stavka UZ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Yangi Stavka KZ</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellForm.saleStavkaKz}
                    onChange={(e) => setSellForm((f) => ({ ...f, saleStavkaKz: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Yangi Stavka UZ</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellForm.saleStavkaUz}
                    onChange={(e) => setSellForm((f) => ({ ...f, saleStavkaUz: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Auto-calculated sale tarifs */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={14} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Yangi tariflar (avtomatik)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Yangi Tarif KZ</label>
                    <div className={readonlyClass}>{fmt(sellCalcTarifKz)}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Yangi Tarif UZ</label>
                    <div className={readonlyClass}>{fmt(sellCalcTarifUz)}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Yangi Obshiy</label>
                    <div className="w-full px-3 py-2 border border-blue-100 rounded-lg text-sm bg-blue-50 text-blue-700 font-semibold">
                      {fmt(sellCalcObshiy)}
                    </div>
                  </div>
                </div>

                {/* Profit preview */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Foyda:</span>
                  <span
                    className={`text-lg font-bold ${
                      sellProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {sellProfit >= 0 ? "+" : ""}
                    {fmt(sellProfit)}
                  </span>
                </div>
              </div>

              {/* Payment type */}
              <div>
                <label className={labelClass}>To&apos;lov turi</label>
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="cash"
                      checked={sellForm.paymentType === "cash"}
                      onChange={() => setSellForm((f) => ({ ...f, paymentType: "cash" }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Naqd</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="debt"
                      checked={sellForm.paymentType === "debt"}
                      onChange={() => setSellForm((f) => ({ ...f, paymentType: "debt" }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Qarzga</span>
                  </label>
                </div>
              </div>

              {/* Sale date */}
              <div>
                <label className={labelClass}>
                  Sana <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={sellForm.saleDate}
                  onChange={(e) => setSellForm((f) => ({ ...f, saleDate: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Izoh</label>
                <textarea
                  rows={2}
                  value={sellForm.notes}
                  onChange={(e) => setSellForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Qo'shimcha izoh..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeSellModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSellSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <DollarSign size={14} />
                  {isSellSubmitting ? "Saqlanmoqda..." : "Sotish"}
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
// DEFAULT EXPORT (wrapped in Suspense)
// ==========================================

export default function CodesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Yuklanmoqda...</div>}>
      <CodesPageContent />
    </Suspense>
  );
}
