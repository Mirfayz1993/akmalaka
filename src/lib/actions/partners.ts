"use server";
import { db } from "@/db";
import { partners } from "@/db/schema";

export type Partner = typeof partners.$inferSelect;

export async function getPartners() {
  return await db.query.partners.findMany({
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}
