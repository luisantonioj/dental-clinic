import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";

describe("database", () => {
  it("has pg_trgm enabled", async () => {
    const rows = await db.execute<{ sim: number }>(sql`select similarity('tumambing', 'tumambeng') as sim`);
    const sim = Number((rows as unknown as { rows: { sim: number }[] }).rows[0].sim);
    expect(sim).toBeGreaterThan(0.3);
  });
});
