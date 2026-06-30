import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0001_finance_foundation.sql", "utf8");

describe("finance foundation migration", () => {
  it("enables RLS for every user-owned table", () => {
    for (const table of [
      "profiles",
      "plaid_items",
      "accounts",
      "transactions",
      "recurring_transactions",
      "alert_rules",
      "alerts",
      "audit_logs"
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("enforces user ownership policies", () => {
    expect(migration).toContain("using (id = auth.uid())");
    expect(migration).toContain("using (user_id = auth.uid())");
    expect(migration).toContain("with check (user_id = auth.uid())");
  });
});
