# MCP Usage

The local MCP endpoint is available at:

```text
POST /api/mcp
```

Send the key from `MCP_API_KEY` as a bearer token. Do not commit this key.

```http
Authorization: Bearer <MCP_API_KEY>
Content-Type: application/json
```

Example request:

```json
{
  "user_id": "<supabase-user-id>",
  "tool": "get_spend_summary",
  "arguments": {
    "start_date": "2026-04-01",
    "end_date": "2026-06-30",
    "group_by": "category"
  }
}
```

Available tools:

- `get_accounts`
- `get_transactions`
- `get_spend_summary`
- `get_cash_flow`
- `get_recurring_charges`
- `get_unusual_spend`
- `list_alert_rules`
- `create_alert_rule`
- `list_alerts`
- `dismiss_alert`

All finance data comes from Supabase. MCP tools do not call Plaid directly and do not expose Plaid access tokens.
