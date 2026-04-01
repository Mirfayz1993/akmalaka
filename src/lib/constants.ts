// Transport status labels
export const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  in_transit: "Yo'lda",
  at_border: "Chegara",
  arrived: "Yetib keldi",
  unloaded: "Tushirildi",
  closed: "Yopildi",
};

// Transport status colors
export const TRANSPORT_STATUS_COLORS: Record<string, string> = {
  in_transit: "bg-yellow-100 text-yellow-700",
  at_border: "bg-orange-100 text-orange-700",
  arrived: "bg-green-100 text-green-700",
  unloaded: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-600",
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
