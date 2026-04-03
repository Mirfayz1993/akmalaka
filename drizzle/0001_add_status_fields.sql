-- Migration: Add unloadedAt to transports and supplierCount to timbers

ALTER TABLE "transports" ADD COLUMN IF NOT EXISTS "unloaded_at" date;

ALTER TABLE "timbers" ADD COLUMN IF NOT EXISTS "supplier_count" integer DEFAULT 0;
