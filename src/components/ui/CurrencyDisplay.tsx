"use client";

interface CurrencyDisplayProps {
  amount: number;
  currency: "USD" | "RUB";
}

const formatters: Record<
  "USD" | "RUB",
  (amount: number) => string
> = {
  USD: (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount),

  RUB: (amount) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount),
};

export default function CurrencyDisplay({
  amount,
  currency,
}: CurrencyDisplayProps) {
  const formatted = formatters[currency](amount);

  return (
    <span className="font-mono font-medium tabular-nums text-slate-800">
      {formatted}
    </span>
  );
}
