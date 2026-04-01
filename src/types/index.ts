import type {
  partners,
  transports,
  timbers,
  codes,
  cashOperations,
  sales,
  saleItems,
  warehouse,
  partnerBalances,
  transportExpenses,
  transportLogs,
} from "@/db/schema";

// ─── Inferred DB types ────────────────────────────────────────────────────────

export type Partner = typeof partners.$inferSelect;
export type PartnerInsert = typeof partners.$inferInsert;

export type Transport = typeof transports.$inferSelect;
export type TransportInsert = typeof transports.$inferInsert;

export type Timber = typeof timbers.$inferSelect;
export type TimberInsert = typeof timbers.$inferInsert;

export type Code = typeof codes.$inferSelect;
export type CodeInsert = typeof codes.$inferInsert;

export type CashOperation = typeof cashOperations.$inferSelect;
export type CashOperationInsert = typeof cashOperations.$inferInsert;

export type Sale = typeof sales.$inferSelect;
export type SaleInsert = typeof sales.$inferInsert;

export type SaleItem = typeof saleItems.$inferSelect;
export type SaleItemInsert = typeof saleItems.$inferInsert;

export type Warehouse = typeof warehouse.$inferSelect;
export type WarehouseInsert = typeof warehouse.$inferInsert;

export type PartnerBalance = typeof partnerBalances.$inferSelect;
export type PartnerBalanceInsert = typeof partnerBalances.$inferInsert;

export type TransportExpense = typeof transportExpenses.$inferSelect;
export type TransportExpenseInsert = typeof transportExpenses.$inferInsert;

export type TransportLog = typeof transportLogs.$inferSelect;

// ─── Composite types (with relations) ────────────────────────────────────────

export type TransportWithRelations = Transport & {
  supplier?: Partner | null;
  timbers: Timber[];
  expenses: (TransportExpense & { partner?: Partner | null })[];
  logs: TransportLog[];
};

export type PartnerWithBalances = Partner & {
  balances?: PartnerBalance[];
};

export type SaleWithRelations = Sale & {
  customer?: Partner | null;
  items: SaleItem[];
};

// ─── Server action result type ────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Timber input type (for wagon creation) ───────────────────────────────────

export type TimberInput = {
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  russiaCount: number;
};
