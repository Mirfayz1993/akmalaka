"use client";
import { useState, useEffect } from "react";

function toDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y.slice(2)}`;
}

function fromDigits(digits: string): string {
  let result = "";
  for (let i = 0; i < Math.min(digits.length, 6); i++) {
    if (i === 2 || i === 4) result += ".";
    result += digits[i];
  }
  return result;
}

function toISO(display: string): string {
  const parts = display.split(".");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  if (d.length !== 2 || m.length !== 2 || (y.length !== 2 && y.length !== 4)) return "";
  const year = y.length === 2 ? `20${y}` : y;
  if (parseInt(d) < 1 || parseInt(d) > 31) return "";
  if (parseInt(m) < 1 || parseInt(m) > 12) return "";
  return `${year}-${m}-${d}`;
}

export default function ShortDateInput({
  value,
  onChange,
  className,
  required,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  required?: boolean;
}) {
  const [text, setText] = useState(toDisplay(value));

  useEffect(() => {
    setText(toDisplay(value));
  }, [value]);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    const formatted = fromDigits(digits);
    setText(formatted);
    const iso = toISO(formatted);
    if (iso) onChange(iso);
  }

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="KK.OO.YY"
      maxLength={8}
      className={className}
      required={required}
    />
  );
}
