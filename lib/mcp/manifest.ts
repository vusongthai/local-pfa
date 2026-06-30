export const mcpToolDefinitions = [
  {
    name: "get_accounts",
    description: "List connected financial accounts with balances and account metadata.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "get_transactions",
    description: "List transactions for a date range, optionally filtered by account, merchant, or category.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date in YYYY-MM-DD format." },
        end_date: { type: "string", description: "End date in YYYY-MM-DD format." },
        account_id: { type: "string", description: "Optional account UUID." },
        merchant: { type: "string", description: "Optional merchant name filter." },
        category: { type: "string", description: "Optional category filter." },
        include_pending: { type: "string", enum: ["true", "false"], description: "Whether to include pending transactions." }
      },
      required: ["start_date", "end_date"],
      additionalProperties: false
    }
  },
  {
    name: "get_spend_summary",
    description: "Summarize spending for a date range by category, merchant, account, or month.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date in YYYY-MM-DD format." },
        end_date: { type: "string", description: "End date in YYYY-MM-DD format." },
        group_by: { type: "string", enum: ["category", "merchant", "account", "month"] }
      },
      required: ["start_date", "end_date"],
      additionalProperties: false
    }
  },
  {
    name: "get_cash_flow",
    description: "Calculate inflows, outflows, net cash flow, and recurring charge projection for a date range.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date in YYYY-MM-DD format." },
        end_date: { type: "string", description: "End date in YYYY-MM-DD format." }
      },
      required: ["start_date", "end_date"],
      additionalProperties: false
    }
  },
  {
    name: "get_recurring_charges",
    description: "Detect likely recurring charges over a lookback window.",
    inputSchema: {
      type: "object",
      properties: {
        lookback_days: { type: "number", minimum: 30, maximum: 365, default: 90 }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_unusual_spend",
    description: "Find unusually large transactions compared with category baselines.",
    inputSchema: {
      type: "object",
      properties: {
        lookback_days: { type: "number", minimum: 30, maximum: 365, default: 90 },
        sensitivity: { type: "string", enum: ["low", "medium", "high"], default: "medium" }
      },
      additionalProperties: false
    }
  },
  {
    name: "list_alert_rules",
    description: "List finance alert rules.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "create_alert_rule",
    description: "Create a finance alert rule for recurring bills, unusual spend, duplicate charges, or cash-flow thresholds.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["large_transaction", "duplicate_charge", "recurring_bill", "cash_flow"] },
        name: { type: "string" },
        config: { type: "object", additionalProperties: true },
        enabled: { type: "boolean" }
      },
      required: ["type", "name", "config"],
      additionalProperties: false
    }
  },
  {
    name: "list_alerts",
    description: "List generated finance alerts by status.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "dismissed", "all"], default: "new" }
      },
      additionalProperties: false
    }
  },
  {
    name: "dismiss_alert",
    description: "Dismiss a finance alert by id.",
    inputSchema: {
      type: "object",
      properties: {
        alert_id: { type: "string", description: "Alert UUID." }
      },
      required: ["alert_id"],
      additionalProperties: false
    }
  }
] as const;
