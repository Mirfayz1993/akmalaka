"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSale, getSales, deleteSale } from "@/lib/actions/sales";
import { getPartners, Partner } from "@/lib/actions/partners";
import { getTransports } from "@/lib/actions/wagons";
import { getWarehouse } from "@/lib/actions/warehouse";
import SaleTable from "./SaleTable";
import SaleModal from "./SaleModal";
import SaleReceiveModal from "./SaleReceiveModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
    timberId: number | null;
    transportId: number | null;
    transportName: string | null;
  }>;
};

type WarehouseItem = Awaited<ReturnType<typeof getWarehouse>>[number];
type TransportItem = Awaited<ReturnType<typeof getTransports>>[number];
type SaleWithCustomer = Awaited<ReturnType<typeof getSales>>[number];

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
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sales] = useState<SaleWithCustomer[]>(initialSales);
  const [partners] = useState<Partner[]>(initialPartners);
  const [transports] = useState<TransportItem[]>(initialTransports);
  const [warehouseItems] = useState<WarehouseItem[]>(initialWarehouse);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<SaleDetail | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        timberId: item.timberId ?? null,
        transportId: item.transportId ?? item.timber?.transportId ?? null,
        transportName: item.transport?.number ?? item.timber?.transport?.number ?? null,
      })),
    });
  };

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteSale(deleteTargetId);
      toast.success("Sotuv o'chirildi");
      startTransition(() => { router.refresh(); });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
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
        onSuccess={() => { setIsCreateOpen(false); startTransition(() => { router.refresh(); }); }}
        partners={partners}
        transports={transports}
        warehouseItems={warehouseItems}
      />

      <SaleReceiveModal
        isOpen={!!receiveTarget}
        onClose={() => setReceiveTarget(null)}
        onSuccess={() => { setReceiveTarget(null); startTransition(() => { router.refresh(); }); }}
        sale={receiveTarget}
        transports={transports}
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
