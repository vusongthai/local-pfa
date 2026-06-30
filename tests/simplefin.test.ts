import { describe, expect, it } from "vitest";
import { decodeSetupToken } from "../lib/simplefin/client";
import { toSimpleFinTransactionRows } from "../lib/simplefin/rows";

describe("SimpleFIN support", () => {
  it("decodes base64 setup tokens", () => {
    const setupUrl = "https://bridge.simplefin.org/simplefin/setup-token";
    const token = Buffer.from(setupUrl, "utf8").toString("base64");

    expect(decodeSetupToken(token)).toBe(setupUrl);
  });

  it("maps SimpleFIN expense signs to existing Plaid-style reporting signs", () => {
    const rows = toSimpleFinTransactionRows({
      userId: "user-1",
      accountIdBySimpleFinAccountId: new Map([["simplefin:account-1", "account-row-1"]]),
      accounts: [
        {
          id: "account-1",
          name: "Checking",
          currency: "USD",
          transactions: [
            {
              id: "transaction-1",
              posted: 1782842400,
              amount: "-12.34",
              description: "Coffee Shop"
            }
          ]
        }
      ]
    });

    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      account_id: "account-row-1",
      plaid_account_id: "simplefin:account-1",
      plaid_transaction_id: "simplefin:account-1:transaction-1",
      merchant_name: "Coffee Shop",
      amount: 12.34
    });
  });
});
