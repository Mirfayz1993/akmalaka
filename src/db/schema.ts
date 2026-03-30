import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  date,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export const transportTypeEnum = pgEnum("transport_type", ["wagon", "truck"]);

export const transportStatusEnum = pgEnum("transport_status", [
  "in_transit",
  "at_border",
  "arrived",
  "unloaded",
  "closed",
]);

export const partnerTypeEnum = pgEnum("partner_type", [
  "russia_supplier",
  "code_supplier",
  "code_buyer",
  "wood_buyer",
  "service_provider",
  "truck_owner",
  "personal",
  "exchanger",
  "partner",
]);

export const codeTypeEnum = pgEnum("code_type", ["kz", "uz", "afgon"]);

export const codeStatusEnum = pgEnum("code_status", [
  "available",
  "used",
  "sold",
]);

export const cashCurrencyEnum = pgEnum("cash_currency", ["usd", "rub"]);

export const saleStatusEnum = pgEnum("sale_status", ["sent", "received"]);
export const paymentTypeEnum = pgEnum("payment_type", ["cash", "debt", "mixed"]);

export const operationTypeEnum = pgEnum("operation_type", [
  "income",
  "expense",
  "exchange",
  "debt_give",
  "debt_take",
]);

// ─── TABLES ──────────────────────────────────────────────────────────────────

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: partnerTypeEnum("type").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partnerBalances = pgTable("partner_balances", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id")
    .references(() => partners.id)
    .notNull(),
  // musbat = ular bizga qarz, manfiy = biz ularga qarz
  amount: numeric("amount").notNull(),
  currency: text("currency").default("usd"),
  description: text("description"),
  notes: text("notes"),
  docNumber: varchar("doc_number", { length: 4 }),
  transportId: integer("transport_id").references(() => transports.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transports = pgTable("transports", {
  id: serial("id").primaryKey(),
  type: transportTypeEnum("type").notNull(),
  number: text("number"),
  fromLocation: text("from_location"),
  toLocation: text("to_location"),
  sentAt: date("sent_at"),
  arrivedAt: date("arrived_at"),
  closedAt: date("closed_at"),
  tonnage: numeric("tonnage"),
  status: transportStatusEnum("status").notNull().default("in_transit"),

  // Rossiya ta'minotchisi
  supplierId: integer("supplier_id").references(() => partners.id),

  // Kod maydonlari (faqat wagon uchun)
  codeUzSupplierId: integer("code_uz_supplier_id").references(
    () => partners.id
  ),
  codeUzPricePerTon: numeric("code_uz_price_per_ton"),
  codeKzSupplierId: integer("code_kz_supplier_id").references(
    () => partners.id
  ),
  codeKzPricePerTon: numeric("code_kz_price_per_ton"),

  // Yuk mashinasi (faqat truck uchun)
  truckOwnerId: integer("truck_owner_id").references(() => partners.id),
  truckOwnerPayment: numeric("truck_owner_payment"),

  // Yog'och xaridi (RUB)
  rubPricePerCubic: numeric("rub_price_per_cubic"),
  rubExchangeRate: numeric("rub_exchange_rate"),

  // Standart xarajatlar ($)
  expenseNds: numeric("expense_nds").default("0"),
  expenseUsluga: numeric("expense_usluga").default("0"),
  expenseTupik: numeric("expense_tupik").default("0"),
  expenseXrannei: numeric("expense_xrannei").default("0"),
  expenseOrtish: numeric("expense_ortish").default("0"),
  expenseTushurish: numeric("expense_tushurish").default("0"),

  // Standart xarajat hamkorlari
  expenseNdsPartnerId: integer("expense_nds_partner_id").references(
    () => partners.id
  ),
  expenseUslugaPartnerId: integer("expense_usluga_partner_id").references(
    () => partners.id
  ),
  expenseTupikPartnerId: integer("expense_tupik_partner_id").references(
    () => partners.id
  ),
  expenseXranneiPartnerId: integer("expense_xrannei_partner_id").references(
    () => partners.id
  ),
  expenseOrtishPartnerId: integer("expense_ortish_partner_id").references(
    () => partners.id
  ),
  expenseTushirishPartnerId: integer("expense_tushurish_partner_id").references(
    () => partners.id
  ),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transportExpenses = pgTable("transport_expenses", {
  id: serial("id").primaryKey(),
  transportId: integer("transport_id")
    .references(() => transports.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  partnerId: integer("partner_id").references(() => partners.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transportLogs = pgTable("transport_logs", {
  id: serial("id").primaryKey(),
  transportId: integer("transport_id")
    .references(() => transports.id, { onDelete: "cascade" })
    .notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timbers = pgTable("timbers", {
  id: serial("id").primaryKey(),
  transportId: integer("transport_id")
    .references(() => transports.id, { onDelete: "cascade" })
    .notNull(),
  thicknessMm: integer("thickness_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  lengthM: numeric("length_m").notNull(),
  russiaCount: integer("russia_count").notNull().default(0),
  tashkentCount: integer("tashkent_count").default(0),
  customerCount: integer("customer_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const codes = pgTable("codes", {
  id: serial("id").primaryKey(),
  type: codeTypeEnum("type").notNull(),
  supplierId: integer("supplier_id")
    .references(() => partners.id)
    .notNull(),
  status: codeStatusEnum("status").notNull().default("available"),
  buyCostUsd: numeric("buy_cost_usd"),
  sellPriceUsd: numeric("sell_price_usd"),
  buyPricePerTon: numeric("buy_price_per_ton"),
  sellPricePerTon: numeric("sell_price_per_ton"),
  tonnage: numeric("tonnage"),
  usedInTransportId: integer("used_in_transport_id").references(
    () => transports.id
  ),
  soldToPartnerId: integer("sold_to_partner_id").references(() => partners.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

export const cashOperations = pgTable("cash_operations", {
  id: serial("id").primaryKey(),
  currency: cashCurrencyEnum("currency").notNull(),
  type: operationTypeEnum("type").notNull(),
  // musbat = kirim, manfiy = chiqim
  amount: numeric("amount").notNull(),
  exchangeRate: numeric("exchange_rate"),
  partnerId: integer("partner_id").references(() => partners.id),
  transportId: integer("transport_id").references(() => transports.id),
  description: text("description"),
  notes: text("notes"),
  docNumber: varchar("doc_number", { length: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .references(() => partners.id)
    .notNull(),
  status: saleStatusEnum("status").notNull().default("sent"),
  paymentType: paymentTypeEnum("payment_type"),
  totalSentUsd: numeric("total_sent_usd").default("0"),
  totalReceivedUsd: numeric("total_received_usd").default("0"),
  paidAmount: numeric("paid_amount").default("0"),
  docNumber: varchar("doc_number", { length: 4 }),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .references(() => sales.id, { onDelete: "cascade" })
    .notNull(),
  timberId: integer("timber_id").references(() => timbers.id),
  warehouseId: integer("warehouse_id").references(() => warehouse.id),
  transportId: integer("transport_id").references(() => transports.id),
  thicknessMm: integer("thickness_mm"),
  widthMm: integer("width_mm"),
  lengthM: numeric("length_m"),
  sentCount: integer("sent_count"),
  receivedCount: integer("received_count"),
  pricePerCubicUsd: numeric("price_per_cubic_usd"),
  totalUsd: numeric("total_usd"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warehouse = pgTable("warehouse", {
  id: serial("id").primaryKey(),
  timberId: integer("timber_id").references(() => timbers.id),
  transportId: integer("transport_id").references(() => transports.id),
  thicknessMm: integer("thickness_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  lengthM: numeric("length_m").notNull(),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const partnersRelations = relations(partners, ({ many }) => ({
  balances: many(partnerBalances),
  transportsAsSupplier: many(transports, { relationName: "supplier" }),
  transportsAsCodeUzSupplier: many(transports, {
    relationName: "codeUzSupplier",
  }),
  transportsAsCodeKzSupplier: many(transports, {
    relationName: "codeKzSupplier",
  }),
  transportsAsTruckOwner: many(transports, { relationName: "truckOwner" }),
  transportsAsNdsPartner: many(transports, { relationName: "ndsPartner" }),
  transportsAsUslugaPartner: many(transports, {
    relationName: "uslugaPartner",
  }),
  transportsAsTupikPartner: many(transports, { relationName: "tupikPartner" }),
  transportsAsXranneiPartner: many(transports, {
    relationName: "xranneiPartner",
  }),
  transportsAsOrtishPartner: many(transports, { relationName: "ortishPartner" }),
  transportsAsTushirishPartner: many(transports, {
    relationName: "tushirishPartner",
  }),
  expenses: many(transportExpenses),
  codesAsSupplier: many(codes, { relationName: "codeSupplier" }),
  codesAsSoldTo: many(codes, { relationName: "codeSoldTo" }),
  cashOperations: many(cashOperations),
  sales: many(sales),
}));

export const partnerBalancesRelations = relations(
  partnerBalances,
  ({ one }) => ({
    partner: one(partners, {
      fields: [partnerBalances.partnerId],
      references: [partners.id],
    }),
    transport: one(transports, {
      fields: [partnerBalances.transportId],
      references: [transports.id],
    }),
  })
);

export const transportsRelations = relations(transports, ({ one, many }) => ({
  supplier: one(partners, {
    fields: [transports.supplierId],
    references: [partners.id],
    relationName: "supplier",
  }),
  codeUzSupplier: one(partners, {
    fields: [transports.codeUzSupplierId],
    references: [partners.id],
    relationName: "codeUzSupplier",
  }),
  codeKzSupplier: one(partners, {
    fields: [transports.codeKzSupplierId],
    references: [partners.id],
    relationName: "codeKzSupplier",
  }),
  truckOwner: one(partners, {
    fields: [transports.truckOwnerId],
    references: [partners.id],
    relationName: "truckOwner",
  }),
  expenseNdsPartner: one(partners, {
    fields: [transports.expenseNdsPartnerId],
    references: [partners.id],
    relationName: "ndsPartner",
  }),
  expenseUslugaPartner: one(partners, {
    fields: [transports.expenseUslugaPartnerId],
    references: [partners.id],
    relationName: "uslugaPartner",
  }),
  expenseTupikPartner: one(partners, {
    fields: [transports.expenseTupikPartnerId],
    references: [partners.id],
    relationName: "tupikPartner",
  }),
  expenseXranneiPartner: one(partners, {
    fields: [transports.expenseXranneiPartnerId],
    references: [partners.id],
    relationName: "xranneiPartner",
  }),
  expenseOrtishPartner: one(partners, {
    fields: [transports.expenseOrtishPartnerId],
    references: [partners.id],
    relationName: "ortishPartner",
  }),
  expenseTushirishPartner: one(partners, {
    fields: [transports.expenseTushirishPartnerId],
    references: [partners.id],
    relationName: "tushirishPartner",
  }),
  expenses: many(transportExpenses),
  logs: many(transportLogs),
  timbers: many(timbers),
  codes: many(codes),
  cashOperations: many(cashOperations),
  warehouseItems: many(warehouse),
  saleItems: many(saleItems),
}));

export const transportExpensesRelations = relations(
  transportExpenses,
  ({ one }) => ({
    transport: one(transports, {
      fields: [transportExpenses.transportId],
      references: [transports.id],
    }),
    partner: one(partners, {
      fields: [transportExpenses.partnerId],
      references: [partners.id],
    }),
  })
);

export const transportLogsRelations = relations(transportLogs, ({ one }) => ({
  transport: one(transports, {
    fields: [transportLogs.transportId],
    references: [transports.id],
  }),
}));

export const timbersRelations = relations(timbers, ({ one, many }) => ({
  transport: one(transports, {
    fields: [timbers.transportId],
    references: [transports.id],
  }),
  saleItems: many(saleItems),
  warehouseItems: many(warehouse),
}));

export const codesRelations = relations(codes, ({ one }) => ({
  supplier: one(partners, {
    fields: [codes.supplierId],
    references: [partners.id],
    relationName: "codeSupplier",
  }),
  usedInTransport: one(transports, {
    fields: [codes.usedInTransportId],
    references: [transports.id],
  }),
  soldToPartner: one(partners, {
    fields: [codes.soldToPartnerId],
    references: [partners.id],
    relationName: "codeSoldTo",
  }),
}));

export const cashOperationsRelations = relations(cashOperations, ({ one }) => ({
  partner: one(partners, {
    fields: [cashOperations.partnerId],
    references: [partners.id],
  }),
  transport: one(transports, {
    fields: [cashOperations.transportId],
    references: [transports.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(partners, {
    fields: [sales.customerId],
    references: [partners.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  timber: one(timbers, {
    fields: [saleItems.timberId],
    references: [timbers.id],
  }),
  warehouse: one(warehouse, {
    fields: [saleItems.warehouseId],
    references: [warehouse.id],
  }),
  transport: one(transports, {
    fields: [saleItems.transportId],
    references: [transports.id],
  }),
}));

export const warehouseRelations = relations(warehouse, ({ one, many }) => ({
  timber: one(timbers, {
    fields: [warehouse.timberId],
    references: [timbers.id],
  }),
  transport: one(transports, {
    fields: [warehouse.transportId],
    references: [transports.id],
  }),
  saleItems: many(saleItems),
}));
