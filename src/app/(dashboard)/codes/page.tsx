import { getCodeInventory, getCodeHistory } from "@/lib/actions/codes";
import { getPartners } from "@/lib/actions/partners";
import CodesPageClient from "./_components/CodesPageClient";

export default async function CodesPage() {
  const [inventory, history, partners] = await Promise.all([
    getCodeInventory(),
    getCodeHistory(),
    getPartners(),
  ]);

  return (
    <CodesPageClient
      initialInventory={inventory}
      initialHistory={history}
      partners={partners}
    />
  );
}
