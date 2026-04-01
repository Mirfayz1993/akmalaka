import { z } from "zod";

export const RecordUsdOperationSchema = z.object({
  type: z.enum(["income", "expense", "debt_give", "debt_take"]),
  amount: z.coerce.number().positive("Musbat son bo'lishi kerak"),
  description: z.string().optional(),
  partnerId: z.coerce.number().int().positive().optional(),
});

export const RecordRubOperationSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Musbat son bo'lishi kerak"),
  exchangeRate: z.coerce.number().positive("Kurs musbat bo'lishi kerak").optional(),
  description: z.string().optional(),
  partnerId: z.coerce.number().int().positive().optional(),
});

export const RecordExchangeSchema = z.object({
  usdAmount: z.coerce.number().positive("USD miqdori musbat bo'lishi kerak"),
  rubAmount: z.coerce.number().positive("RUB miqdori musbat bo'lishi kerak"),
  exchangeRate: z.coerce.number().positive("Kurs musbat bo'lishi kerak"),
  description: z.string().optional(),
});

export type RecordUsdOperationInput = z.infer<typeof RecordUsdOperationSchema>;
export type RecordRubOperationInput = z.infer<typeof RecordRubOperationSchema>;
export type RecordExchangeInput = z.infer<typeof RecordExchangeSchema>;
