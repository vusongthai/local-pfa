import type { AccountBase, RemovedTransaction, Transaction } from "plaid";
import { logAuditEvent } from "../audit";
import { decryptSecret } from "../crypto";
import { createAdminSupabase } from "../supabase/server";
import { toAccountRows } from "./accounts";
import { createPlaidClient } from "./client";
import { toTransactionRows } from "./transactionRows";

const PAGE_SIZE = 500;
const MAX_PAGES_PER_ITEM = 10;

type PlaidItemRow = {
  id: string;
  user_id: string;
  encrypted_access_token: string;
  transactions_cursor: string | null;
};

async function syncPlaidItem(item: PlaidItemRow) {
  const supabase = createAdminSupabase();
  const plaid = createPlaidClient();
  const accessToken = decryptSecret(item.encrypted_access_token);
  let cursor = item.transactions_cursor ?? undefined;
  let hasMore = true;
  let pages = 0;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;
  let latestAccounts: AccountBase[] = [];

  while (hasMore && pages < MAX_PAGES_PER_ITEM) {
    const response = await plaid.transactionsSync({
      access_token: accessToken,
      cursor,
      count: PAGE_SIZE,
      options: {
        include_original_description: true
      }
    });

    const data = response.data;
    latestAccounts = data.accounts;

    if (data.accounts.length > 0) {
      const { error: accountError } = await supabase
        .from("accounts")
        .upsert(
          toAccountRows({
            userId: item.user_id,
            plaidItemRowId: item.id,
            accounts: data.accounts
          }),
          { onConflict: "user_id,plaid_account_id" }
        );

      if (accountError) {
        throw accountError;
      }
    }

    const accountIds = Array.from(
      new Set([...data.added, ...data.modified].map((transaction) => transaction.account_id))
    );
    const accountIdByPlaidAccountId = new Map<string, string>();

    if (accountIds.length > 0) {
      const { data: accountRows, error: accountLookupError } = await supabase
        .from("accounts")
        .select("id,plaid_account_id")
        .eq("user_id", item.user_id)
        .in("plaid_account_id", accountIds);

      if (accountLookupError) {
        throw accountLookupError;
      }

      for (const account of accountRows ?? []) {
        accountIdByPlaidAccountId.set(account.plaid_account_id, account.id);
      }
    }

    const transactionRows = toTransactionRows({
      userId: item.user_id,
      accountIdByPlaidAccountId,
      transactions: [...data.added, ...data.modified]
    });

    if (transactionRows.length > 0) {
      const { error: transactionError } = await supabase
        .from("transactions")
        .upsert(transactionRows, { onConflict: "user_id,plaid_transaction_id" });

      if (transactionError) {
        throw transactionError;
      }
    }

    await deleteRemovedTransactions(item.user_id, data.removed);

    addedCount += data.added.length;
    modifiedCount += data.modified.length;
    removedCount += data.removed.length;
    cursor = data.next_cursor;
    hasMore = data.has_more;
    pages += 1;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("plaid_items")
    .update({
      transactions_cursor: cursor ?? null,
      last_successful_sync_at: now,
      last_failed_sync_at: null,
      error_code: null,
      error_message: null,
      updated_at: now
    })
    .eq("id", item.id)
    .eq("user_id", item.user_id);

  if (updateError) {
    throw updateError;
  }

  return {
    plaid_item_id: item.id,
    added: addedCount,
    modified: modifiedCount,
    removed: removedCount,
    accounts: latestAccounts.length,
    pages
  };
}

async function deleteRemovedTransactions(userId: string, removed: RemovedTransaction[]) {
  if (removed.length === 0) {
    return;
  }

  const supabase = createAdminSupabase();
  const transactionIds = removed.map((transaction) => transaction.transaction_id);
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId)
    .in("plaid_transaction_id", transactionIds);

  if (error) {
    throw error;
  }
}

export async function syncTransactionsForUser(userId: string) {
  const supabase = createAdminSupabase();
  const { data: items, error } = await supabase
    .from("plaid_items")
    .select("id,user_id,encrypted_access_token,transactions_cursor")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  const summaries = [];

  for (const item of (items ?? []) as PlaidItemRow[]) {
    try {
      summaries.push(await syncPlaidItem(item));
    } catch (err) {
      const now = new Date().toISOString();
      const message = err instanceof Error ? err.message : "Unknown sync error";

      await supabase
        .from("plaid_items")
        .update({
          last_failed_sync_at: now,
          error_code: "TRANSACTIONS_SYNC_FAILED",
          error_message: message,
          updated_at: now
        })
        .eq("id", item.id)
        .eq("user_id", userId);

      await logAuditEvent({
        userId,
        action: "plaid.sync_transactions_failed",
        source: "api",
        metadata: {
          plaid_item_id: item.id,
          error: message
        }
      });

      throw err;
    }
  }

  await logAuditEvent({
    userId,
    action: "plaid.sync_transactions",
    source: "api",
    metadata: {
      items: summaries.length,
      added: summaries.reduce((total, item) => total + item.added, 0),
      modified: summaries.reduce((total, item) => total + item.modified, 0),
      removed: summaries.reduce((total, item) => total + item.removed, 0)
    }
  });

  return {
    items: summaries.length,
    added: summaries.reduce((total, item) => total + item.added, 0),
    modified: summaries.reduce((total, item) => total + item.modified, 0),
    removed: summaries.reduce((total, item) => total + item.removed, 0),
    summaries
  };
}
