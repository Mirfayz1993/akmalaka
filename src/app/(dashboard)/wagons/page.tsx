export const dynamic = "force-dynamic";
import { getTransports } from "@/lib/actions/wagons";
import { getPartners } from "@/lib/actions/partners";
import WagonsPageClient from "./_components/WagonsPageClient";

export default async function WagonsPage() {
  const [wagons, trucks, partners] = await Promise.all([
    getTransports("wagon"),
    getTransports("truck"),
    getPartners(),
  ]);

  return (
    <WagonsPageClient
      initialWagons={wagons}
      initialTrucks={trucks}
      partners={partners}
    />
  );
}
