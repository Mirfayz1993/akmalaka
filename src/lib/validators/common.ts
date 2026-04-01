import { z } from "zod";

export const positiveNumber = z.coerce.number().positive("Musbat son bo'lishi kerak");
export const nonNegativeNumber = z.coerce.number().min(0, "0 dan katta yoki teng bo'lishi kerak");
export const optionalPositiveNumber = z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined));
export const requiredString = z.string().min(1, "Bu maydon to'ldirilishi shart");
export const optionalString = z.string().optional();
