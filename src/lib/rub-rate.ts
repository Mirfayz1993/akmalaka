// RUB kassa uchun "running weighted average" kurs hisoblagichi.
// Caller xronologik tartibda (asc by id) operatsiyalarni uzatishi shart.

export type RubOpInput = {
  amount: string;
  exchangeRate: string | null;
};

export type RubAvgRateResult = {
  rubBalance: number;
  avgRate: number;
};

export function calcRubAvgRate(rubOps: RubOpInput[]): RubAvgRateResult {
  let rubRunning = 0;
  let usdRunning = 0;

  for (const op of rubOps) {
    const amount = parseFloat(op.amount);
    if (amount > 0) {
      const rate = op.exchangeRate ? parseFloat(op.exchangeRate) : 0;
      if (rate > 0) {
        usdRunning += amount / rate;
        rubRunning += amount;
      } else {
        rubRunning += amount;
      }
    } else {
      if (rubRunning > 0) {
        const fraction = (rubRunning + amount) / rubRunning;
        usdRunning *= fraction;
        rubRunning += amount;
        if (rubRunning <= 0) {
          rubRunning = 0;
          usdRunning = 0;
        }
      }
    }
  }

  const rubBalance = rubOps.reduce((s, op) => s + parseFloat(op.amount), 0);
  const avgRate = usdRunning > 0 ? rubRunning / usdRunning : 0;

  return { rubBalance, avgRate };
}
