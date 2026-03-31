import { getSales } from "@/lib/actions/sales";
import { getPartners } from "@/lib/actions/partners";
import { getTransports } from "@/lib/actions/wagons";
import { getWarehouse } from "@/lib/actions/warehouse";
import SalesPageClient from "./_components/SalesPageClient";

export default async function SalesPage() {
  const [salesData, partnersData, wagonsData, trucksData, warehouseData] = await Promise.all([
    getSales(),
    getPartners(),
    getTransports("wagon"),
    getTransports("truck"),
    getWarehouse(),
  ]);

  return (
    <SalesPageClient
      initialSales={salesData as never}
      initialPartners={partnersData}
      initialTransports={[...wagonsData, ...trucksData] as never}
      initialWarehouse={warehouseData as never}
    />
  );
}
