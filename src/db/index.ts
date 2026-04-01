import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(process.env.DATABASE_URL, {
  max: 10,              // Cluster mode'da instance boshiga 10 (2×10=20 jami)
  idle_timeout: 30,     // 30s bo'sh tursa yopiladi
  connect_timeout: 10,  // 10s ulanish vaqti
  connection: {
    statement_timeout: 10_000, // 10s query limit
  },
  onnotice: () => {},   // PostgreSQL NOTICE loglarini jimga solish
});

export const db = drizzle(client, { schema });
