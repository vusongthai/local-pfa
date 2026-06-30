import { describe, expect, it } from "vitest";
import { TransactionPaymentChannelEnum } from "plaid";
import { toTransactionRows } from "../lib/plaid/transactionRows";

describe("transaction persistence mapping", () => {
  it("maps Plaid transactions to user-owned rows", () => {
    const rows = toTransactionRows({
      userId: "user-1",
      accountIdByPlaidAccountId: new Map([["plaid-account-1", "account-row-1"]]),
      transactions: [
        {
          account_id: "plaid-account-1",
          account_owner: null,
          amount: 12.34,
          authorized_date: "2026-06-29",
          authorized_datetime: null,
          category: null,
          category_id: null,
          check_number: null,
          counterparties: [],
          date: "2026-06-30",
          datetime: null,
          iso_currency_code: "USD",
          location: {
            address: null,
            city: null,
            region: null,
            postal_code: null,
            country: null,
            lat: null,
            lon: null,
            store_number: null
          },
          merchant_entity_id: null,
          merchant_name: "Coffee Shop",
          name: "Coffee Shop",
          payment_channel: TransactionPaymentChannelEnum.InStore,
          payment_meta: {
            by_order_of: null,
            payee: null,
            payer: null,
            payment_method: null,
            payment_processor: null,
            ppd_id: null,
            reason: null,
            reference_number: null
          },
          pending: false,
          pending_transaction_id: null,
          personal_finance_category: {
            primary: "FOOD_AND_DRINK",
            detailed: "FOOD_AND_DRINK_COFFEE",
            confidence_level: "VERY_HIGH"
          },
          transaction_code: null,
          transaction_id: "transaction-1",
          unofficial_currency_code: null,
          website: null,
          logo_url: null
        }
      ]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      account_id: "account-row-1",
      plaid_transaction_id: "transaction-1",
      plaid_account_id: "plaid-account-1",
      merchant_name: "Coffee Shop",
      category_primary: "FOOD_AND_DRINK",
      category_detailed: "FOOD_AND_DRINK_COFFEE",
      amount: 12.34,
      pending: false
    });
  });
});
