import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { getAccountsForUser } from "@/lib/finance/accounts";

export const mcpToolSchemas = {
  get_accounts: z.object({})
};

export type McpToolName = keyof typeof mcpToolSchemas;

export async function callMcpTool(params: {
  userId: string;
  name: string;
  arguments: unknown;
}) {
  if (params.name !== "get_accounts") {
    return {
      error: {
        code: "unsupported_tool",
        message: "This MCP server only supports read-only finance tools."
      }
    };
  }

  mcpToolSchemas.get_accounts.parse(params.arguments ?? {});

  const accounts = await getAccountsForUser(params.userId);

  await logAuditEvent({
    userId: params.userId,
    action: "mcp.get_accounts",
    source: "mcp",
    metadata: { result_count: accounts.length }
  });

  return { accounts };
}
