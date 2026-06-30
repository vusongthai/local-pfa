import { describe, expect, it } from "vitest";
import { dateRangeSchema, transactionsQuerySchema } from "../lib/finance/analysis";

describe("finance analysis validation", () => {
  it("rejects ranges longer than 12 months", () => {
    expect(() =>
      dateRangeSchema.parse({
        start_date: "2025-01-01",
        end_date: "2026-06-30"
      })
    ).toThrow();
  });

  it("parses transaction query options", () => {
    const query = transactionsQuerySchema.parse({
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      include_pending: "true"
    });

    expect(query.include_pending).toBe(true);
  });
});
