"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Truck } from "lucide-react";
import WagonModal from "./WagonModal";
import WagonEditModal from "./WagonEditModal";
import WagonTable from "./WagonTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteTransport, closeTransport, getTransports, unloadTransport, getTransport } from "@/lib/actions/wagons";
import { type Partner } from "@/lib/actions/partners";
import { t } from "@/i18n/uz";

// WagonTable bilan mos tip (WagonTable.Transport ning superset versiyasi)
type Transport = Awaited<ReturnType<typeof getTransports>>[number];

interface Props {
  initialWagons: Transport[];
  initialTrucks: Transport[];
  partners: Partner[];
}

// WagonTable uchun minimal tip (callback'larda qo'llanadi)
type MinTransport = {
  id: number;
  number: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  status: "in_transit" | "at_border" | "arrived" | "unloaded" | "closed";
  timbers: Array<{
    id: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: string;
    russiaCount: number;
    tashkentCount: number | null;
    customerCount: number | null;
  }>;
};

export default function WagonsPageClient({ initialWagons, initialTrucks, partners }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [wagons] = useState<Transport[]>(initialWagons);
  const [trucks] = useState<Transport[]>(initialTrucks);

  const [isWagonModalOpen, setIsWagonModalOpen] = useState(false);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MinTransport | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [closeTarget, setCloseTarget] = useState<MinTransport | null>(null);
  const [isCloseLoading, setIsCloseLoading] = useState(false);
  const [unloadTarget, setUnloadTarget] = useState<MinTransport | null>(null);
  const [isUnloadLoading, setIsUnloadLoading] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Awaited<ReturnType<typeof getTransport>> | null>(null);

  function handleEdit(transport: MinTransport) {
    setEditingTransport(transport as Awaited<ReturnType<typeof getTransport>>);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    try {
      await deleteTransport(deleteTarget.id);
      setDeleteTarget(null);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
    } finally {
      setIsDeleteLoading(false);
    }
  }

  async function handleCloseConfirm() {
    if (!closeTarget) return;
    setIsCloseLoading(true);
    try {
      await closeTransport(closeTarget.id);
      setCloseTarget(null);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yopishda xatolik yuz berdi");
    } finally {
      setIsCloseLoading(false);
    }
  }

  async function handleUnloadConfirm(choice: "close" | "unload") {
    if (!unloadTarget) return;
    setIsUnloadLoading(true);
    try {
      if (choice === "close") {
        await closeTransport(unloadTarget.id);
      } else {
        await unloadTransport(unloadTarget.id);
      }
      setUnloadTarget(null);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tushirishda xatolik yuz berdi");
    } finally {
      setIsUnloadLoading(false);
    }
  }

  const allTransports = [...wagons, ...trucks];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t.wagons.title}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWagonModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            {t.wagons.createWagon}
          </button>
          <button
            onClick={() => setIsTruckModalOpen(true)}
            className="flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
          >
            <Truck size={16} />
            {t.wagons.createTruck}
          </button>
        </div>
      </div>

      <WagonTable
        transports={allTransports}
        onEdit={handleEdit}
        onDelete={(t) => setDeleteTarget(t)}
        onClose={(t) => setCloseTarget(t)}
        onUnload={(t) => setUnloadTarget(t)}
      />

      <WagonModal
        isOpen={isWagonModalOpen}
        onClose={() => setIsWagonModalOpen(false)}
        type="wagon"
        partners={partners}
        onSuccess={() => { setIsWagonModalOpen(false); startTransition(() => { router.refresh(); }); }}
      />

      <WagonModal
        isOpen={isTruckModalOpen}
        onClose={() => setIsTruckModalOpen(false)}
        type="truck"
        partners={partners}
        onSuccess={() => { setIsTruckModalOpen(false); startTransition(() => { router.refresh(); }); }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t.wagons.deleteConfirmTitle}
        message={t.wagons.deleteConfirmMessage}
        confirmText={t.common.delete}
        isLoading={isDeleteLoading}
      />

      <ConfirmDialog
        isOpen={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        onConfirm={handleCloseConfirm}
        title={t.wagons.closeConfirmTitle}
        message={t.wagons.closeConfirmMessage}
        confirmText={t.wagons.close}
        isLoading={isCloseLoading}
      />

      {unloadTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Vagonni tushirish</h3>
            <p className="text-sm text-slate-600 mb-4">
              <b>{unloadTarget.number ?? `Vagon #${unloadTarget.id}`}</b> — qanday holat tanlaysiz?
            </p>
            <div className="space-y-2">
              <button
                disabled={isUnloadLoading}
                onClick={() => handleUnloadConfirm("unload")}
                className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Tushirilgan rejimga o&apos;tkazish
              </button>
              <button
                disabled={isUnloadLoading}
                onClick={() => handleUnloadConfirm("close")}
                className="w-full px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                Yopilsin (barcha yog&apos;ochlar jo&apos;natilgan)
              </button>
              <button
                disabled={isUnloadLoading}
                onClick={() => setUnloadTarget(null)}
                className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      <WagonEditModal
        isOpen={editingTransport !== null}
        onClose={() => setEditingTransport(null)}
        transport={editingTransport ?? null}
        partners={partners}
        onSuccess={() => { setEditingTransport(null); startTransition(() => { router.refresh(); }); }}
      />
    </div>
  );
}
