# Vercel + ChatGPT MCP Setup

## Deploy

1. Push the repo to GitHub.
2. In Vercel, import the existing GitHub repo.
3. Add environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_KEY
MCP_API_KEY
MCP_USER_ID
APP_BASE_URL
```

Set `APP_BASE_URL` to the Vercel app URL.

Set `MCP_USER_ID` to the Supabase user id shown in the app's MCP Access panel.

Plaid variables are only needed for Plaid sandbox. SimpleFIN uses encrypted access URLs stored in Supabase.

## Connect In ChatGPT

1. Open ChatGPT settings.
2. Open Apps & Connectors / Connectors.
3. Enable developer mode if needed.
4. Create a connector.
5. Use this MCP server URL:

```text
https://<your-vercel-domain>/mcp?key=<MCP_API_KEY>
```

## Smoke Test

Ask ChatGPT:

```text
Using my Finance MCP connector, summarize my cash flow for the last 45 days.
```

The connector should call `get_cash_flow` or `get_spend_summary`.

Do not share the connector URL. It contains the MCP key.
