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

## ChatGPT Connector

ChatGPT uses the MCP protocol endpoint:

```text
POST /mcp
```

For Vercel, set these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `MCP_API_KEY`
- `MCP_USER_ID`

`MCP_USER_ID` is the Supabase user id shown in the app's MCP Access panel.

Use this connector URL in ChatGPT developer mode:

```text
https://<your-vercel-domain>/mcp?key=<MCP_API_KEY>
```

The query-string key is a pragmatic personal connector guard. For broader sharing, replace it with OAuth before exposing this server to anyone else.
