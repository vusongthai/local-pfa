# SimpleFIN Connector

SimpleFIN is the preferred real-bank connector for this local personal finance build.

## Flow

1. Connect the bank in SimpleFIN Bridge.
2. Copy the one-time setup token.
3. Paste the setup token into the app's SimpleFIN panel.
4. The app claims the token, receives a SimpleFIN access URL, encrypts it, and stores it server-side.
5. Syncs fetch accounts and transactions from SimpleFIN into the existing finance tables.

The setup token and access URL must not be committed. The app stores the access URL with the same encryption helper used for Plaid access tokens.

## Reporting

SimpleFIN transaction amounts are normalized to match the app's existing Plaid-style reporting convention:

- Expenses are stored as positive amounts.
- Income is stored as negative amounts.

That lets the existing dashboard, alert rules, and MCP tools work without separate provider-specific logic.
