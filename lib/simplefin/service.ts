import { logAuditEvent } from "../audit";
import { decryptSecret, encryptSecret } from "../crypto";
import { createAdminSupabase } from "../supabase/server";
import {
  claimSimpleFinSetupToken,
  fetchSimpleFinAccounts,
  simpleFinConnectionId,
  type SimpleFinAccount
} from "./client";
import { toSimpleFinAccountRows, toSimpleFinTransactionRows } from "./rows";

const SIMPLEFIN_INSTITUTION_ID = "simplefin";

type SimpleFinItemRow = {
  id: string;
  user_id: string;
  encrypted_access_token: string;
};

async function saveSimpleFinConnection(params: {
  userId: string;
  accessUrl: string;
  accounts?: SimpleFinAccount[];
}) {
  const supabase = createAdminSupabase();
  const connectionId = simpleFinConnectionId(params.accessUrl);
  const institutionNames = Array.from(
    new Set((params.accounts ?? []).map((account) => account.org?.name).filter(Boolean))
  );

  const { data, error } = await supabase
    .from("plaid_items")
    .upsert(
      {
        user_id: params.userId,
        plaid_item_id: connectionId,
        encrypted_access_token: encryptSecret(params.accessUrl),
        institution_name: institutionNames.join(", ") || "SimpleFIN",
        institution_id: SIMPLEFIN_INSTITUTION_ID,
        status: "active",
        last_successful_sync_at: new Date().toISOString()
      },
      { onConflict: "user_id,plaid_item_id" }
    )
    .select("id,user_id,encrypted_access_token")
    .single();

  if (error) {
    throw error;
  }

  return data as SimpleFinItemRow;
}

async function persistSimpleFinAccountsAndTransactions(params: {
  item: SimpleFinItemRow;
  accounts: SimpleFinAccount[];
}) {
  const supabase = createAdminSupabase();
  const accountRows = toSimpleFinAccountRows({
    userId: params.item.user_id,
    itemRowId: params.item.id,
    accounts: params.accounts
  });

  if (accountRows.length > 0) {
    const { error } = await supabase.from("accounts").upsert(accountRows, { onConflict: "user_id,plaid_account_id" });
    if (error) {
      throw error;
    }
  }

  const simpleFinAccountIds = accountRows.map((account) => account.plaid_account_id);
  const accountIdBySimpleFinAccountId = new Map<string, string>();

  if (simpleFinAccountIds.length > 0) {
    const { data, error } = await supabase
      .from("accounts")
      .select("id,plaid_account_id")
      .eq("user_id", params.item.user_id)
      .in("plaid_account_id", simpleFinAccountIds);

    if (error) {
      throw error;
    }

    for (const account of data ?? []) {
      accountIdBySimpleFinAccountId.set(account.plaid_account_id, account.id);
    }
  }

  const transactionRows = toSimpleFinTransactionRows({
    userId: params.item.user_id,
    accountIdBySimpleFinAccountId,
    accounts: params.accounts
  });

  if (transactionRows.length > 0) {
    const { error } = await supabase
      .from("transactions")
      .upsert(transactionRows, { onConflict: "user_id,plaid_transaction_id" });

    if (error) {
      throw error;
    }
  }

  return {
    accounts: accountRows.length,
    transactions: transactionRows.length
  };
}

async function syncSimpleFinItem(item: SimpleFinItemRow) {
  const supabase = createAdminSupabase();
  const accessUrl = decryptSecret(item.encrypted_access_token);
  const response = await fetchSimpleFinAccounts(accessUrl);
  const persisted = await persistSimpleFinAccountsAndTransactions({
    item,
    accounts: response.accounts ?? []
  });

  const { error } = await supabase
    .from("plaid_items")
    .update({
      last_successful_sync_at: new Date().toISOString(),
      last_failed_sync_at: null,
      error_code: null,
      error_message: null
    })
    .eq("id", item.id)
    .eq("user_id", item.user_id);

  if (error) {
    throw error;
  }

  return persisted;
}

export async function connectSimpleFinForUser(userId: string, setupToken: string) {
  const accessUrl = await claimSimpleFinSetupToken(setupToken);
  const item = await saveSimpleFinConnection({
    userId,
    accessUrl
  });

  await logAuditEvent({
    userId,
    action: "simplefin.connect",
    source: "api",
    metadata: {
      simplefin_item_id: item.id
    }
  });

  return {
    connected: true,
    accounts: 0,
    transactions: 0
  };
}

export async function syncSimpleFinForUser(userId: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("plaid_items")
    .select("id,user_id,encrypted_access_token")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("institution_id", SIMPLEFIN_INSTITUTION_ID);

  if (error) {
    throw error;
  }

  const summaries = [];

  for (const item of (data ?? []) as SimpleFinItemRow[]) {
    try {
      summaries.push(await syncSimpleFinItem(item));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown SimpleFIN sync error";

      await supabase
        .from("plaid_items")
        .update({
          last_failed_sync_at: new Date().toISOString(),
          error_code: "SIMPLEFIN_SYNC_FAILED",
          error_message: message
        })
        .eq("id", item.id)
        .eq("user_id", userId);

      throw err;
    }
  }

  await logAuditEvent({
    userId,
    action: "simplefin.sync",
    source: "api",
    metadata: {
      items: summaries.length,
      accounts: summaries.reduce((total, item) => total + item.accounts, 0),
      transactions: summaries.reduce((total, item) => total + item.transactions, 0)
    }
  });

  return {
    items: summaries.length,
    accounts: summaries.reduce((total, item) => total + item.accounts, 0),
    transactions: summaries.reduce((total, item) => total + item.transactions, 0),
    summaries
  };
}
