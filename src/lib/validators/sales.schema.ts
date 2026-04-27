import { z } from "zod";

export const SaleItemSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  count: z.coerce.number().int().positive("Miqdor musbat butun son bo'lishi kerak"),
  pricePerCubicUsd: z.coerce.number().positive("Narx musbat bo'lishi kerak"),
});

export const CreateSaleSchema = z.object({
  customerId: z.coerce.number().int().positive("Mijoz tanlanishi shart"),
  paymentType: z.enum(["cash", "debt", "mixed"]).optional(),
  items: z.array(SaleItemSchema).min(1, "Kamida bitta mahsulot tanlash kerak"),
  notes: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
export type SaleItemInput = z.infer<typeof SaleItemSchema>;
