"use client";

import { useState, useEffect } from "react";
import { Plus, Truck } from "lucide-react";
import WagonModal from "./_components/WagonModal";
import WagonTable from "./_components/WagonTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getTransports, deleteTransport, closeTransport } from "@/lib/actions/wagons";
import { getPartners, type Partner } from "@/lib/actions/partners";
import { t } from "@/i18n/uz";

type TransportStatus = "in_transit" | "at_border" | "arrived" | "unloaded" | "closed";

interface Timber {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  russiaCount: number;
  tashkentCount: number | null;
  customerCount: number | null;
}

interface Transport {
  id: number;
  number: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  status: TransportStatus;
  timbers: Timber[];
}

export default function WagonsPage() {
  const [wagons, setWagons] = useState<Transport[]>([]);
  const [trucks, setTrucks] = useState<Transport[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [isWagonModalOpen, setIsWagonModalOpen] = useState(false);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Transport | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Close confirm
  const [closeTarget, setCloseTarget] = useState<Transport | null>(null);
  const [isCloseLoading, setIsCloseLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [wagonsData, trucksData, partnersData] = await Promise.all([
        getTransports("wagon"),
        getTransports("truck"),
        getPartners(),
      ]);
      setWagons(wagonsData as unknown as Transport[]);
      setTrucks(trucksData as unknown as Transport[]);
      setPartners(partnersData as unknown as Partner[]);
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xato:", err);
    }
  }

  function handleEdit(transport: Transport) {
    // TODO: Tahrirlash modali — Task 6 da to'ldiriladi
    console.log("Edit:", transport.id);
  }

  function handleDeleteRequest(transport: Transport) {
    setDeleteTarget(transport);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    try {
      await deleteTransport(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error("O'chirishda xato:", err);
    } finally {
      setIsDeleteLoading(false);
    }
  }

  function handleCloseRequest(transport: Transport) {
    setCloseTarget(transport);
  }

  async function handleCloseConfirm() {
    if (!closeTarget) return;
    setIsCloseLoading(true);
    try {
      await closeTransport(closeTarget.id);
      setCloseTarget(null);
      await loadData();
    } catch (err) {
      console.error("Yopishda xato:", err);
    } finally {
      setIsCloseLoading(false);
    }
  }

  const allTransports = [...wagons, ...trucks];

  return (
    <div className="p-6">
      {/* Header */}
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

      {/* Jadval */}
      <WagonTable
        transports={allTransports}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onClose={handleCloseRequest}
      />

      {/* Vagon modal */}
      <WagonModal
        isOpen={isWagonModalOpen}
        onClose={() => setIsWagonModalOpen(false)}
        type="wagon"
        partners={partners}
        onSuccess={loadData}
      />

      {/* Yuk mashinasi modal */}
      <WagonModal
        isOpen={isTruckModalOpen}
        onClose={() => setIsTruckModalOpen(false)}
        type="truck"
        partners={partners}
        onSuccess={loadData}
      />

      {/* O'chirish dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t.wagons.deleteConfirmTitle}
        message={t.wagons.deleteConfirmMessage}
        confirmText={t.common.delete}
        isLoading={isDeleteLoading}
      />

      {/* Yopish dialog */}
      <ConfirmDialog
        isOpen={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        onConfirm={handleCloseConfirm}
        title={t.wagons.closeConfirmTitle}
        message={t.wagons.closeConfirmMessage}
        confirmText={t.wagons.close}
        isLoading={isCloseLoading}
      />
    </div>
  );
}
