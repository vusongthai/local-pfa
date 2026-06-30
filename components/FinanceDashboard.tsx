"use client";

import { useState } from "react";

type SpendGroup = {
  label: string;
  amount: number;
  count: number;
};

type CashFlow = {
  inflows: number;
  outflows: number;
  net_cash_flow: number;
  projected_remaining_cash_flow: number;
};

type RecurringCharge = {
  merchant_name: string;
  amount: number;
  frequency: string;
  next_expected_date: string;
};

type UnusualTransaction = {
  id: string;
  date: string;
  merchant_name: string;
  category: string;
  amount: number;
  ratio: number;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 90);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Could not load finance data");
  }

  return body as T;
}

export default function FinanceDashboard() {
  const [status, setStatus] = useState("Run analysis after syncing transactions.");
  const [loading, setLoading] = useState(false);
  const [spendGroups, setSpendGroups] = useState<SpendGroup[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [recurring, setRecurring] = useState<RecurringCharge[]>([]);
  const [unusual, setUnusual] = useState<UnusualTransaction[]>([]);

  async function refresh() {
    const range = defaultRange();
    const query = `start_date=${range.start}&end_date=${range.end}`;
    setLoading(true);
    setStatus("Loading analysis...");

    try {
      const [spend, flow, recurringData, unusualData] = await Promise.all([
        getJson<{ groups: SpendGroup[] }>(`/api/finance/spend-summary?${query}&group_by=category`),
        getJson<CashFlow>(`/api/finance/cash-flow?${query}`),
        getJson<{ recurring_charges: RecurringCharge[] }>("/api/finance/recurring?lookback_days=90"),
        getJson<{ unusual_transactions: UnusualTransaction[] }>(
          "/api/finance/unusual-spend?lookback_days=90&sensitivity=medium"
        )
      ]);

      setSpendGroups(spend.groups.slice(0, 6));
      setCashFlow(flow);
      setRecurring(recurringData.recurring_charges.slice(0, 5));
      setUnusual(unusualData.unusual_transactions.slice(0, 5));
      setStatus(`Based on synced data from ${range.start} to ${range.end}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load analysis.");
    }

    setLoading(false);
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Finance Analysis</h2>
          <p className="status">{status}</p>
        </div>
        <button type="button" className="secondary-button" onClick={refresh} disabled={loading}>
          Refresh analysis
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric">
          <span>Inflows</span>
          <strong>{cashFlow ? currency(cashFlow.inflows) : "--"}</strong>
        </div>
        <div className="metric">
          <span>Outflows</span>
          <strong>{cashFlow ? currency(cashFlow.outflows) : "--"}</strong>
        </div>
        <div className="metric">
          <span>Net</span>
          <strong>{cashFlow ? currency(cashFlow.net_cash_flow) : "--"}</strong>
        </div>
      </div>

      <div className="analysis-grid">
        <div>
          <h3>Top Categories</h3>
          <ul className="data-list">
            {spendGroups.map((group) => (
              <li key={group.label}>
                <span>{group.label}</span>
                <strong>{currency(group.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Recurring Charges</h3>
          <ul className="data-list">
            {recurring.map((charge) => (
              <li key={`${charge.merchant_name}-${charge.next_expected_date}`}>
                <span>{charge.merchant_name}</span>
                <strong>{currency(charge.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Unusual Spend</h3>
          <ul className="data-list">
            {unusual.map((transaction) => (
              <li key={transaction.id}>
                <span>{transaction.merchant_name}</span>
                <strong>{currency(transaction.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
