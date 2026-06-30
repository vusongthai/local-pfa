import { describe, expect, it } from "vitest";
import { AccountSubtype, AccountType } from "plaid";
import { toAccountRows } from "../lib/plaid/accounts";

describe("account persistence mapping", () => {
  it("keeps user ownership and stores only masked account identifiers", () => {
    const rows = toAccountRows({
      userId: "user-1",
      plaidItemRowId: "item-row-1",
      accounts: [
        {
          account_id: "plaid-account-1",
          name: "Chase Checking",
          official_name: "Chase Total Checking",
          type: AccountType.Depository,
          subtype: AccountSubtype.Checking,
          mask: "1234",
          balances: {
            available: 100,
            current: 125,
            iso_currency_code: "USD",
            unofficial_currency_code: null,
            limit: null
          }
        }
      ]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      plaid_item_id: "item-row-1",
      plaid_account_id: "plaid-account-1",
      mask: "1234",
      current_balance: 125,
      available_balance: 100,
      iso_currency_code: "USD"
    });
    expect(JSON.stringify(rows[0])).not.toContain("access_token");
  });
});
