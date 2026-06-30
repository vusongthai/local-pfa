import type { AccountBase } from "plaid";

export type PersistablePlaidAccount = Pick<
  AccountBase,
  "account_id" | "name" | "official_name" | "type" | "subtype" | "mask" | "balances"
>;

export function toAccountRows(params: {
  userId: string;
  plaidItemRowId: string;
  accounts: PersistablePlaidAccount[];
}) {
  const now = new Date().toISOString();

  return params.accounts.map((account) => ({
    user_id: params.userId,
    plaid_item_id: params.plaidItemRowId,
    plaid_account_id: account.account_id,
    name: account.name,
    official_name: account.official_name,
    type: account.type,
    subtype: account.subtype,
    mask: account.mask,
    current_balance: account.balances.current,
    available_balance: account.balances.available,
    iso_currency_code: account.balances.iso_currency_code,
    is_active: true,
    last_balance_sync_at: now,
    updated_at: now
  }));
}
