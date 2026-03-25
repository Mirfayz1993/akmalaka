"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Train,
  TreePine,
  FileCode,
  ChevronDown,
  ChevronRight,
  X,
  ArrowRightLeft,
} from "lucide-react";
import {
  getWagons,
  getWagon,
  createWagon,
  updateWagon,
  deleteWagon,
  addTimber,
  updateTimber,
  deleteTimber,
  type WagonRow,
  type TimberRow,
  type WagonStatus,
} from "@/lib/actions/wagons";
import { createCurrencyExchange } from "@/lib/actions/cash";
import { getExpenses, createExpense, deleteExpense, type ExpenseWithRelations } from "@/lib/actions/expenses";
import { getPartners } from "@/lib/actions/partners";
import { getCodeSuppliers } from "@/lib/actions/clients";
import { createCustomsCode } from "@/lib/actions/customs-codes";
import { formatTimberDimensions, piecesPerCubicMeter } from "@/lib/utils";

// ==========================================
// TYPES
// ==========================================

type WagonFormData = {
  wagonNumber: string;
  sentDate: string;
  arrivedDate: string;
  fromLocation: string;
  toLocation: string;
  tonnage: string;
  partnerId: string;
  rubToUsdRate: string;
  // Kod UZ
  kodUzName: string;
  kodUzPricePerTon: string;
  kodUzTotal: string;
  kodUzSupplierId: string;
  // Kod KZ
  kodKzName: string;
  kodKzPricePerTon: string;
  kodKzTotal: string;
  kodKzSupplierId: string;
  // Yog'och xaridi (RUB)
  timberPricePerCubicRub: string;
  // Xarajatlar (USD)
  expNds: string;
  expUsluga: string;
  expTupik: string;
  expXrannei: string;
  expKlentgaOrtish: string;
  expYergaTushurish: string;
  // Extra expenses
  extraExpenses: { name: string; amount: string }[];
  status: string;
  notes: string;
};

type TimberFormData = {
  widthMm: string;
  thicknessMm: string;
  lengthM: string;
  quantity: string;
  pricePerCubicRub: string;
  notes: string;
};

type PendingTimber = {
  widthMm: string;
  thicknessMm: string;
  lengthM: string;
  quantity: string;
  pricePerCubicRub: string;
};

type ExchangeFormData = {
  amountUsd: string;
  rate: string;
  date: string;
  notes: string;
};

const WAGON_STATUSES: { value: WagonStatus; label: string }[] = [
  { value: "in_transit", label: "Yo'lda" },
  { value: "at_border", label: "Chegarada" },
  { value: "arrived", label: "Yetib keldi" },
  { value: "unloaded", label: "Tushirildi" },
];

function statusBadge(status: string | null) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    in_transit: { bg: "bg-blue-100", text: "text-blue-700", label: "Yo'lda" },
    at_border: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Chegarada" },
    arrived: { bg: "bg-green-100", text: "text-green-700", label: "Yetib keldi" },
    unloaded: { bg: "bg-purple-100", text: "text-purple-700", label: "Tushirildi" },
  };
  const s = map[status ?? ""] ?? { bg: "bg-slate-100", text: "text-slate-600", label: status ?? "—" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function WagonsPage() {
  // Data
  const [wagons, setWagons] = useState<WagonRow[]>([]);
  const [expandedWagonId, setExpandedWagonId] = useState<number | null>(null);
  const [expandedTimber, setExpandedTimber] = useState<TimberRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Partners
  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);
  const [codeSuppliers, setCodeSuppliers] = useState<{ id: number; name: string }[]>([]);

  // Modals
  const [wagonModal, setWagonModal] = useState(false);
  const [editingWagonId, setEditingWagonId] = useState<number | null>(null);
  const [wagonForm, setWagonForm] = useState<WagonFormData>({
    wagonNumber: "",
    sentDate: "",
    arrivedDate: "",
    fromLocation: "",
    toLocation: "",
    tonnage: "",
    partnerId: "",
    rubToUsdRate: "",
    kodUzName: "",
    kodUzPricePerTon: "",
    kodUzTotal: "",
    kodUzSupplierId: "",
    kodKzName: "",
    kodKzPricePerTon: "",
    kodKzTotal: "",
    kodKzSupplierId: "",
    timberPricePerCubicRub: "",
    expNds: "0",
    expUsluga: "0",
    expTupik: "0",
    expXrannei: "0",
    expKlentgaOrtish: "0",
    expYergaTushurish: "0",
    extraExpenses: [],
    status: "in_transit",
    notes: "",
  });

  const [timberModal, setTimberModal] = useState(false);
  const [editingTimberId, setEditingTimberId] = useState<number | null>(null);
  const [timberWagonId, setTimberWagonId] = useState<number | null>(null);
  const [timberForm, setTimberForm] = useState<TimberFormData>({
    widthMm: "",
    thicknessMm: "",
    lengthM: "",
    quantity: "",
    pricePerCubicRub: "",
    notes: "",
  });

  const [exchangeModal, setExchangeModal] = useState(false);
  const [exchangeWagonId, setExchangeWagonId] = useState<number | null>(null);
  const [exchangeForm, setExchangeForm] = useState<ExchangeFormData>({
    amountUsd: "",
    rate: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [deleteModal, setDeleteModal] = useState<{ type: "wagon" | "timber"; id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Expenses
  const [wagonExpenses, setWagonExpenses] = useState<ExpenseWithRelations[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseWagonId, setExpenseWagonId] = useState<number | null>(null);
  const [expenseForm, setExpenseForm] = useState({ category: "transport", amount: "", description: "" });

  // Inline timber entries for new wagon creation
  const [wagonTimberEntries, setWagonTimberEntries] = useState<PendingTimber[]>([]);

  // Existing timbers shown in edit modal
  const [editTimberList, setEditTimberList] = useState<TimberRow[]>([]);
  const [inlineTimberForm, setInlineTimberForm] = useState<PendingTimber>({ widthMm: "", thicknessMm: "", lengthM: "", quantity: "", pricePerCubicRub: "" });
  const timberFirstInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadWagons = useCallback(async () => {
    try {
      const data = await getWagons();
      setWagons(data);
    } catch (e) {
      console.error("Vagonlarni yuklashda xato:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTimber = useCallback(async (wagonId: number) => {
    try {
      const wagon = await getWagon(wagonId);
      if (wagon) {
        setExpandedTimber(wagon.timber);
      }
    } catch (e) {
      console.error("Taxtalarni yuklashda xato:", e);
    }
  }, []);

  useEffect(() => {
    loadWagons();
    getPartners().then((p) => setPartners(p.map((x: any) => ({ id: x.id, name: x.name }))));
    getCodeSuppliers().then((s) => setCodeSuppliers(s));
  }, [loadWagons]);

  // ==========================================
  // EXPAND/COLLAPSE
  // ==========================================

  const loadExpensesForWagon = useCallback(async (wagonId: number) => {
    try {
      const expData = await getExpenses({ wagonId });
      setWagonExpenses(expData);
    } catch (e) {
      console.error("Xarajatlarni yuklashda xato:", e);
    }
  }, []);

  const toggleExpand = async (wagonId: number) => {
    if (expandedWagonId === wagonId) {
      setExpandedWagonId(null);
      setExpandedTimber([]);
      setWagonExpenses([]);
      setShowExpenseForm(false);
    } else {
      setExpandedWagonId(wagonId);
      await Promise.all([loadTimber(wagonId), loadExpensesForWagon(wagonId)]);
    }
  };

  const openExpenseForm = (wagonId: number) => {
    setExpenseWagonId(wagonId);
    setExpenseForm({ category: "transport", amount: "", description: "" });
    setShowExpenseForm(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseWagonId || !expenseForm.amount || !expenseForm.description) return;
    setSaving(true);
    try {
      await createExpense({
        wagonId: expenseWagonId,
        category: expenseForm.category as any,
        description: expenseForm.description,
        amountUsd: parseFloat(expenseForm.amount),
        date: new Date().toISOString().slice(0, 10),
      });
      setShowExpenseForm(false);
      await loadExpensesForWagon(expenseWagonId);
    } catch (e) {
      console.error("Xarajatni saqlashda xato:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    setSaving(true);
    try {
      await deleteExpense(id);
      if (expandedWagonId) await loadExpensesForWagon(expandedWagonId);
    } catch (e) {
      console.error("Xarajatni o'chirishda xato:", e);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // WAGON MODAL
  // ==========================================

  const defaultWagonForm: WagonFormData = {
    wagonNumber: "",
    sentDate: "",
    arrivedDate: "",
    fromLocation: "",
    toLocation: "",
    tonnage: "",
    partnerId: "",
    rubToUsdRate: "",
    kodUzName: "",
    kodUzPricePerTon: "",
    kodUzTotal: "",
    kodUzSupplierId: "",
    kodKzName: "",
    kodKzPricePerTon: "",
    kodKzTotal: "",
    kodKzSupplierId: "",
    timberPricePerCubicRub: "",
    expNds: "0",
    expUsluga: "0",
    expTupik: "0",
    expXrannei: "0",
    expKlentgaOrtish: "0",
    expYergaTushurish: "0",
    extraExpenses: [],
    status: "in_transit",
    notes: "",
  };

  const openCreateWagon = () => {
    setEditingWagonId(null);
    setWagonForm({ ...defaultWagonForm });
    setWagonTimberEntries([]);
    setEditTimberList([]);
    setWagonModal(true);
  };

  const openEditWagon = async (id: number) => {
    const wagon = await getWagon(id);
    if (!wagon) return;
    setEditingWagonId(id);
    setWagonForm({
      ...defaultWagonForm,
      wagonNumber: wagon.wagonNumber,
      sentDate: wagon.sentDate ?? "",
      arrivedDate: wagon.arrivedDate ?? "",
      fromLocation: wagon.fromLocation ?? "",
      toLocation: wagon.toLocation ?? "",
      tonnage: wagon.tonnage?.toString() ?? "",
      partnerId: wagon.partnerId?.toString() ?? "",
      rubToUsdRate: wagon.rubToUsdRate?.toString() ?? "",
      status: wagon.status ?? "in_transit",
      notes: wagon.notes ?? "",
    });
    setEditTimberList(wagon.timber as TimberRow[]);
    setWagonTimberEntries([]);
    setWagonModal(true);
  };

  const saveWagon = async () => {
    if (!wagonForm.wagonNumber.trim()) return;
    setSaving(true);
    try {
      const payload = {
        wagonNumber: wagonForm.wagonNumber.trim(),
        sentDate: wagonForm.sentDate || undefined,
        arrivedDate: wagonForm.arrivedDate || undefined,
        fromLocation: wagonForm.fromLocation.trim() || undefined,
        toLocation: wagonForm.toLocation.trim() || undefined,
        tonnage: parseFloat(wagonForm.tonnage) || undefined,
        partnerId: parseInt(wagonForm.partnerId) || undefined,
        rubToUsdRate: parseFloat(wagonForm.rubToUsdRate) || undefined,
        status: wagonForm.status,
        notes: wagonForm.notes.trim() || undefined,
      };

      let wagonId: number;
      if (editingWagonId) {
        await updateWagon(editingWagonId, payload);
        wagonId = editingWagonId;
      } else {
        const newWagon = await createWagon(payload);
        wagonId = newWagon.id;
      }

      {
        const newWagon = { id: wagonId };

        // Kod to'lovlarini hisoblash (tonna × $/t)
        const tonnageNum = parseFloat(wagonForm.tonnage) || 0;
        const kodUzTotalCalc = tonnageNum * (parseFloat(wagonForm.kodUzPricePerTon) || 0);
        const kodKzTotalCalc = tonnageNum * (parseFloat(wagonForm.kodKzPricePerTon) || 0);

        // 2. Kod UZ
        if (wagonForm.kodUzName.trim()) {
          await createCustomsCode({
            kodUz: wagonForm.kodUzName.trim(),
            tolov: kodUzTotalCalc,
            paymentType: "cash",
            wagonId: newWagon.id,
            usageType: "own",
            tonna: tonnageNum || undefined,
            nomerVagon: wagonForm.wagonNumber.trim(),
            supplierId: parseInt(wagonForm.kodUzSupplierId) || undefined,
          });
        }

        // 3. Kod KZ
        if (wagonForm.kodKzName.trim()) {
          await createCustomsCode({
            kzKod: wagonForm.kodKzName.trim(),
            tolov: kodKzTotalCalc,
            paymentType: "cash",
            wagonId: newWagon.id,
            usageType: "own",
            tonna: tonnageNum || undefined,
            nomerVagon: wagonForm.wagonNumber.trim(),
            supplierId: parseInt(wagonForm.kodKzSupplierId) || undefined,
          });
        }

        // 4. Timber entries
        for (const t of wagonTimberEntries) {
          await addTimber(newWagon.id, {
            widthMm: Number(t.widthMm),
            thicknessMm: Number(t.thicknessMm),
            lengthM: Number(t.lengthM),
            quantity: Number(t.quantity),
            pricePerCubicRub: Number(wagonForm.timberPricePerCubicRub) || Number(t.pricePerCubicRub),
          });
        }

        // 5. Standard expenses
        const today = new Date().toISOString().slice(0, 10);
        const stdExpenses = [
          { cat: "nds", amount: wagonForm.expNds },
          { cat: "usluga", amount: wagonForm.expUsluga },
          { cat: "tupik", amount: wagonForm.expTupik },
          { cat: "xrannei", amount: wagonForm.expXrannei },
          { cat: "klentga_ortish", amount: wagonForm.expKlentgaOrtish },
          { cat: "yerga_tushurish", amount: wagonForm.expYergaTushurish },
        ];
        for (const exp of stdExpenses) {
          if (Number(exp.amount) > 0) {
            await createExpense({
              wagonId: newWagon.id,
              category: exp.cat as any,
              description: exp.cat,
              amountUsd: Number(exp.amount),
              date: today,
            });
          }
        }

        // 6. Extra expenses
        for (const exp of wagonForm.extraExpenses) {
          if (Number(exp.amount) > 0) {
            await createExpense({
              wagonId: newWagon.id,
              category: "other" as any,
              description: exp.name,
              amountUsd: Number(exp.amount),
              date: today,
            });
          }
        }
      }
      setWagonModal(false);
      await loadWagons();
      if (expandedWagonId) await loadTimber(expandedWagonId);
    } catch (e) {
      console.error("Vagonni saqlashda xato:", e);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // TIMBER MODAL
  // ==========================================

  const openCreateTimber = (wagonId: number) => {
    setEditingTimberId(null);
    setTimberWagonId(wagonId);
    setTimberForm({
      widthMm: "",
      thicknessMm: "",
      lengthM: "",
      quantity: "",
      pricePerCubicRub: "",
      notes: "",
    });
    setTimberModal(true);
  };

  const openEditTimber = (t: TimberRow) => {
    setEditingTimberId(t.id);
    setTimberWagonId(t.wagonId);
    setTimberForm({
      widthMm: t.widthMm.toString(),
      thicknessMm: t.thicknessMm.toString(),
      lengthM: t.lengthM.toString(),
      quantity: t.quantity.toString(),
      pricePerCubicRub: t.pricePerCubicRub.toString(),
      notes: t.notes ?? "",
    });
    setTimberModal(true);
  };

  const saveTimber = async () => {
    if (!timberWagonId) return;
    const w = parseFloat(timberForm.widthMm);
    const th = parseFloat(timberForm.thicknessMm);
    const l = parseFloat(timberForm.lengthM);
    const q = parseInt(timberForm.quantity);
    const p = parseFloat(timberForm.pricePerCubicRub);
    if (!w || !th || !l || !q || !p) return;

    setSaving(true);
    try {
      const payload = {
        widthMm: w,
        thicknessMm: th,
        lengthM: l,
        quantity: q,
        pricePerCubicRub: p,
        notes: timberForm.notes.trim() || undefined,
      };

      if (editingTimberId) {
        await updateTimber(editingTimberId, payload);
      } else {
        await addTimber(timberWagonId, payload);
      }
      setTimberModal(false);
      await loadWagons();
      if (expandedWagonId) await loadTimber(expandedWagonId);
    } catch (e) {
      console.error("Taxtani saqlashda xato:", e);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // EXCHANGE MODAL
  // ==========================================

  const openExchangeModal = (wagon: WagonRow) => {
    setExchangeWagonId(wagon.id);
    setExchangeForm({
      amountUsd: "",
      rate: wagon.rubToUsdRate?.toString() ?? "",
      date: new Date().toISOString().slice(0, 10),
      notes: `Vagon ${wagon.wagonNumber} uchun konvertatsiya`,
    });
    setExchangeModal(true);
  };

  const saveExchange = async () => {
    const amount = parseFloat(exchangeForm.amountUsd);
    const rate = parseFloat(exchangeForm.rate);
    if (!amount || !rate || !exchangeForm.date) return;

    setSaving(true);
    try {
      await createCurrencyExchange(amount, rate, exchangeForm.date, exchangeForm.notes.trim() || undefined);
      setExchangeModal(false);
    } catch (e) {
      console.error("Konvertatsiyada xato:", e);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE
  // ==========================================

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setSaving(true);
    try {
      if (deleteModal.type === "wagon") {
        await deleteWagon(deleteModal.id);
        if (expandedWagonId === deleteModal.id) {
          setExpandedWagonId(null);
          setExpandedTimber([]);
        }
      } else {
        await deleteTimber(deleteModal.id);
      }
      setDeleteModal(null);
      await loadWagons();
      if (expandedWagonId) await loadTimber(expandedWagonId);
    } catch (e) {
      console.error("O'chirishda xato:", e);
      alert(e instanceof Error ? e.message : "O'chirishda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // TIMBER PREVIEW CALC
  // ==========================================

  const timberCubicPreview = (() => {
    const w = parseFloat(timberForm.widthMm);
    const th = parseFloat(timberForm.thicknessMm);
    const l = parseFloat(timberForm.lengthM);
    const q = parseInt(timberForm.quantity);
    if (w && th && l && q) {
      return ((w / 1000) * (th / 1000) * l * q).toFixed(4);
    }
    return null;
  })();

  const exchangePreview = (() => {
    const a = parseFloat(exchangeForm.amountUsd);
    const r = parseFloat(exchangeForm.rate);
    if (a && r) {
      return (a * r).toLocaleString("ru-RU");
    }
    return null;
  })();

  // ==========================================
  // RENDER
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Train className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Vagonlar</h1>
          <span className="text-sm text-slate-500">({wagons.length})</span>
        </div>
        <button
          onClick={openCreateWagon}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yangi vagon
        </button>
      </div>

      {/* ========== WAGONS TABLE ========== */}
      {wagons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
          <Train className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Vagonlar mavjud emas</p>
          <button
            onClick={openCreateWagon}
            className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            + Birinchi vagonni qo&apos;shing
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vagon raqami</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qayerdan → Qayerga</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kurs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jami kub (m³)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxtalar</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {wagons.map((w, idx) => (
                <WagonTableRow
                  key={w.id}
                  wagon={w}
                  index={idx + 1}
                  isExpanded={expandedWagonId === w.id}
                  timber={expandedWagonId === w.id ? expandedTimber : []}
                  expenses={expandedWagonId === w.id ? wagonExpenses : []}
                  onToggle={() => toggleExpand(w.id)}
                  onEditWagon={() => openEditWagon(w.id)}
                  onDeleteWagon={() => setDeleteModal({ type: "wagon", id: w.id, name: w.wagonNumber })}
                  onExchange={() => openExchangeModal(w)}
                  onEditTimber={(t) => openEditTimber(t)}
                  onDeleteTimber={(t) =>
                    setDeleteModal({
                      type: "timber",
                      id: t.id,
                      name: formatTimberDimensions(t.thicknessMm, t.widthMm, t.lengthM, t.quantity),
                    })
                  }
                  onDeleteExpense={handleDeleteExpense}
                  onRefresh={async () => {
                    await loadWagons();
                    await loadTimber(w.id);
                    await loadExpensesForWagon(w.id);
                  }}
                />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ========== WAGON MODAL ========== */}
      {wagonModal && (() => {
        // Auto-calc helpers
        const tonnageNum = parseFloat(wagonForm.tonnage) || 0;
        const kodUzAutoTotal = (tonnageNum * (parseFloat(wagonForm.kodUzPricePerTon) || 0)).toFixed(2);
        const kodKzAutoTotal = (tonnageNum * (parseFloat(wagonForm.kodKzPricePerTon) || 0)).toFixed(2);
        const totalCubic = wagonTimberEntries.reduce((sum, t) => {
          return sum + ((Number(t.widthMm) / 1000) * (Number(t.thicknessMm) / 1000) * Number(t.lengthM) * Number(t.quantity));
        }, 0);
        const timberTotalRub = totalCubic * (parseFloat(wagonForm.timberPricePerCubicRub) || 0);
        const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

        return (
        <Modal title={editingWagonId ? "Vagonni tahrirlash" : "Yangi vagon"} onClose={() => setWagonModal(false)}>
          <div className="space-y-4">
            {/* ===== Section 1: Asosiy ma'lumotlar ===== */}
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Asosiy ma&apos;lumotlar</h3>

            <Field label="Vagon raqami *">
              <input
                type="text"
                maxLength={8}
                value={wagonForm.wagonNumber}
                onChange={(e) => setWagonForm({ ...wagonForm, wagonNumber: e.target.value })}
                className={inputClass}
                placeholder="58374291"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Jo'natilgan sana">
                <DatePicker value={wagonForm.sentDate} onChange={v => setWagonForm({ ...wagonForm, sentDate: v })} className={inputClass} />
              </Field>
              <Field label="Yetib kelgan sana">
                <DatePicker value={wagonForm.arrivedDate} onChange={v => setWagonForm({ ...wagonForm, arrivedDate: v })} className={inputClass} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Qayerdan *">
                <input
                  type="text"
                  value={wagonForm.fromLocation}
                  onChange={(e) => setWagonForm({ ...wagonForm, fromLocation: e.target.value })}
                  className={inputClass}
                  placeholder="Krasnoyarsk"
                />
              </Field>
              <Field label="Qayerga *">
                <input
                  type="text"
                  value={wagonForm.toLocation}
                  onChange={(e) => setWagonForm({ ...wagonForm, toLocation: e.target.value })}
                  className={inputClass}
                  placeholder="Toshkent"
                />
              </Field>
            </div>

            <Field label="Tonna">
              <input
                type="number"
                step="0.01"
                value={wagonForm.tonnage}
                onChange={(e) => setWagonForm({ ...wagonForm, tonnage: e.target.value })}
                className={inputClass}
                placeholder="65"
              />
            </Field>

            {/* ===== Section 2: Kodlar ===== */}
            <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Kodlar</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Kod UZ */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Kod UZ</label>
                    <div className="flex items-center gap-2 mb-1.5">
                      <input type="text" placeholder="Kod nomi" value={wagonForm.kodUzName}
                        onChange={(e) => setWagonForm({ ...wagonForm, kodUzName: e.target.value })}
                        className="w-32 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="number" placeholder="$/t" step="0.01" value={wagonForm.kodUzPricePerTon}
                        onChange={(e) => setWagonForm({ ...wagonForm, kodUzPricePerTon: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm text-green-600 font-medium whitespace-nowrap">Jami: ${kodUzAutoTotal}</span>
                    </div>
                    <select value={wagonForm.kodUzSupplierId}
                      onChange={(e) => setWagonForm({ ...wagonForm, kodUzSupplierId: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600">
                      <option value="">Kimdan olindi...</option>
                      {codeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  {/* Kod KZ */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Kod KZ</label>
                    <div className="flex items-center gap-2 mb-1.5">
                      <input type="text" placeholder="Kod nomi" value={wagonForm.kodKzName}
                        onChange={(e) => setWagonForm({ ...wagonForm, kodKzName: e.target.value })}
                        className="w-32 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="number" placeholder="$/t" step="0.01" value={wagonForm.kodKzPricePerTon}
                        onChange={(e) => setWagonForm({ ...wagonForm, kodKzPricePerTon: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm text-green-600 font-medium whitespace-nowrap">Jami: ${kodKzAutoTotal}</span>
                    </div>
                    <select value={wagonForm.kodKzSupplierId}
                      onChange={(e) => setWagonForm({ ...wagonForm, kodKzSupplierId: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600">
                      <option value="">Kimdan olindi...</option>
                      {codeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
            </div>

            {/* ===== Mavjud taxtalar (faqat tahrirlashda) ===== */}
            {editingWagonId && editTimberList.length > 0 && (
              <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Mavjud taxtalar</h3>
                <div className="space-y-2">
                  {editTimberList.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-700 min-w-[120px]">
                        {t.thicknessMm}×{t.widthMm}×{t.lengthM}m
                      </span>
                      <span className="text-xs text-slate-500 min-w-[80px]">
                        Rossiya: <span className="font-semibold text-slate-700">{t.quantity}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-400 whitespace-nowrap">Toshkent:</label>
                        <input
                          type="number"
                          defaultValue={t.tashkentCount ?? ""}
                          placeholder="—"
                          className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          onBlur={async (e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            await updateTimber(t.id, { tashkentCount: val });
                            setEditTimberList(prev => prev.map(x => x.id === t.id ? { ...x, tashkentCount: val } : x));
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-400 whitespace-nowrap">Mijoz:</label>
                        <input
                          type="number"
                          defaultValue={t.customerCount ?? ""}
                          placeholder="—"
                          className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          onBlur={async (e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            await updateTimber(t.id, { customerCount: val });
                            setEditTimberList(prev => prev.map(x => x.id === t.id ? { ...x, customerCount: val } : x));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== Section 3: Yog'ochlar ===== */}
            <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Yog&apos;ochlar</h3>

                {/* 1 qatorda 4 input + kub — Enter bilan qo'shish */}
                <div className="flex items-end gap-2 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Qalinligi (mm)</label>
                    <input ref={timberFirstInputRef} type="number" value={inlineTimberForm.thicknessMm}
                      onChange={e => setInlineTimberForm(f => ({...f, thicknessMm: e.target.value}))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="25" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Eni (mm)</label>
                    <input type="number" value={inlineTimberForm.widthMm}
                      onChange={e => setInlineTimberForm(f => ({...f, widthMm: e.target.value}))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="150" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Uzunligi (m)</label>
                    <input type="number" value={inlineTimberForm.lengthM}
                      onChange={e => setInlineTimberForm(f => ({...f, lengthM: e.target.value}))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="6" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-0.5">Soni (dona)</label>
                    <input type="number" value={inlineTimberForm.quantity}
                      onChange={e => setInlineTimberForm(f => ({...f, quantity: e.target.value}))}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const f = inlineTimberForm;
                          if (!f.thicknessMm || !f.widthMm || !f.lengthM || !f.quantity) return;
                          setWagonTimberEntries(prev => [{...f}, ...prev]);
                          setInlineTimberForm({ widthMm: "", thicknessMm: "", lengthM: "", quantity: "", pricePerCubicRub: "" });
                          setTimeout(() => timberFirstInputRef.current?.focus(), 0);
                        }
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="200" />
                  </div>
                  <div className="flex-shrink-0 pb-0.5 min-w-[90px] text-right">
                    {Number(inlineTimberForm.thicknessMm) > 0 && Number(inlineTimberForm.widthMm) > 0 && Number(inlineTimberForm.lengthM) > 0 && Number(inlineTimberForm.quantity) > 0 ? (
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                        {((Number(inlineTimberForm.thicknessMm)/1000) * (Number(inlineTimberForm.widthMm)/1000) * Number(inlineTimberForm.lengthM) * Number(inlineTimberForm.quantity)).toFixed(4)} m³
                      </span>
                    ) : (
                      <span className="text-sm text-slate-300 whitespace-nowrap">0.0000 m³</span>
                    )}
                  </div>
                </div>

                {/* Qo'shilgan taxtalar ro'yxati + jami */}
                {wagonTimberEntries.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {wagonTimberEntries.map((t, idx) => {
                      const cubic = ((Number(t.thicknessMm)/1000) * (Number(t.widthMm)/1000) * Number(t.lengthM) * Number(t.quantity));
                      return (
                        <div key={idx} className="flex items-end gap-2">
                          <div className="flex-1">
                            <input type="number" value={t.thicknessMm}
                              onChange={e => setWagonTimberEntries(prev => prev.map((item, i) => i === idx ? {...item, thicknessMm: e.target.value} : item))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="25" />
                          </div>
                          <div className="flex-1">
                            <input type="number" value={t.widthMm}
                              onChange={e => setWagonTimberEntries(prev => prev.map((item, i) => i === idx ? {...item, widthMm: e.target.value} : item))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="150" />
                          </div>
                          <div className="flex-1">
                            <input type="number" value={t.lengthM}
                              onChange={e => setWagonTimberEntries(prev => prev.map((item, i) => i === idx ? {...item, lengthM: e.target.value} : item))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="6" />
                          </div>
                          <div className="flex-1">
                            <input type="number" value={t.quantity}
                              onChange={e => setWagonTimberEntries(prev => prev.map((item, i) => i === idx ? {...item, quantity: e.target.value} : item))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="200" />
                          </div>
                          <div className="flex-shrink-0 pb-0.5 min-w-[90px] text-right">
                            <span className="text-sm font-semibold text-green-600 whitespace-nowrap">{cubic.toFixed(4)} m³</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg">
                      <span className="text-sm font-semibold text-slate-700">Jami kub:</span>
                      <span className="text-sm font-bold text-green-600">{totalCubic.toFixed(4)} m³</span>
                    </div>
                  </div>
                )}
            </div>

            {/* ===== Section 4: Yog'och xaridi (RUB) ===== */}
            <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Yog&apos;och xaridi (RUB)</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                    <TreePine className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{totalCubic.toFixed(4)} m³</span>
                  </div>
                  <span className="text-slate-400 text-sm">×</span>
                  <div className="w-36">
                    <input
                      type="number"
                      step="0.01"
                      value={wagonForm.timberPricePerCubicRub}
                      onChange={(e) => setWagonForm({ ...wagonForm, timberPricePerCubicRub: e.target.value })}
                      className={inputClass}
                      placeholder="Narx/m³ (₽)"
                    />
                  </div>
                  <span className="text-slate-400 text-sm">=</span>
                  <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-lg min-w-[120px]">
                    <span className="text-sm font-bold text-green-700 whitespace-nowrap">
                      {parseFloat(wagonForm.timberPricePerCubicRub) > 0
                        ? `₽${timberTotalRub.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`
                        : "₽—"}
                    </span>
                  </div>
                </div>
            </div>

            {/* ===== Section 5: Xarajatlar (USD) ===== */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-3">Xarajatlar (USD)</h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="NDS">
                    <input type="number" step="0.01" value={wagonForm.expNds}
                      onChange={(e) => setWagonForm({ ...wagonForm, expNds: e.target.value })}
                      className={inputClass} />
                  </Field>
                  <Field label="Usluga">
                    <input type="number" step="0.01" value={wagonForm.expUsluga}
                      onChange={(e) => setWagonForm({ ...wagonForm, expUsluga: e.target.value })}
                      className={inputClass} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Field label="Tupik">
                    <input type="number" step="0.01" value={wagonForm.expTupik}
                      onChange={(e) => setWagonForm({ ...wagonForm, expTupik: e.target.value })}
                      className={inputClass} />
                  </Field>
                  <Field label="Xrannei">
                    <input type="number" step="0.01" value={wagonForm.expXrannei}
                      onChange={(e) => setWagonForm({ ...wagonForm, expXrannei: e.target.value })}
                      className={inputClass} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <Field label="Klentga ortish">
                    <input type="number" step="0.01" value={wagonForm.expKlentgaOrtish}
                      onChange={(e) => setWagonForm({ ...wagonForm, expKlentgaOrtish: e.target.value })}
                      className={inputClass} />
                  </Field>
                  <Field label="Yerga tushurish">
                    <input type="number" step="0.01" value={wagonForm.expYergaTushurish}
                      onChange={(e) => setWagonForm({ ...wagonForm, expYergaTushurish: e.target.value })}
                      className={inputClass} />
                  </Field>
                </div>

                {/* Extra expenses */}
                <div className="mt-3 space-y-2">
                  {wagonForm.extraExpenses.map((exp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nomi"
                        value={exp.name}
                        onChange={(e) => {
                          const updated = [...wagonForm.extraExpenses];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setWagonForm({ ...wagonForm, extraExpenses: updated });
                        }}
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Summa ($)"
                        value={exp.amount}
                        onChange={(e) => {
                          const updated = [...wagonForm.extraExpenses];
                          updated[idx] = { ...updated[idx], amount: e.target.value };
                          setWagonForm({ ...wagonForm, extraExpenses: updated });
                        }}
                        className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => {
                        setWagonForm({ ...wagonForm, extraExpenses: wagonForm.extraExpenses.filter((_, i) => i !== idx) });
                      }} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    setWagonForm({ ...wagonForm, extraExpenses: [...wagonForm.extraExpenses, { name: "", amount: "" }] });
                  }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    + Qo&apos;shimcha xarajat
                  </button>
                </div>
            </div>

            {/* ===== Section 6: Status & Notes ===== */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select
                    value={wagonForm.status}
                    onChange={(e) => setWagonForm({ ...wagonForm, status: e.target.value })}
                    className={inputClass}
                  >
                    {WAGON_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Izoh">
                  <textarea
                    value={wagonForm.notes}
                    onChange={(e) => setWagonForm({ ...wagonForm, notes: e.target.value })}
                    className={inputClass}
                    rows={2}
                  />
                </Field>
              </div>
            </div>

            {/* ===== Footer buttons ===== */}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setWagonModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                Bekor qilish
              </button>
              <button
                onClick={saveWagon}
                disabled={saving || !wagonForm.wagonNumber.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
              >
                {saving ? "Saqlanmoqda..." : editingWagonId ? "Saqlash" : "Yaratish"}
              </button>
            </div>
          </div>
        </Modal>
        );
      })()}

      {/* ========== TIMBER MODAL ========== */}
      {timberModal && (
        <Modal title={editingTimberId ? "Taxtani tahrirlash" : "Yangi taxta"} onClose={() => setTimberModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Eni (mm)">
                <input
                  type="number"
                  value={timberForm.widthMm}
                  onChange={(e) => setTimberForm({ ...timberForm, widthMm: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="125"
                />
              </Field>
              <Field label="Qalinligi (mm)">
                <input
                  type="number"
                  value={timberForm.thicknessMm}
                  onChange={(e) => setTimberForm({ ...timberForm, thicknessMm: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="31"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Uzunligi (m)">
                <input
                  type="number"
                  step="0.1"
                  value={timberForm.lengthM}
                  onChange={(e) => setTimberForm({ ...timberForm, lengthM: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="6"
                />
              </Field>
              <Field label="Soni (dona)">
                <input
                  type="number"
                  value={timberForm.quantity}
                  onChange={(e) => setTimberForm({ ...timberForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="115"
                />
              </Field>
            </div>

            <Field label="Narx (rub/kub)">
              <input
                type="number"
                step="0.01"
                value={timberForm.pricePerCubicRub}
                onChange={(e) => setTimberForm({ ...timberForm, pricePerCubicRub: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="8500"
              />
            </Field>

            {timberCubicPreview && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Jami: <span className="font-bold">{timberCubicPreview} m³</span>
                {parseFloat(timberForm.widthMm) > 0 &&
                  parseFloat(timberForm.thicknessMm) > 0 &&
                  parseFloat(timberForm.lengthM) > 0 && (
                    <span className="ml-3 text-green-600">
                      ({piecesPerCubicMeter(
                        parseFloat(timberForm.widthMm),
                        parseFloat(timberForm.thicknessMm),
                        parseFloat(timberForm.lengthM)
                      )}{" "}
                      dona/m³)
                    </span>
                  )}
              </div>
            )}

            <Field label="Izoh">
              <textarea
                value={timberForm.notes}
                onChange={(e) => setTimberForm({ ...timberForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                rows={2}
              />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setTimberModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                Bekor qilish
              </button>
              <button onClick={saveTimber} disabled={saving || !timberCubicPreview} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">
                {saving ? "Saqlanmoqda..." : editingTimberId ? "Saqlash" : "Qo'shish"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========== EXCHANGE MODAL ========== */}
      {exchangeModal && (
        <Modal title="Valyuta konvertatsiyasi" onClose={() => setExchangeModal(false)}>
          <div className="space-y-4">
            <Field label="Summa ($)">
              <input
                type="number"
                step="0.01"
                value={exchangeForm.amountUsd}
                onChange={(e) => setExchangeForm({ ...exchangeForm, amountUsd: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="1000"
              />
            </Field>

            <Field label="Kurs (RUB/USD)">
              <input
                type="number"
                step="0.01"
                value={exchangeForm.rate}
                onChange={(e) => setExchangeForm({ ...exchangeForm, rate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </Field>

            <Field label="Sana">
              <DatePicker value={exchangeForm.date} onChange={v => setExchangeForm({ ...exchangeForm, date: v })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
            </Field>

            <Field label="Izoh">
              <textarea
                value={exchangeForm.notes}
                onChange={(e) => setExchangeForm({ ...exchangeForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                rows={2}
              />
            </Field>

            {exchangePreview && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <ArrowRightLeft className="inline h-4 w-4 mr-1" />
                ${parseFloat(exchangeForm.amountUsd).toLocaleString("en-US")} → ₽{exchangePreview}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setExchangeModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                Bekor qilish
              </button>
              <button onClick={saveExchange} disabled={saving || !exchangePreview} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">
                {saving ? "Saqlanmoqda..." : "Konvertatsiya"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========== DELETE MODAL ========== */}
      {deleteModal && (
        <Modal title="O'chirishni tasdiqlash" onClose={() => setDeleteModal(null)}>
          <p className="text-slate-600 mb-6">
            <span className="font-medium text-slate-800">&quot;{deleteModal.name}&quot;</span>{" "}
            {deleteModal.type === "wagon" ? "vagonini" : "taxtasini"} o&apos;chirishni xohlaysizmi?
            {deleteModal.type === "wagon" && (
              <span className="block text-red-500 text-sm mt-1">
                Barcha taxtalar ham o&apos;chiriladi!
              </span>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModal(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Bekor qilish
            </button>
            <button
              onClick={confirmDelete}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {saving ? "O'chirilmoqda..." : "O'chirish"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==========================================
// WAGON TABLE ROW (with expandable timber)
// ==========================================

function WagonTableRow({
  wagon,
  index,
  isExpanded,
  timber,
  expenses,
  onToggle,
  onEditWagon,
  onDeleteWagon,
  onExchange,
  onEditTimber,
  onDeleteTimber,
  onDeleteExpense,
  onRefresh,
}: {
  wagon: WagonRow;
  index: number;
  isExpanded: boolean;
  timber: TimberRow[];
  expenses: ExpenseWithRelations[];
  onToggle: () => void;
  onEditWagon: () => void;
  onDeleteWagon: () => void;
  onExchange: () => void;
  onEditTimber: (t: TimberRow) => void;
  onDeleteTimber: (t: TimberRow) => void;
  onDeleteExpense: (id: number) => void;
  onRefresh: () => Promise<void>;
}) {
  const route =
    wagon.fromLocation || wagon.toLocation
      ? `${wagon.fromLocation ?? "?"} → ${wagon.toLocation ?? "?"}`
      : "—";

  // Inline timber form state
  const [rowTimberForm, setRowTimberForm] = useState({ thicknessMm: "", widthMm: "", lengthM: "", quantity: "" });
  const [timberPrice, setTimberPrice] = useState("");
  const [addingTimber, setAddingTimber] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Expense form state
  const [expFields, setExpFields] = useState({ nds: "", usluga: "", tupik: "", xrannei: "", klentgaOrtish: "", yergaTushurish: "" });
  const [extraExps, setExtraExps] = useState<{ name: string; amount: string }[]>([]);
  const [savingExp, setSavingExp] = useState(false);

  const cubicPreview = (() => {
    const th = Number(rowTimberForm.thicknessMm);
    const w = Number(rowTimberForm.widthMm);
    const l = Number(rowTimberForm.lengthM);
    const q = Number(rowTimberForm.quantity);
    if (th > 0 && w > 0 && l > 0 && q > 0) {
      return ((th / 1000) * (w / 1000) * l * q).toFixed(4);
    }
    return null;
  })();

  const totalCubic = timber.reduce((s, t) => s + t.cubicMeters, 0);
  const timberTotalRub = totalCubic * (parseFloat(timberPrice) || 0);

  const handleAddTimber = async () => {
    const th = Number(rowTimberForm.thicknessMm);
    const w = Number(rowTimberForm.widthMm);
    const l = Number(rowTimberForm.lengthM);
    const q = Number(rowTimberForm.quantity);
    const p = parseFloat(timberPrice) || 0;
    if (!th || !w || !l || !q) return;
    setAddingTimber(true);
    try {
      await addTimber(wagon.id, { thicknessMm: th, widthMm: w, lengthM: l, quantity: q, pricePerCubicRub: p });
      setRowTimberForm({ thicknessMm: "", widthMm: "", lengthM: "", quantity: "" });
      await onRefresh();
      setTimeout(() => firstInputRef.current?.focus(), 0);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTimber(false);
    }
  };

  const handleSaveExpenses = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const toSave = [
      { cat: "nds", desc: "NDS", val: expFields.nds },
      { cat: "usluga", desc: "Usluga", val: expFields.usluga },
      { cat: "tupik", desc: "Tupik", val: expFields.tupik },
      { cat: "xrannei", desc: "Xrannei", val: expFields.xrannei },
      { cat: "klentga_ortish", desc: "Klentga ortish", val: expFields.klentgaOrtish },
      { cat: "yerga_tushurish", desc: "Yerga tushurish", val: expFields.yergaTushurish },
    ].filter(e => parseFloat(e.val) > 0);
    const extraToSave = extraExps.filter(e => e.name && parseFloat(e.amount) > 0);
    if (toSave.length === 0 && extraToSave.length === 0) return;
    setSavingExp(true);
    try {
      for (const s of toSave) {
        await createExpense({ wagonId: wagon.id, category: s.cat as any, description: s.desc, amountUsd: parseFloat(s.val), date: today });
      }
      for (const e of extraToSave) {
        await createExpense({ wagonId: wagon.id, category: "other", description: e.name, amountUsd: parseFloat(e.amount), date: today });
      }
      setExpFields({ nds: "", usluga: "", tupik: "", xrannei: "", klentgaOrtish: "", yergaTushurish: "" });
      setExtraExps([]);
      await onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingExp(false);
    }
  };

  const rowInputClass = "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
  const expInputClass = "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

  return (
    <>
      {/* Main wagon row */}
      <tr
        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
          isExpanded ? "bg-green-50/50" : ""
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-sm text-slate-400">{index}</td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
            <span className="font-mono font-medium text-slate-800">{wagon.wagonNumber}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{route}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {wagon.rubToUsdRate ? `${wagon.rubToUsdRate}` : "—"}
        </td>
        <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">
          {(wagon.totalCubicMeters ?? 0).toFixed(4)}
        </td>
        <td className="px-4 py-3 text-sm text-center">{statusBadge(wagon.status)}</td>
        <td className="px-4 py-3 text-sm text-center">
          <span className="inline-flex items-center gap-1 text-slate-600">
            <TreePine className="h-3.5 w-3.5" />
            {wagon.timberCount}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onExchange}
              className="text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              title="Konvertatsiya"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
            <Link
              href={`/customs-codes?wagon=${wagon.id}`}
              className="text-purple-600 hover:bg-purple-50 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              title="Kodlar"
            >
              <FileCode className="h-4 w-4" />
            </Link>
            <button
              onClick={onEditWagon}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              title="Tahrirlash"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDeleteWagon}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              title="O'chirish"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded section */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-5 space-y-5">

              {/* ===== Yog'ochlar ===== */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Yog&apos;ochlar</h4>

                {/* Inline add form */}
                <div className="flex items-end gap-2 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-0.5">Qalinligi (mm)</label>
                    <input
                      ref={firstInputRef}
                      type="number"
                      value={rowTimberForm.thicknessMm}
                      onChange={e => setRowTimberForm(f => ({ ...f, thicknessMm: e.target.value }))}
                      className={rowInputClass}
                      placeholder="25"
                      disabled={addingTimber}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-0.5">Eni (mm)</label>
                    <input
                      type="number"
                      value={rowTimberForm.widthMm}
                      onChange={e => setRowTimberForm(f => ({ ...f, widthMm: e.target.value }))}
                      className={rowInputClass}
                      placeholder="150"
                      disabled={addingTimber}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-0.5">Uzunligi (m)</label>
                    <input
                      type="number"
                      value={rowTimberForm.lengthM}
                      onChange={e => setRowTimberForm(f => ({ ...f, lengthM: e.target.value }))}
                      className={rowInputClass}
                      placeholder="6"
                      disabled={addingTimber}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-0.5">Soni (dona)</label>
                    <input
                      type="number"
                      value={rowTimberForm.quantity}
                      onChange={e => setRowTimberForm(f => ({ ...f, quantity: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") handleAddTimber(); }}
                      className={rowInputClass}
                      placeholder="200"
                      disabled={addingTimber}
                    />
                  </div>
                  <div className="flex-shrink-0 min-w-[100px] text-right pb-0.5">
                    {cubicPreview ? (
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap">{cubicPreview} m³</span>
                    ) : (
                      <span className="text-sm text-slate-300 whitespace-nowrap">0.0000 m³</span>
                    )}
                  </div>
                </div>

                {/* Existing timber list */}
                {timber.length > 0 && (
                  <div className="space-y-1">
                    {timber.map((t, tIdx) => {
                      const ppm = piecesPerCubicMeter(t.widthMm, t.thicknessMm, t.lengthM);
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-slate-100 group"
                        >
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-400 w-5 text-right">{tIdx + 1}.</span>
                            <span className="font-bold text-green-700">
                              {formatTimberDimensions(t.thicknessMm, t.widthMm, t.lengthM, t.quantity)}
                            </span>
                            <span className="text-slate-400 text-xs">{ppm} dona/m³</span>
                            {t.pricePerCubicRub > 0 && (
                              <span className="text-slate-500 text-xs">₽{t.pricePerCubicRub.toLocaleString("ru-RU")}</span>
                            )}
                            <span className="font-medium text-slate-700">{t.cubicMeters.toFixed(4)} m³</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditTimber(t)}
                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTimber(t)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-sm font-semibold text-slate-600">Jami kub:</span>
                      <span className="text-sm font-bold text-green-600">{totalCubic.toFixed(4)} m³</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== Yog'och xaridi (RUB) ===== */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Yog&apos;och xaridi (RUB)</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                    <TreePine className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{totalCubic.toFixed(4)} m³</span>
                  </div>
                  <span className="text-slate-400 text-sm">×</span>
                  <div className="w-36">
                    <input
                      type="number"
                      step="0.01"
                      value={timberPrice}
                      onChange={e => setTimberPrice(e.target.value)}
                      className={rowInputClass}
                      placeholder="Narx/m³ (₽)"
                    />
                  </div>
                  <span className="text-slate-400 text-sm">=</span>
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg min-w-[120px]">
                    <span className="text-sm font-bold text-green-700 whitespace-nowrap">
                      {parseFloat(timberPrice) > 0
                        ? `₽${timberTotalRub.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`
                        : <span className="text-slate-300">₽—</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* ===== Xarajatlar (USD) ===== */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Xarajatlar (USD)</h4>

                {/* Existing expenses list */}
                {expenses.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {expenses.map(exp => (
                      <div key={exp.id} className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-slate-100 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{exp.category}</span>
                          <span className="text-slate-600">{exp.description}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-800">${exp.amountUsd}</span>
                          <button onClick={() => onDeleteExpense(exp.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 bg-orange-50 rounded-lg text-sm font-semibold text-orange-700">
                      <span>Jami xarajat:</span>
                      <span>${expenses.reduce((s, e) => s + e.amountUsd, 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* New expense fields */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "nds", label: "NDS" },
                    { key: "usluga", label: "Usluga" },
                    { key: "tupik", label: "Tupik" },
                    { key: "xrannei", label: "Xrannei" },
                    { key: "klentgaOrtish", label: "Klentga ortish" },
                    { key: "yergaTushurish", label: "Yerga tushurish" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-400 mb-0.5">{label}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={expFields[key as keyof typeof expFields]}
                        onChange={e => setExpFields(f => ({ ...f, [key]: e.target.value }))}
                        className={expInputClass}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                {/* Extra expenses */}
                {extraExps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {extraExps.map((exp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nomi"
                          value={exp.name}
                          onChange={e => setExtraExps(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Summa ($)"
                          value={exp.amount}
                          onChange={e => setExtraExps(prev => prev.map((item, i) => i === idx ? { ...item, amount: e.target.value } : item))}
                          className="w-28 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <button
                          onClick={() => setExtraExps(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => setExtraExps(prev => [...prev, { name: "", amount: "" }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Qo&apos;shimcha xarajat
                  </button>
                  <button
                    onClick={handleSaveExpenses}
                    disabled={savingExp}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {savingExp ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ==========================================
// SHARED COMPONENTS
// ==========================================

function DatePicker({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const offset = (firstDay + 6) % 7; // Monday=0

  const displayValue = parsed
    ? `${String(parsed.getDate()).padStart(2,"0")}/${String(parsed.getMonth()+1).padStart(2,"0")}/${parsed.getFullYear()}`
    : "";

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        readOnly
        value={displayValue}
        placeholder="KK/OY/YYYY"
        onClick={() => setOpen(o => !o)}
        className={`cursor-pointer ${className ?? ""}`}
      />
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-64">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewYear(y => y-1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 font-bold text-sm">«</button>
            <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 font-bold text-sm">‹</button>
            <span className="text-sm font-semibold text-slate-700 flex-1 text-center">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 font-bold text-sm">›</button>
            <button type="button" onClick={() => setViewYear(y => y+1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 font-bold text-sm">»</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {["Du","Se","Ch","Pa","Ju","Sh","Ya"].map(d => (
              <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({length: offset}).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({length: daysInMonth}).map((_, i) => {
              const day = i + 1;
              const isSelected = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
              const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              return (
                <button key={day} type="button"
                  onClick={() => {
                    const m = String(viewMonth+1).padStart(2,"0");
                    const d = String(day).padStart(2,"0");
                    onChange(`${viewYear}-${m}-${d}`);
                    setOpen(false);
                  }}
                  className={`text-center text-sm py-1 rounded-lg transition-colors w-full
                    ${isSelected ? "bg-blue-600 text-white" : isToday ? "text-blue-600 font-semibold hover:bg-blue-50" : "hover:bg-slate-100 text-slate-700"}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
