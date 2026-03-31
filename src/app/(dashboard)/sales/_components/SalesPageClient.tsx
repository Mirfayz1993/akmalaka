"use client";

import { useState } from "react";
import { getSales, getSale, deleteSale } from "@/lib/actions/sales";
import { getPartners, Partner } from "@/lib/actions/partners";
import { getTransports } from "@/lib/actions/wagons";
import { getWarehouse } from "@/lib/actions/warehouse";
import SaleTable from "./SaleTable";
import SaleModal from "./SaleModal";
import SaleReceiveModal from "./SaleReceiveModal";
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

interface Props {
  initialSales: SaleWithCustomer[];
  initialPartners: Partner[];
  initialTransports: TransportItem[];
  initialWarehouse: WarehouseItem[];
}

export default function SalesPageClient({
  initialSales,
  initialPartners,
  initialTransports,
  initialWarehouse,
}: Props) {
  const [sales, setSales] = useState<SaleWithCustomer[]>(initialSales);
  const [partners] = useState<Partner[]>(initialPartners);
  const [transports] = useState<TransportItem[]>(initialTransports);
  const [warehouseItems] = useState<WarehouseItem[]>(initialWarehouse);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<SaleDetail | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refreshSales() {
    const data = await getSales();
    setSales(data as SaleWithCustomer[]);
  }

  const handleReceive = (id: number) => {
    const sale = sales.find((s) => s.id === id);
    if (!sale) return;
    setReceiveTarget({
      id: sale.id,
      docNumber: sale.docNumber,
      paymentType: sale.paymentType,
      customer: sale.customer,
      items: sale.items.map((item) => ({
        id: item.id,
        thicknessMm: item.thicknessMm ?? 0,
        widthMm: item.widthMm ?? 0,
        lengthM: item.lengthM ? String(item.lengthM) : null,
        sentCount: item.sentCount,
        receivedCount: item.receivedCount ?? 0,
      })),
    });
  };

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteSale(deleteTargetId);
      await refreshSales();
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

      <SaleTable
        sales={sales}
        onReceive={handleReceive}
        onDelete={(id) => setDeleteTargetId(id)}
      />

      <SaleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => { setIsCreateOpen(false); refreshSales(); }}
        partners={partners}
        transports={transports}
        warehouseItems={warehouseItems}
      />

      <SaleReceiveModal
        isOpen={!!receiveTarget}
        onClose={() => setReceiveTarget(null)}
        onSuccess={() => { setReceiveTarget(null); refreshSales(); }}
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
