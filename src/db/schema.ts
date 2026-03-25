import { pgTable, serial, text, integer, doublePrecision, timestamp, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. VALYUTA KURSLARI
// ==========================================
export const currencyRates = pgTable("currency_rates", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(), // YYYY-MM-DD
  usdToRub: doublePrecision("usd_to_rub").notNull(), // 1 USD = X RUB
  usdToUzs: doublePrecision("usd_to_uzs").notNull(), // 1 USD = X UZS
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 2. SHERIK (Rossiyadagi hamkor)
// ==========================================
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  location: text("location"), // Rossiya shahri
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 3. MIJOZLAR (O'zbekistondagi xaridorlar)
// ==========================================
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  type: text("type").default("wood_buyer"), // wood_buyer | code_buyer
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 4. PARTIYA (bir marta kelgan yuk)
// ==========================================
export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // masalan: "Partiya #12 - 2024-mart"
  partnerId: integer("partner_id").references(() => partners.id),
  partnerPaymentUsd: doublePrecision("partner_payment_usd").default(0), // sherikka to'lov
  purchaseDate: date("purchase_date"), // xarid sanasi
  rubToUsdRate: doublePrecision("rub_to_usd_rate").notNull(), // xarid paytidagi kurs
  status: text("status").default("in_transit"), // in_transit | at_border | arrived | distributed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 5. VAGONLAR
// ==========================================
export const wagons = pgTable("wagons", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").references(() => shipments.id), // nullable — endi ixtiyoriy
  wagonNumber: text("wagon_number").notNull(), // vagon raqami
  sentDate: date("sent_date"), // jo'natilgan sana
  arrivedDate: date("arrived_date"), // yetib kelgan sana
  fromLocation: text("from_location"), // qayerdan
  toLocation: text("to_location"), // qayerga
  tonnage: doublePrecision("tonnage"), // tonna
  partnerId: integer("partner_id").references(() => partners.id), // rus yetkazib beruvchi
  rubToUsdRate: doublePrecision("rub_to_usd_rate"), // rubl/dollar kursi
  purchaseDate: date("purchase_date"), // xarid sanasi (eski — backward compat)
  totalCubicMeters: doublePrecision("total_cubic_meters").default(0), // jami kub
  transportCostUsd: doublePrecision("transport_cost_usd").default(0), // transport xarajati
  unloadingCostUsd: doublePrecision("unloading_cost_usd").default(0), // tushirish xarajati
  status: text("status").default("in_transit"), // in_transit | at_border | arrived | unloaded
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 6. TAXTA O'LCHAMLARI (vagondagi taxtalar)
// ==========================================
export const wagonTimber = pgTable("wagon_timber", {
  id: serial("id").primaryKey(),
  wagonId: integer("wagon_id").references(() => wagons.id).notNull(),
  widthMm: integer("width_mm").notNull(), // eni (mm)
  thicknessMm: integer("thickness_mm").notNull(), // qalinligi (mm)
  lengthM: doublePrecision("length_m").notNull(), // uzunligi (metr)
  quantity: integer("quantity").notNull(), // dona soni
  cubicMeters: doublePrecision("cubic_meters").notNull(), // hisoblangan kub
  pricePerCubicRub: doublePrecision("price_per_cubic_rub").notNull(), // rubl/kub narx
  pricePerCubicUsd: doublePrecision("price_per_cubic_usd"), // dollar/kub (kurs bo'yicha)
  remainingQuantity: integer("remaining_quantity"), // omborda qolgan
  tashkentCount: integer("tashkent_count"),          // Toshkentda sanangan
  customerCount: integer("customer_count"),           // Mijoz sanagan
  notes: text("notes"),
});

// ==========================================
// 7. BOJXONA KODLARI
// ==========================================
export const customsCodes = pgTable("customs_codes", {
  id: serial("id").primaryKey(),
  // Asosiy ma'lumotlar
  soni: text("soni"),                                    // tartib raqami
  oy: text("oy"),                                        // oy (yanvar, fevral...)
  kodUz: text("kod_uz"),                                 // O'zbekiston kod raqami
  kzKod: text("kz_kod"),                                 // Qozog'iston kod raqami
  // Marshrut
  jonatishJoyi: text("jonatish_joyi"),                   // jo'natish joyi
  kelishJoyi: text("kelish_joyi"),                       // kelish joyi
  // Zayavka
  tonna: doublePrecision("tonna"),                       // tonna
  dataZayavki: date("data_zayavki"),                     // zayavka sanasi
  yuboruvchi: text("yuboruvchi"),                         // yuboruvchi
  qabulQiluvchi: text("qabul_qiluvchi"),                 // qabul qiluvchi
  // Vagon ma'lumotlari
  nomerVagon: text("nomer_vagon"),                       // vagon raqami
  nomerOtpravka: text("nomer_otpravka"),                 // otpravka raqami
  // Vazn
  fakticheskiyVes: doublePrecision("fakticheskiy_ves"),  // haqiqiy vazn
  okruglonniyVes: doublePrecision("okruglonniy_ves"),    // yaxlitlangan vazn
  // Stavkalar va tariflar
  stavkaKz: doublePrecision("stavka_kz"),                // KZ stavkasi
  tarifKz: doublePrecision("tarif_kz"),                  // = okruglonniy_ves × stavka_kz
  stavkaUz: doublePrecision("stavka_uz"),                // UZ stavkasi
  tarifUz: doublePrecision("tarif_uz"),                  // = okruglonniy_ves × stavka_uz
  avgonTarif: doublePrecision("avgon_tarif"),            // Afg'on tarifi (ixtiyoriy)
  obshiyTarif: doublePrecision("obshiy_tarif"),          // = tarif_kz + tarif_uz + avgon_tarif
  tolov: doublePrecision("tolov"),                       // to'lov summasi
  // Bog'lanishlar
  wagonId: integer("wagon_id").references(() => wagons.id),  // o'z vagonimiz (nullable)
  clientId: integer("client_id").references(() => clients.id), // kod xaridori (nullable)
  supplierId: integer("supplier_id").references(() => clients.id), // kimdan olindi (nullable)
  usageType: text("usage_type").default("own"),          // own | sold
  status: text("status").default("active"),              // active | used | sold
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 8. KOD SOTISH (kodlarni boshqalarga sotish)
// ==========================================
export const codeSales = pgTable("code_sales", {
  id: serial("id").primaryKey(),
  customsCodeId: integer("customs_code_id").references(() => customsCodes.id).notNull(),
  clientId: integer("client_id").references(() => clients.id), // kod xaridori
  buyerName: text("buyer_name"),                         // tashqi xaridor (agar mijoz bo'lmasa)
  buyerPhone: text("buyer_phone"),
  // Yangi stavkalar (qimmatroq narx bilan)
  saleStavkaKz: doublePrecision("sale_stavka_kz"),       // sotish uchun KZ stavka
  saleStavkaUz: doublePrecision("sale_stavka_uz"),       // sotish uchun UZ stavka
  saleTarifKz: doublePrecision("sale_tarif_kz"),         // yangi tarif KZ
  saleTarifUz: doublePrecision("sale_tarif_uz"),         // yangi tarif UZ
  saleObshiyTarif: doublePrecision("sale_obshiy_tarif"), // yangi umumiy tarif
  saleAmountUsd: doublePrecision("sale_amount_usd").notNull(), // sotilgan narx
  profitUsd: doublePrecision("profit_usd"),              // foyda
  paymentType: text("payment_type").default("cash"),     // cash | debt
  saleDate: date("sale_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 9. QO'SHIMCHA XARAJATLAR (vagonga bog'liq)
// ==========================================
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  wagonId: integer("wagon_id").references(() => wagons.id),
  shipmentId: integer("shipment_id").references(() => shipments.id),
  category: text("category").notNull(), // transport | unloading | broker | customs | other
  description: text("description").notNull(),
  amountUsd: doublePrecision("amount_usd").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 10. SOTISH (mijozga taxta berish)
// ==========================================
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  wagonTimberId: integer("wagon_timber_id").references(() => wagonTimber.id).notNull(),
  quantity: integer("quantity").notNull(), // nechta taxta
  cubicMeters: doublePrecision("cubic_meters").notNull(), // necha kub
  pricePerCubicUsd: doublePrecision("price_per_cubic_usd").notNull(), // sotish narxi $/kub
  totalAmountUsd: doublePrecision("total_amount_usd").notNull(), // jami summa
  saleDate: date("sale_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 11. KASSA (kirim/chiqim)
// ==========================================
export const cashOperations = pgTable("cash_operations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // income | expense
  category: text("category").notNull(), // sale | code_sale | partner_payment | expense | debt_payment
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(), // USD | RUB | UZS
  relatedSaleId: integer("related_sale_id").references(() => sales.id),
  relatedExpenseId: integer("related_expense_id").references(() => expenses.id),
  relatedDebtId: integer("related_debt_id").references(() => debts.id),
  description: text("description").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 12. QARZ DAFTAR
// ==========================================
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id), // nullable — my_debt uchun kerak emas
  saleId: integer("sale_id").references(() => sales.id),
  debtType: text("debt_type").default("client_debt"), // client_debt | my_debt
  supplierName: text("supplier_name"), // my_debt uchun — kimga qarzdormiz
  totalAmountUsd: doublePrecision("total_amount_usd").notNull(), // jami qarz
  paidAmountUsd: doublePrecision("paid_amount_usd").default(0), // to'langan
  remainingAmountUsd: doublePrecision("remaining_amount_usd").notNull(), // qolgan qarz
  status: text("status").default("active"), // active | partially_paid | paid
  dueDate: date("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// 13. QARZ TO'LOVLARI
// ==========================================
export const debtPayments = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id").references(() => debts.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(), // USD | UZS
  exchangeRate: doublePrecision("exchange_rate"), // agar UZS da to'lasa
  amountInUsd: doublePrecision("amount_in_usd").notNull(), // USD ga aylantirilgan
  paymentMethod: text("payment_method").notNull(), // cash | bank_transfer | card
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// RELATIONS
// ==========================================
export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  partner: one(partners, { fields: [shipments.partnerId], references: [partners.id] }),
  wagons: many(wagons),
  expenses: many(expenses),
}));

export const wagonsRelations = relations(wagons, ({ one, many }) => ({
  shipment: one(shipments, { fields: [wagons.shipmentId], references: [shipments.id] }),
  timber: many(wagonTimber),
  customsCodes: many(customsCodes),
  expenses: many(expenses),
}));

export const wagonTimberRelations = relations(wagonTimber, ({ one, many }) => ({
  wagon: one(wagons, { fields: [wagonTimber.wagonId], references: [wagons.id] }),
  sales: many(sales),
}));

export const customsCodesRelations = relations(customsCodes, ({ one, many }) => ({
  wagon: one(wagons, { fields: [customsCodes.wagonId], references: [wagons.id] }),
  client: one(clients, { fields: [customsCodes.clientId], references: [clients.id] }),
  codeSales: many(codeSales),
}));

export const codeSalesRelations = relations(codeSales, ({ one }) => ({
  customsCode: one(customsCodes, { fields: [codeSales.customsCodeId], references: [customsCodes.id] }),
  client: one(clients, { fields: [codeSales.clientId], references: [clients.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  sales: many(sales),
  debts: many(debts),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  client: one(clients, { fields: [sales.clientId], references: [clients.id] }),
  wagonTimber: one(wagonTimber, { fields: [sales.wagonTimberId], references: [wagonTimber.id] }),
}));

export const debtsRelations = relations(debts, ({ one, many }) => ({
  client: one(clients, { fields: [debts.clientId], references: [clients.id] }),
  sale: one(sales, { fields: [debts.saleId], references: [sales.id] }),
  payments: many(debtPayments),
}));

export const debtPaymentsRelations = relations(debtPayments, ({ one }) => ({
  debt: one(debts, { fields: [debtPayments.debtId], references: [debts.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  wagon: one(wagons, { fields: [expenses.wagonId], references: [wagons.id] }),
  shipment: one(shipments, { fields: [expenses.shipmentId], references: [shipments.id] }),
}));
