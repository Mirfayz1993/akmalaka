export const dynamic = "force-dynamic";
import { getPartners } from "@/lib/actions/partners";
import { getUsdBalance, getRubState } from "@/lib/actions/cash";
import OpeningBalanceClient from "./_components/OpeningBalanceClient";

export default async function SozlamalarPage() {
  const [partners, usdBalance, rubState] = await Promise.all([
    getPartners(),
    getUsdBalance(),
    getRubState(),
  ]);

  return (
    <OpeningBalanceClient
      partners={partners}
      currentUsdBalance={usdBalance}
      currentRubBalance={rubState.rubBalance}
    />
  );
}
