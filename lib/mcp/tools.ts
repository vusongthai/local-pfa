import { z } from "zod";
import { dismissAlert, createAlertRule, listAlertRules, listAlerts } from "../alerts/service";
import {
  alertStatusQuerySchema,
  createAlertRuleSchema
} from "../alerts/rules";
import { logAuditEvent } from "../audit";
import {
  dateRangeSchema,
  getCashFlowForUser,
  getRecurringChargesForUser,
  getSpendSummaryForUser,
  getTransactionsForUser,
  getUnusualSpendForUser,
  lookbackQuerySchema,
  spendSummaryQuerySchema,
  transactionsQuerySchema,
  unusualSpendQuerySchema
} from "../finance/analysis";
import { getAccountsForUser } from "../finance/accounts";

export const mcpToolSchemas = {
  get_accounts: z.object({}),
  get_transactions: transactionsQuerySchema,
  get_spend_summary: spendSummaryQuerySchema,
  get_cash_flow: dateRangeSchema,
  get_recurring_charges: lookbackQuerySchema,
  get_unusual_spend: unusualSpendQuerySchema,
  list_alert_rules: z.object({}),
  create_alert_rule: createAlertRuleSchema,
  list_alerts: alertStatusQuerySchema,
  dismiss_alert: z.object({
    alert_id: z.string().uuid()
  })
};

export type McpToolName = keyof typeof mcpToolSchemas;

export async function callMcpTool(params: {
  userId: string;
  name: string;
  arguments: unknown;
}) {
  if (!(params.name in mcpToolSchemas)) {
    return {
      error: {
        code: "unsupported_tool",
        message: "This MCP server only supports read-only finance tools."
      }
    };
  }

  const name = params.name as McpToolName;
  const input = mcpToolSchemas[name].parse(params.arguments ?? {});
  const result = await runTool(params.userId, name, input);

  await logAuditEvent({
    userId: params.userId,
    action: `mcp.${name}`,
    source: "mcp",
    metadata: {
      tool: name
    }
  });

  return result;
}

async function runTool(userId: string, name: McpToolName, input: z.infer<(typeof mcpToolSchemas)[McpToolName]>) {
  if (name === "get_accounts") {
    return { accounts: await getAccountsForUser(userId) };
  }

  if (name === "get_transactions") {
    return getTransactionsForUser(userId, input as z.infer<typeof transactionsQuerySchema>);
  }

  if (name === "get_spend_summary") {
    return getSpendSummaryForUser(userId, input as z.infer<typeof spendSummaryQuerySchema>);
  }

  if (name === "get_cash_flow") {
    return getCashFlowForUser(userId, input as z.infer<typeof dateRangeSchema>);
  }

  if (name === "get_recurring_charges") {
    return getRecurringChargesForUser(userId, input as z.infer<typeof lookbackQuerySchema>);
  }

  if (name === "get_unusual_spend") {
    return getUnusualSpendForUser(userId, input as z.infer<typeof unusualSpendQuerySchema>);
  }

  if (name === "list_alert_rules") {
    return listAlertRules(userId);
  }

  if (name === "create_alert_rule") {
    return createAlertRule(userId, input as z.infer<typeof createAlertRuleSchema>);
  }

  if (name === "list_alerts") {
    return listAlerts(userId, input as z.infer<typeof alertStatusQuerySchema>);
  }

  if (name === "dismiss_alert") {
    const dismissInput = input as { alert_id: string };
    return dismissAlert(userId, dismissInput.alert_id);
  }

  return {
    error: {
      code: "unsupported_tool",
      message: "This MCP server only supports read-only finance tools."
    }
  };
}
