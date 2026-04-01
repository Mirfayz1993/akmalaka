import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const startTime = Date.now();

export async function GET() {
  try {
    // DB connection tekshirish
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: "ok",
      db: "connected",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
