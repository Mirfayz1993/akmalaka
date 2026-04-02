"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Truck } from "lucide-react";
import WagonModal from "./WagonModal";
import WagonEditModal from "./WagonEditModal";
import WagonTable from "./WagonTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteTransport, getTransports, getTransport } from "@/lib/actions/wagons";
import { type Partner } from "@/lib/actions/partners";
import { t } from "@/i18n/uz";

type Transport = Awaited<ReturnType<typeof getTransports>>[number];

interface Props {
  initialWagons: Transport[];
  initialTrucks: Transport[];
  partners: Partner[];
}

type MinTransport = {
  id: number;
  number: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  // at_border is legacy, kept for DB compat but not used in UI
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
  const wagons = initialWagons;
  const trucks = initialTrucks;

  const [isWagonModalOpen, setIsWagonModalOpen] = useState(false);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MinTransport | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Awaited<ReturnType<typeof getTransport>> | null>(null);

  async function handleEdit(transport: MinTransport) {
    try {
      const full = await getTransport(transport.id);
      setEditingTransport(full ?? null);
    } catch {
      toast.error("Transport ma'lumotlarini yuklashda xatolik");
    }
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
      />

      <WagonModal
        isOpen={isWagonModalOpen}
        onClose={() => setIsWagonModalOpen(false)}
        type="wagon"
        partners={partners}
        transports={allTransports}
        onSuccess={() => { setIsWagonModalOpen(false); startTransition(() => { router.refresh(); }); }}
      />

      <WagonModal
        isOpen={isTruckModalOpen}
        onClose={() => setIsTruckModalOpen(false)}
        type="truck"
        partners={partners}
        transports={allTransports}
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

      <WagonEditModal
        isOpen={editingTransport !== null}
        onClose={() => setEditingTransport(null)}
        transport={editingTransport ?? null}
        partners={partners}
        onSuccess={() => {
          setEditingTransport(null);
          startTransition(() => { router.refresh(); });
        }}
      />
    </div>
  );
}
