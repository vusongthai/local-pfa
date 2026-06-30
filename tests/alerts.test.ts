import { describe, expect, it } from "vitest";
import { alertEngineTestExports } from "../lib/alerts/engine";

const rule = {
  id: "rule-1",
  user_id: "user-1",
  type: "large_transaction",
  name: "Large transaction",
  config: { threshold: 250 },
  enabled: true
};

describe("alert engine", () => {
  it("generates large transaction alerts above threshold", () => {
    const alerts = alertEngineTestExports.largeTransactionAlerts(rule, [
      {
        id: "tx-1",
        date: "2026-06-30",
        name: "Bike shop",
        merchant_name: "Madison Bicycle Shop",
        amount: 500,
        category_primary: "GENERAL_MERCHANDISE",
        pending: false
      }
    ]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      title: "Large transaction",
      related_transaction_id: "tx-1"
    });
  });
});
