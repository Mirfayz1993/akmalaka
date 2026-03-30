CREATE TYPE "public"."cash_currency" AS ENUM('usd', 'rub');--> statement-breakpoint
CREATE TYPE "public"."code_status" AS ENUM('available', 'used', 'sold');--> statement-breakpoint
CREATE TYPE "public"."code_type" AS ENUM('kz', 'uz', 'afgon');--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('income', 'expense', 'exchange', 'debt_give', 'debt_take');--> statement-breakpoint
CREATE TYPE "public"."partner_type" AS ENUM('russia_supplier', 'code_supplier', 'code_buyer', 'wood_buyer', 'service_provider', 'truck_owner', 'personal', 'exchanger', 'partner');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('cash', 'debt', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('sent', 'received');--> statement-breakpoint
CREATE TYPE "public"."transport_status" AS ENUM('in_transit', 'at_border', 'arrived', 'unloaded', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transport_type" AS ENUM('wagon', 'truck');--> statement-breakpoint
CREATE TABLE "cash_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"currency" "cash_currency" NOT NULL,
	"type" "operation_type" NOT NULL,
	"amount" numeric NOT NULL,
	"exchange_rate" numeric,
	"partner_id" integer,
	"transport_id" integer,
	"description" text,
	"notes" text,
	"doc_number" varchar(4),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "code_type" NOT NULL,
	"supplier_id" integer NOT NULL,
	"status" "code_status" DEFAULT 'available' NOT NULL,
	"buy_cost_usd" numeric,
	"sell_price_usd" numeric,
	"buy_price_per_ton" numeric,
	"sell_price_per_ton" numeric,
	"tonnage" numeric,
	"used_in_transport_id" integer,
	"sold_to_partner_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "partner_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'usd',
	"description" text,
	"notes" text,
	"doc_number" varchar(4),
	"transport_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "partner_type" NOT NULL,
	"phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"timber_id" integer,
	"warehouse_id" integer,
	"transport_id" integer,
	"thickness_mm" integer,
	"width_mm" integer,
	"length_m" numeric,
	"sent_count" integer,
	"received_count" integer,
	"price_per_cubic_usd" numeric,
	"total_usd" numeric,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"status" "sale_status" DEFAULT 'sent' NOT NULL,
	"payment_type" "payment_type",
	"total_sent_usd" numeric DEFAULT '0',
	"total_received_usd" numeric DEFAULT '0',
	"paid_amount" numeric DEFAULT '0',
	"doc_number" varchar(4),
	"notes" text,
	"sent_at" timestamp,
	"received_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "timbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"transport_id" integer NOT NULL,
	"thickness_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"length_m" numeric NOT NULL,
	"russia_count" integer DEFAULT 0 NOT NULL,
	"tashkent_count" integer DEFAULT 0,
	"customer_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transport_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"transport_id" integer NOT NULL,
	"name" text NOT NULL,
	"amount" numeric NOT NULL,
	"partner_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transport_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"transport_id" integer NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transports" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "transport_type" NOT NULL,
	"number" text,
	"from_location" text,
	"to_location" text,
	"sent_at" date,
	"arrived_at" date,
	"closed_at" date,
	"tonnage" numeric,
	"status" "transport_status" DEFAULT 'in_transit' NOT NULL,
	"supplier_id" integer,
	"code_uz_supplier_id" integer,
	"code_uz_price_per_ton" numeric,
	"code_kz_supplier_id" integer,
	"code_kz_price_per_ton" numeric,
	"truck_owner_id" integer,
	"truck_owner_payment" numeric,
	"rub_price_per_cubic" numeric,
	"rub_exchange_rate" numeric,
	"expense_nds" numeric DEFAULT '0',
	"expense_usluga" numeric DEFAULT '0',
	"expense_tupik" numeric DEFAULT '0',
	"expense_xrannei" numeric DEFAULT '0',
	"expense_ortish" numeric DEFAULT '0',
	"expense_tushurish" numeric DEFAULT '0',
	"expense_nds_partner_id" integer,
	"expense_usluga_partner_id" integer,
	"expense_tupik_partner_id" integer,
	"expense_xrannei_partner_id" integer,
	"expense_ortish_partner_id" integer,
	"expense_tushurish_partner_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" serial PRIMARY KEY NOT NULL,
	"timber_id" integer,
	"transport_id" integer,
	"thickness_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"length_m" numeric NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_operations" ADD CONSTRAINT "cash_operations_transport_id_transports_id_fk" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_supplier_id_partners_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_used_in_transport_id_transports_id_fk" FOREIGN KEY ("used_in_transport_id") REFERENCES "public"."transports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_sold_to_partner_id_partners_id_fk" FOREIGN KEY ("sold_to_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_balances" ADD CONSTRAINT "partner_balances_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_balances" ADD CONSTRAINT "partner_balances_transport_id_transports_id_fk" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_timber_id_timbers_id_fk" FOREIGN KEY ("timber_id") REFERENCES "public"."timbers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_transport_id_transports_id_fk" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_partners_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timbers" ADD CONSTRAINT "timbers_transport_id_transports_id_fk" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_expenses" ADD CONSTRAINT "transport_expenses_transport_id_transports_id_fk" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_expenses" ADD CONSTRAINT "transport_expenses_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_transport_id_transports_id_fk" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_supplier_id_partners_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_code_uz_supplier_id_partners_id_fk" FOREIGN KEY ("code_uz_supplier_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_code_kz_supplier_id_partners_id_fk" FOREIGN KEY ("code_kz_supplier_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_truck_owner_id_partners_id_fk" FOREIGN KEY ("truck_owner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_expense_nds_partner_id_partners_id_fk" FOREIGN KEY ("expense_nds_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_expense_usluga_partner_id_partners_id_fk" FOREIGN KEY ("expense_usluga_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_expense_tupik_partner_id_partners_id_fk" FOREIGN KEY ("expense_tupik_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_expense_xrannei_partner_id_partners_id_fk" FOREIGN KEY ("expense_xrannei_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_expense_ortish_partner_id_partners_id_fk" FOREIGN KEY ("expense_ortish_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transports" ADD CONSTRAINT "transports_expense_tushurish_partner_id_partners_id_fk" FOREIGN KEY ("expense_tushurish_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_timber_id_timbers_id_fk" FOREIGN KEY ("timber_id") REFERENCES "public"."timbers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_transport_id_transports_id_fk" FOREIGN KEY ("transport_id") REFERENCES "public"."transports"("id") ON DELETE no action ON UPDATE no action;