import { describe, expect, it } from "vitest";
import { handleMcpJsonRpc } from "../lib/mcp/protocol";
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

  it("handles MCP initialize", async () => {
    const response = await handleMcpJsonRpc({
      userId: "00000000-0000-0000-0000-000000000000",
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {}
      }
    });

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        serverInfo: {
          name: "local-pfa"
        }
      }
    });
  });

  it("lists MCP tools", async () => {
    const response = await handleMcpJsonRpc({
      userId: "00000000-0000-0000-0000-000000000000",
      body: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {}
      }
    });

    expect(response).toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "get_spend_summary" }),
          expect.objectContaining({ name: "get_cash_flow" })
        ])
      }
    });
  });
});
