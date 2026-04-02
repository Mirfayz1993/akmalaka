"use client";

import { useRef } from "react";

// +998 XX XXX XX XX formatida real-vaqt formatlash
function formatUzPhone(raw: string): string {
  // +998 dan keyingi raqamlarni ajratib olish
  const afterPrefix = raw.startsWith("+998") ? raw.slice(4) : raw;
  const digits = afterPrefix.replace(/\D/g, "").slice(0, 9);

  let result = "+998";
  if (digits.length > 0) result += " " + digits.slice(0, 2);
  if (digits.length > 2) result += " " + digits.slice(2, 5);
  if (digits.length > 5) result += " " + digits.slice(5, 7);
  if (digits.length > 7) result += " " + digits.slice(7, 9);
  return result;
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PhoneInput({ value, onChange, className }: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatUzPhone(e.target.value);
    onChange(formatted);
    // Kursorni oxiriga qo'yamiz
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = inputRef.current;
    if (!input) return;
    const pos = input.selectionStart ?? 0;
    // +998 prefiksini o'chirib bo'lmaydi (birinchi 4 belgi)
    if ((e.key === "Backspace" || e.key === "Delete") && pos <= 4) {
      e.preventDefault();
    }
  }

  function handleFocus() {
    // Focus bo'lganda kursorni oxiriga o'tkazish
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    });
  }

  return (
    <input
      ref={inputRef}
      type="tel"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      placeholder="+998 90 123 45 67"
      maxLength={17}
      className={className}
    />
  );
}
