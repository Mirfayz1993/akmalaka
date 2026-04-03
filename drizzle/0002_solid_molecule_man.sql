CREATE TABLE "cash_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"cash_operation_id" integer,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "code_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_id" integer,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sale_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "timbers" ADD COLUMN IF NOT EXISTS "supplier_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "transports" ADD COLUMN IF NOT EXISTS "unloaded_at" date;--> statement-breakpoint
ALTER TABLE "cash_logs" ADD CONSTRAINT "cash_logs_cash_operation_id_cash_operations_id_fk" FOREIGN KEY ("cash_operation_id") REFERENCES "public"."cash_operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_logs" ADD CONSTRAINT "code_logs_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_logs" ADD CONSTRAINT "sale_logs_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;