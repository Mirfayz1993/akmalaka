// Transport status labels (4-bosqichli tizim)
export const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  in_transit: "Yo'lda",
  arrived: "Yetib kelgan",
  unloaded: "Tushurilgan",
  closed: "Yopilgan",
};

// Transport status colors
export const TRANSPORT_STATUS_COLORS: Record<string, string> = {
  in_transit: "bg-yellow-100 text-yellow-700",
  arrived: "bg-blue-100 text-blue-700",
  unloaded: "bg-purple-100 text-purple-700",
  closed: "bg-slate-100 text-slate-500",
};

// Status ketma-ketligi (faqat oldinga)
export const STATUS_ORDER: Record<string, number> = {
  in_transit: 0,
  arrived: 1,
  unloaded: 2,
  closed: 3,
};

// Keyingi status
export const NEXT_STATUS: Record<string, string> = {
  in_transit: "arrived",
  arrived: "unloaded",
  unloaded: "closed",
};

// Partner type labels
export const PARTNER_TYPE_LABELS: Record<string, string> = {
  russia_supplier: "Rossiya yetkazuvchi",
  code_supplier: "Kod yetkazuvchi",
  code_buyer: "Kod sotib oluvchi",
  wood_buyer: "Yog'och sotib oluvchi",
  service_provider: "Xizmat ko'rsatuvchi",
  truck_owner: "Yuk mashinasi egasi",
  personal: "Shaxsiy",
  exchanger: "Sarof",
  partner: "Hamkor",
};

// Cash operation type labels
export const OPERATION_TYPE_LABELS: Record<string, string> = {
  income: "Kirim",
  expense: "Chiqim",
  exchange: "Almashtirish",
  debt_give: "Qarz berildi",
  debt_take: "Qarz olindi",
};

// Code type labels
export const CODE_TYPE_LABELS: Record<string, string> = {
  kz: "KZ",
  uz: "UZ",
  afgon: "AFGON",
};

// Code status labels
export const CODE_STATUS_LABELS: Record<string, string> = {
  available: "Mavjud",
  used: "Ishlatildi",
  sold: "Sotildi",
};

// Sale status labels
export const SALE_STATUS_LABELS: Record<string, string> = {
  sent: "Yuborildi",
  received: "Qabul qilindi",
};

// Payment type labels
export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: "Naqd",
  debt: "Nasiya",
  mixed: "Aralash",
};

// Standard expense names
export const STANDARD_EXPENSE_NAMES = [
  "NDS",
  "Usluga",
  "Tupik",
  "Xrannei",
  "Ortish",
  "Tushurish",
] as const;
