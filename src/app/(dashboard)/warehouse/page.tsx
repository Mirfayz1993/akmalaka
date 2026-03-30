"use client";

import { useState, useEffect } from "react";
import WarehouseTable from "./_components/WarehouseTable";
import { getWarehouse, backfillWarehouseFromClosedWagons } from "@/lib/actions/warehouse";

type WarehouseItem = {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string | number;
  quantity: number;
  transport: { number: string | null } | null;
  createdAt: Date | string | null;
};

export default function WarehousePage() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await backfillWarehouseFromClosedWagons();
      const data = await getWarehouse();
      // Map to WarehouseItem shape (only needed fields)
      const mapped: WarehouseItem[] = data.map((w) => ({
        id: w.id,
        thicknessMm: w.thicknessMm,
        widthMm: w.widthMm,
        lengthM: w.lengthM,
        quantity: w.quantity,
        transport: w.transport ? { number: w.transport.number ?? null } : null,
        createdAt: w.createdAt,
      }));
      setItems(mapped);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Omborxona</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Yuklanmoqda...
        </div>
      ) : (
        <WarehouseTable items={items} />
      )}
    </div>
  );
}
