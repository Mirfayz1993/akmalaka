"use client";

import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

interface State {
  callback: () => Promise<void> | void;
}

export function useDeleteConfirm(message = "Haqiqatdan ham o'chirmoqchimisiz?") {
  const [pending, setPending] = useState<State | null>(null);
  const [loading, setLoading] = useState(false);

  function confirm(callback: () => Promise<void> | void) {
    setPending({ callback });
  }

  async function handleConfirm() {
    if (!pending) return;
    setLoading(true);
    try {
      await pending.callback();
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  const dialog = (
    <ConfirmDialog
      isOpen={!!pending}
      onClose={() => setPending(null)}
      onConfirm={handleConfirm}
      title="O'chirishni tasdiqlash"
      message={message}
      confirmText="O'chirish"
      isLoading={loading}
    />
  );

  return { confirm, dialog };
}
