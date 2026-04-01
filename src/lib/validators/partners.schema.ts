import { z } from "zod";

export const CreatePartnerSchema = z.object({
  name: z.string().min(1, "Hamkor nomi kiritilishi shart").max(200, "Nom juda uzun"),
  type: z.enum([
    "russia_supplier",
    "code_supplier",
    "code_buyer",
    "wood_buyer",
    "service_provider",
    "truck_owner",
    "personal",
    "exchanger",
    "partner",
  ]),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const CreatePaymentSchema = z.object({
  partnerId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Musbat son bo'lishi kerak"),
  currency: z.enum(["usd", "rub"]),
  type: z.enum(["debt_give", "debt_take"]),
  description: z.string().optional(),
});

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
