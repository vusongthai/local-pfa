import { describe, expect, it, vi } from "vitest";
import { toAccountRows } from "../lib/plaid/accounts";

describe("Plaid exchange persistence contract", () => {
  it("uses user-scoped conflict keys for Plaid items", async () => {
    const upsert = vi.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "stored-item-id" }, error: null })
      })
    });

    const from = vi.fn((_: string) => ({ upsert }));
    const supabase = { from };

    const itemRow = {
      user_id: "user-1",
      plaid_item_id: "item-1",
      encrypted_access_token: "v1.encrypted",
      status: "active"
    };

    await supabase
      .from("plaid_items")
      .upsert(itemRow, { onConflict: "user_id,plaid_item_id" })
      .select("id")
      .single();

    const accountRows = toAccountRows({
      userId: "user-1",
      plaidItemRowId: "stored-item-id",
      accounts: []
    });

    expect(supabase.from).toHaveBeenCalledWith("plaid_items");
    expect(upsert).toHaveBeenCalledWith(itemRow, { onConflict: "user_id,plaid_item_id" });
    expect(accountRows).toEqual([]);
  });
});
