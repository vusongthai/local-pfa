import type { Transaction } from "plaid";

export function toTransactionRows(params: {
  userId: string;
  accountIdByPlaidAccountId: Map<string, string>;
  transactions: Transaction[];
}) {
  const now = new Date().toISOString();

  return params.transactions.flatMap((transaction) => {
    const accountId = params.accountIdByPlaidAccountId.get(transaction.account_id);
    if (!accountId) {
      return [];
    }

    return [
      {
        user_id: params.userId,
        account_id: accountId,
        plaid_transaction_id: transaction.transaction_id,
        plaid_account_id: transaction.account_id,
        date: transaction.date,
        authorized_date: transaction.authorized_date,
        name: transaction.name,
        merchant_name: transaction.merchant_name,
        amount: transaction.amount,
        category_primary: transaction.personal_finance_category?.primary ?? null,
        category_detailed: transaction.personal_finance_category?.detailed ?? null,
        pending: transaction.pending,
        payment_channel: transaction.payment_channel,
        iso_currency_code: transaction.iso_currency_code,
        raw_json: transaction,
        updated_at: now
      }
    ];
  });
}
