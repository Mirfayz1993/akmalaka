"use client";

import { InputHTMLAttributes } from "react";

type NumberInputProps = InputHTMLAttributes<HTMLInputElement>;

export default function NumberInput({ onFocus, ...props }: NumberInputProps) {
  return (
    <input
      type="number"
      onFocus={(e) => {
        if (e.target.value === "0") {
          e.target.value = "";
        }
        onFocus?.(e);
      }}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      {...props}
    />
  );
}
