// Kub hisoblash
export function calculateCubicMeters(
  widthMm: number,
  thicknessMm: number,
  lengthM: number,
  quantity: number
): number {
  return (widthMm / 1000) * (thicknessMm / 1000) * lengthM * quantity;
}

// Valyuta konvertatsiya
export function convertRubToUsd(amountRub: number, rubToUsdRate: number): number {
  return amountRub / rubToUsdRate;
}

// Valyuta formatlash
export function formatCurrency(amount: number, currency: "USD" | "RUB"): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    RUB: new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }),
  };
  return formatters[currency].format(amount);
}

// Taxta o'lchamini kompakt formatda ko'rsatish
// Natija: "31mm × 125mm × 6m × 115 dona"
export function formatTimberDimensions(
  thicknessMm: number,
  widthMm: number,
  lengthM: number,
  quantity: number
): string {
  return `${thicknessMm}mm × ${widthMm}mm × ${lengthM}m × ${quantity} dona`;
}

// 1 kub metrda nechta dona sig'adi
export function piecesPerCubicMeter(
  widthMm: number,
  thicknessMm: number,
  lengthM: number
): number {
  const singleVolume = (widthMm / 1000) * (thicknessMm / 1000) * lengthM;
  return singleVolume > 0 ? Math.round(1 / singleVolume) : 0;
}

// Sana formatlash
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}
