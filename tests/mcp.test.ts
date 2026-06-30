import { describe, expect, it } from "vitest";
import { mcpToolSchemas } from "../lib/mcp/tools";

describe("MCP tool schemas", () => {
  it("rejects transaction ranges longer than 12 months", () => {
    expect(() =>
      mcpToolSchemas.get_transactions.parse({
        start_date: "2025-01-01",
        end_date: "2026-06-30"
      })
    ).toThrow();
  });

  it("validates alert dismissal input", () => {
    expect(() => mcpToolSchemas.dismiss_alert.parse({ alert_id: "not-a-uuid" })).toThrow();
  });
});
