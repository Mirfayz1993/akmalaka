import { getPartners } from "@/lib/actions/partners";
import PartnersPageClient from "./_components/PartnersPageClient";

export default async function PartnersPage() {
  const partners = await getPartners();
  return <PartnersPageClient initialPartners={partners} />;
}
