import { z } from "zod";
import { positiveNumber, optionalPositiveNumber, optionalString } from "./common";

export const TimberInputSchema = z.object({
  thicknessMm: positiveNumber,
  widthMm: positiveNumber,
  lengthM: positiveNumber,
  russiaCount: z.coerce.number().int().positive("Butun musbat son bo'lishi kerak"),
});

export const CreateTransportSchema = z.object({
  type: z.enum(["wagon", "truck"]),
  number: optionalString,
  supplierId: z.coerce.number().int().positive().optional(),
  codeUzSupplierId: z.coerce.number().int().positive().optional(),
  codeKzSupplierId: z.coerce.number().int().positive().optional(),
  tonnage: optionalPositiveNumber,
  rubPricePerCubic: optionalPositiveNumber,
  codeUzPricePerTon: optionalPositiveNumber,
  codeKzPricePerTon: optionalPositiveNumber,
  timbers: z.array(TimberInputSchema).optional(),
});

export const AddExpenseSchema = z.object({
  name: z.string().min(1, "Xarajat nomi kiritilishi shart"),
  amount: z.coerce.number().positive("Musbat son bo'lishi kerak"),
  partnerId: z.coerce.number().int().positive().optional(),
});

export type CreateTransportInput = z.infer<typeof CreateTransportSchema>;
export type AddExpenseInput = z.infer<typeof AddExpenseSchema>;
export type TimberInputType = z.infer<typeof TimberInputSchema>;
