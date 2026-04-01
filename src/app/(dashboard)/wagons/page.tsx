export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { getTransports } from "@/lib/actions/wagons";
import { getPartners } from "@/lib/actions/partners";
import WagonsPageClient from "./_components/WagonsPageClient";
import { TableSkeleton } from "@/components/ui/Skeleton";

async function WagonsContent() {
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

export default function WagonsPage() {
  return (
    <Suspense fallback={<div className="p-6"><TableSkeleton rows={8} /></div>}>
      <WagonsContent />
    </Suspense>
  );
}
