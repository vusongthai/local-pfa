import type { SimpleFinAccount, SimpleFinTransaction } from "./client";

function numberOrNull(value: string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateFromTimestamp(timestamp: number | undefined) {
  if (!timestamp) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function accountId(account: SimpleFinAccount) {
  return `simplefin:${account.id}`;
}

export function toSimpleFinAccountRows(params: {
  userId: string;
  itemRowId: string;
  accounts: SimpleFinAccount[];
}) {
  const now = new Date().toISOString();

  return params.accounts.map((account) => ({
    user_id: params.userId,
    plaid_item_id: params.itemRowId,
    plaid_account_id: accountId(account),
    name: account.name ?? "SimpleFIN Account",
    official_name: account.org?.name ?? account.name ?? null,
    type: "depository",
    subtype: null,
    mask: null,
    current_balance: numberOrNull(account.balance),
    available_balance: numberOrNull(account["available-balance"]),
    iso_currency_code: account.currency ?? null,
    is_active: true,
    last_balance_sync_at: now,
    updated_at: now
  }));
}

export function simpleFinTransactionId(account: SimpleFinAccount, transaction: SimpleFinTransaction) {
  return `simplefin:${account.id}:${transaction.id}`;
}

export function toSimpleFinTransactionRows(params: {
  userId: string;
  accountIdBySimpleFinAccountId: Map<string, string>;
  accounts: SimpleFinAccount[];
}) {
  const now = new Date().toISOString();

  return params.accounts.flatMap((account) => {
    const accountRowId = params.accountIdBySimpleFinAccountId.get(accountId(account));
    if (!accountRowId) {
      return [];
    }

    return (account.transactions ?? []).map((transaction) => {
      const signedAmount = Number(transaction.amount);
      const merchant = transaction.payee ?? transaction.description ?? "Unknown";

      return {
        user_id: params.userId,
        account_id: accountRowId,
        plaid_transaction_id: simpleFinTransactionId(account, transaction),
        plaid_account_id: accountId(account),
        date: dateFromTimestamp(transaction.posted ?? transaction.transacted_at),
        authorized_date: transaction.transacted_at ? dateFromTimestamp(transaction.transacted_at) : null,
        name: transaction.description ?? merchant,
        merchant_name: merchant,
        amount: Number.isFinite(signedAmount) ? -signedAmount : 0,
        category_primary: "Uncategorized",
        category_detailed: null,
        pending: Boolean(transaction.pending),
        payment_channel: "other",
        iso_currency_code: account.currency ?? null,
        raw_json: {
          provider: "simplefin",
          account,
          transaction
        },
        updated_at: now
      };
    });
  });
}
