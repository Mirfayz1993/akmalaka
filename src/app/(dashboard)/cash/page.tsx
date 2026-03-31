import { getUsdBalance, getRubState, getUsdOperations, getRubOperations, getExchangeHistory } from "@/lib/actions/cash";
import { getPartners } from "@/lib/actions/partners";
import CashPageClient from "./_components/CashPageClient";

export default async function CashPage() {
  const [usdBalance, rubSt, usdOps, rubOps, exchHist, partners] = await Promise.all([
    getUsdBalance(),
    getRubState(),
    getUsdOperations(),
    getRubOperations(),
    getExchangeHistory(),
    getPartners(),
  ]);

  return (
    <CashPageClient
      initialUsdBalance={usdBalance}
      initialRubBalance={rubSt.rubBalance}
      initialAvgRate={rubSt.avgRate}
      initialUsdOps={usdOps as never}
      initialRubOps={rubOps as never}
      initialExchanges={exchHist as never}
      partners={partners}
    />
  );
}
