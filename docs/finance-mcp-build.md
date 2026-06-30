# Local PFA Build Notes

Source repository: `https://github.com/vusongthai/local-pfa`

Deployment target: an existing Vercel project.

Database/auth target: an existing Supabase project.

This build must add the read-only finance MCP assistant into the existing repository without creating a new GitHub repo, Vercel project, or Supabase project.

## Secrets

Never commit secrets. Runtime secrets belong in Vercel Environment Variables and local development secrets belong in `.env.local`.

The committed `.env.example` must contain placeholders only for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD`
- `DATABASE_URL`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV`
- `PLAID_WEBHOOK_SECRET`
- `ENCRYPTION_KEY`
- `MCP_API_KEY`
- `OPENAI_API_KEY`
- `APP_BASE_URL`

## Build Scope

Add or update:

- `.gitignore`
- `.env.example`
- Supabase SQL migrations
- RLS policies
- read-only finance table definitions and indexes
- Vercel-compatible API routes
- Plaid sandbox Link integration
- encrypted Plaid access token storage
- future MCP structure that calls app finance services, not Plaid directly

## Hard Restrictions

- Do not commit Supabase DB password.
- Do not commit Supabase service role key.
- Do not commit Plaid secret.
- Do not commit OpenAI key.
- Do not store Plaid access tokens in plaintext.
- Do not implement payments, transfers, ACH, trading, or bank-write actions.
