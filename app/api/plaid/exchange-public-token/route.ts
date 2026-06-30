import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto";
import { jsonError, validationError } from "@/lib/http";
import { toAccountRows } from "@/lib/plaid/accounts";
import { createPlaidClient } from "@/lib/plaid/client";
import { createAdminSupabase, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  public_token: z.string().min(1)
});

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (err) {
    return validationError(err);
  }

  const plaid = createPlaidClient();
  const supabase = createAdminSupabase();

  try {
    const exchange = await plaid.itemPublicTokenExchange({ public_token: body.public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const [itemResponse, accountsResponse] = await Promise.all([
      plaid.itemGet({ access_token: accessToken }),
      plaid.accountsGet({ access_token: accessToken })
    ]);

    const institutionId = itemResponse.data.item.institution_id ?? null;

    const { data: plaidItem, error: itemError } = await supabase
      .from("plaid_items")
      .upsert(
        {
          user_id: user.id,
          plaid_item_id: itemId,
          encrypted_access_token: encryptSecret(accessToken),
          institution_id: institutionId,
          institution_name: institutionId,
          status: "active",
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id,plaid_item_id" }
      )
      .select("id")
      .single();

    if (itemError || !plaidItem) {
      throw itemError ?? new Error("Plaid item was not saved");
    }

    const accountRows = toAccountRows({
      userId: user.id,
      plaidItemRowId: plaidItem.id,
      accounts: accountsResponse.data.accounts
    });

    if (accountRows.length > 0) {
      const { error: accountsError } = await supabase
        .from("accounts")
        .upsert(accountRows, { onConflict: "user_id,plaid_account_id" });

      if (accountsError) {
        throw accountsError;
      }
    }

    await logAuditEvent({
      userId: user.id,
      action: "plaid.exchange_public_token",
      source: "api",
      metadata: {
        plaid_item_id: itemId,
        accounts_count: accountRows.length
      }
    });

    return NextResponse.json({
      plaid_item_id: plaidItem.id,
      accounts_count: accountRows.length
    });
  } catch (err) {
    await logAuditEvent({
      userId: user.id,
      action: "plaid.exchange_public_token_failed",
      source: "api",
      metadata: { error: err instanceof Error ? err.message : "Unknown error" }
    });

    return jsonError("Could not connect Plaid item", 502);
  }
}
