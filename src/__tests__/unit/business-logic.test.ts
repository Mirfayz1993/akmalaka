import { describe, it, expect } from "vitest";

// ─── Biznes logika funksiyalari (server action'lardan chiqarilgan) ─────────────

/**
 * Kub hisoblash: (qalinlik/1000) × (kenglik/1000) × uzunlik × soni
 */
function calcCub(thicknessMm: number, widthMm: number, lengthM: number, count: number): number {
  return (thicknessMm / 1000) * (widthMm / 1000) * lengthM * count;
}

/**
 * Tonnaj bo'yicha kod narxi hisoblash (TZ qoida #1: tonnaj × $/t)
 */
function calcCodeCost(tonnage: number, pricePerTon: number): number {
  return tonnage * pricePerTon;
}

/**
 * O'rtacha kurs hisoblash (weighted average)
 */
function calcWeightedAvgRate(
  operations: Array<{ amount: number; exchangeRate: number | null }>
): number {
  const incomeOps = operations.filter((op) => op.amount > 0 && op.exchangeRate && op.exchangeRate > 0);
  if (incomeOps.length === 0) return 0;

  const totalRub = incomeOps.reduce((sum, op) => sum + op.amount, 0);
  const totalUsd = incomeOps.reduce((sum, op) => sum + op.amount / op.exchangeRate!, 0);

  return totalUsd > 0 ? totalRub / totalUsd : 0;
}

/**
 * Savdo uchun umumiy USD summasi
 */
function calcSaleTotal(
  items: Array<{ thicknessMm: number; widthMm: number; lengthM: number; count: number; pricePerCubicUsd: number }>
): number {
  return items.reduce((total, item) => {
    const cub = calcCub(item.thicknessMm, item.widthMm, item.lengthM, item.count);
    return total + cub * item.pricePerCubicUsd;
  }, 0);
}

// ─── TESTLAR ─────────────────────────────────────────────────────────────────

describe("Kub hisoblash (calcCub)", () => {
  it("standart o'lcham uchun to'g'ri hisoblaydi", () => {
    // 25mm × 150mm × 6m × 100 dona
    const result = calcCub(25, 150, 6, 100);
    expect(result).toBeCloseTo(2.25, 4);
  });

  it("sifr soni bilan 0 qaytaradi", () => {
    expect(calcCub(25, 150, 6, 0)).toBe(0);
  });

  it("sifr o'lcham bilan 0 qaytaradi", () => {
    expect(calcCub(0, 150, 6, 100)).toBe(0);
    expect(calcCub(25, 0, 6, 100)).toBe(0);
    expect(calcCub(25, 150, 0, 100)).toBe(0);
  });

  it("kichik o'lchamlar uchun ham to'g'ri hisoblaydi", () => {
    // 10mm × 100mm × 3m × 1 dona
    const result = calcCub(10, 100, 3, 1);
    expect(result).toBeCloseTo(0.003, 6);
  });
});

describe("Kod narxi hisoblash (calcCodeCost)", () => {
  it("tonnaj × narx = to'g'ri natija", () => {
    // 60 tonna × $5/t = $300
    expect(calcCodeCost(60, 5)).toBe(300);
  });

  it("nol tonnaj bilan 0 qaytaradi", () => {
    expect(calcCodeCost(0, 5)).toBe(0);
  });

  it("nol narx bilan 0 qaytaradi", () => {
    expect(calcCodeCost(60, 0)).toBe(0);
  });

  it("kasr tonnaj uchun ham to'g'ri ishlaydi", () => {
    // 65.5 tonna × $4.5/t = $294.75
    expect(calcCodeCost(65.5, 4.5)).toBeCloseTo(294.75, 2);
  });
});

describe("O'rtacha kurs hisoblash (calcWeightedAvgRate)", () => {
  it("bir xil kurs uchun o'sha kursni qaytaradi", () => {
    const ops = [
      { amount: 100_000, exchangeRate: 12000 },
      { amount: 200_000, exchangeRate: 12000 },
    ];
    expect(calcWeightedAvgRate(ops)).toBeCloseTo(12000, 0);
  });

  it("turli kurslar uchun og'irlikli o'rtacha hisoblaydi", () => {
    // 100_000 @ 12000 = 8.33 USD
    // 200_000 @ 13000 = 15.38 USD
    // Total: 300_000 RUB / 23.72 USD ≈ 12647 RUB/USD
    const ops = [
      { amount: 100_000, exchangeRate: 12000 },
      { amount: 200_000, exchangeRate: 13000 },
    ];
    const result = calcWeightedAvgRate(ops);
    expect(result).toBeGreaterThan(12000);
    expect(result).toBeLessThan(13000);
  });

  it("bo'sh massiv bilan 0 qaytaradi", () => {
    expect(calcWeightedAvgRate([])).toBe(0);
  });

  it("manfiy summalar inobatga olinmaydi", () => {
    const ops = [
      { amount: 100_000, exchangeRate: 12000 },
      { amount: -50_000, exchangeRate: 12000 }, // chiqim — inobatga olinmasin
    ];
    expect(calcWeightedAvgRate(ops)).toBeCloseTo(12000, 0);
  });

  it("exchangeRate = null bo'lsa inobatga olinmaydi", () => {
    const ops = [
      { amount: 100_000, exchangeRate: 12000 },
      { amount: 50_000, exchangeRate: null },
    ];
    expect(calcWeightedAvgRate(ops)).toBeCloseTo(12000, 0);
  });
});

describe("Savdo jami hisoblash (calcSaleTotal)", () => {
  it("bir mahsulot uchun to'g'ri hisoblaydi", () => {
    const items = [
      { thicknessMm: 25, widthMm: 150, lengthM: 6, count: 100, pricePerCubicUsd: 200 },
    ];
    // kub = 0.025 × 0.15 × 6 × 100 = 2.25 m³
    // jami = 2.25 × 200 = $450
    expect(calcSaleTotal(items)).toBeCloseTo(450, 2);
  });

  it("bir nechta mahsulot uchun to'g'ri yig'adi", () => {
    const items = [
      { thicknessMm: 25, widthMm: 150, lengthM: 6, count: 100, pricePerCubicUsd: 200 },
      { thicknessMm: 50, widthMm: 200, lengthM: 4, count: 50, pricePerCubicUsd: 300 },
    ];
    // 1-mahsulot: 2.25 m³ × $200 = $450
    // 2-mahsulot: 0.05 × 0.2 × 4 × 50 = 2 m³ × $300 = $600
    // jami: $1050
    expect(calcSaleTotal(items)).toBeCloseTo(1050, 2);
  });

  it("bo'sh massiv bilan 0 qaytaradi", () => {
    expect(calcSaleTotal([])).toBe(0);
  });
});

describe("Transport status tartibi", () => {
  const validTransitions: Record<string, string[]> = {
    in_transit: ["at_border"],
    at_border: ["arrived"],
    arrived: ["unloaded", "closed"],
    unloaded: ["closed"],
    closed: [],
  };

  it("in_transit dan faqat at_border ga o'tish mumkin", () => {
    expect(validTransitions["in_transit"]).toContain("at_border");
    expect(validTransitions["in_transit"]).not.toContain("closed");
  });

  it("closed holat uchun o'tish yo'q", () => {
    expect(validTransitions["closed"]).toHaveLength(0);
  });

  it("arrived dan unloaded yoki closed ga o'tish mumkin", () => {
    expect(validTransitions["arrived"]).toContain("unloaded");
    expect(validTransitions["arrived"]).toContain("closed");
  });
});
