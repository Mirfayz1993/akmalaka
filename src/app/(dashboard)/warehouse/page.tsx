import { getWarehouse } from "@/lib/actions/warehouse";
import WarehouseTable from "./_components/WarehouseTable";

export default async function WarehousePage() {
  const data = await getWarehouse();
  const items = data.map((w) => ({
    id: w.id,
    thicknessMm: w.thicknessMm,
    widthMm: w.widthMm,
    lengthM: w.lengthM,
    quantity: w.quantity,
    transport: w.transport ? { number: w.transport.number ?? null } : null,
    createdAt: w.createdAt,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Omborxona</h1>
      </div>
      <WarehouseTable items={items} />
    </div>
  );
}
