"use client";

import { useState, useEffect } from "react";
import { getSales, getSale, deleteSale } from "@/lib/actions/sales";
import { getPartners, Partner } from "@/lib/actions/partners";
import { getTransports } from "@/lib/actions/wagons";
import { getWarehouse } from "@/lib/actions/warehouse";
import SaleTable from "./_components/SaleTable";
import SaleModal from "./_components/SaleModal";
import SaleReceiveModal from "./_components/SaleReceiveModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type SaleWithCustomer = {
  id: number;
  docNumber: string | null;
  status: string;
  paymentType: string | null;
  totalSentUsd: string | null;
  totalReceivedUsd: string | null;
  customer: { name: string } | null;
  sentAt: Date | string | null;
  items: Array<{
    id: number;
    sentCount: number | null;
    receivedCount: number | null;
    pricePerCubicUsd: string | null;
  }>;
};

type SaleDetail = {
  id: number;
  docNumber: string | null;
  paymentType: string | null;
  customer: { name: string } | null;
  items: Array<{
    id: number;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: string | null;
    sentCount: number | null;
    receivedCount: number | null;
  }>;
};

type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  quantity: number;
};

type TransportItem = {
  id: number;
  number: string | null;
  status: string;
  timbers: Array<{
    id: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: string | number;
    tashkentCount: number;
    customerCount: number;
  }>;
};

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithCustomer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transports, setTransports] = useState<TransportItem[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<SaleDetail | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [salesData, partnersData, wagonsData, trucksData, warehouseData] = await Promise.all([
        getSales(),
        getPartners(),
        getTransports("wagon"),
        getTransports("truck"),
        getWarehouse(),
      ]);
      setSales(salesData as SaleWithCustomer[]);
      setPartners(partnersData as Partner[]);
      setTransports([...wagonsData, ...trucksData] as unknown as TransportItem[]);
      setWarehouseItems(warehouseData as WarehouseItem[]);
    } finally {
      setLoading(false);
    }
  }

  const handleReceive = async (id: number) => {
    try {
      const fullSale = await getSale(id);
      if (!fullSale) return;
      setReceiveTarget({
        id: fullSale.id,
        docNumber: fullSale.docNumber,
        paymentType: fullSale.paymentType,
        customer: fullSale.customer,
        items: fullSale.items.map((item) => ({
          id: item.id,
          thicknessMm: item.thicknessMm,
          widthMm: item.widthMm,
          lengthM: item.lengthM ? String(item.lengthM) : null,
          sentCount: item.sentCount,
          receivedCount: item.receivedCount ?? 0,
        })),
      });
    } catch (err) {
      console.error(err);
    }
  };

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteSale(deleteTargetId);
      await loadData();
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Savdo</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          + Yangi savdo
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">Yuklanmoqda...</p>
        </div>
      ) : (
        <SaleTable
          sales={sales}
          onReceive={handleReceive}
          onDelete={(id) => setDeleteTargetId(id)}
        />
      )}

      <SaleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => { setIsCreateOpen(false); loadData(); }}
        partners={partners}
        transports={transports}
        warehouseItems={warehouseItems}
      />

      <SaleReceiveModal
        isOpen={!!receiveTarget}
        onClose={() => setReceiveTarget(null)}
        onSuccess={() => { setReceiveTarget(null); loadData(); }}
        sale={receiveTarget}
        warehouseItems={warehouseItems}
      />

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title={"Savdoni o'chirish"}
        message={"Bu savdo o'chiriladi. Davom etasizmi?"}
        confirmText={"O'chirish"}
        isLoading={deleting}
      />
    </div>
  );
}
