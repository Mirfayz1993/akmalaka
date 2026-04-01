export const dynamic = "force-dynamic";
import { getAllPartnersWithBalances } from "@/lib/actions/partners";
import PartnersPageClient from "./_components/PartnersPageClient";

export default async function PartnersPage() {
  const partnersWithBalances = await getAllPartnersWithBalances();
  return <PartnersPageClient initialPartnersWithBalances={partnersWithBalances} />;
}
