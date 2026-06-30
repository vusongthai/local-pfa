import { createHash } from "crypto";
import { getCashFlowForUser, getRecurringChargesForUser } from "../finance/analysis";
import { createAdminSupabase } from "../supabase/server";
import { starterAlertRules, validateAlertConfig } from "./rules";

type AlertRule = {
  id: string;
  user_id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean | null;
};

type AccountRow = {
  id: string;
  name: string | null;
  mask: string | null;
  current_balance: number | string | null;
  iso_currency_code: string | null;
};

type TransactionRow = {
  id: string;
  date: string;
  name: string | null;
  merchant_name: string | null;
  amount: number | string;
  category_primary: string | null;
  pending: boolean | null;
};

type GeneratedAlert = {
  alert_rule_id: string | null;
  type: string;
  title: string;
  message: string;
  severity: string;
  related_transaction_id?: string | null;
  dedupeKey: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function numberValue(value: number | string | null) {
  return Number(value ?? 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function merchantName(transaction: TransactionRow) {
  return transaction.merchant_name ?? transaction.name ?? "Unknown merchant";
}

function dedupe(parts: Array<string | number | null | undefined>) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function largeTransactionConfig(config: unknown) {
  return validateAlertConfig("large_transaction", config) as { threshold: number };
}

function balanceThresholdConfig(config: unknown) {
  return validateAlertConfig("balance_below_threshold", config) as { threshold: number };
}

function duplicateChargeConfig(config: unknown) {
  return validateAlertConfig("duplicate_charge_possible", config) as {
    days: number;
    amount_tolerance: number;
  };
}

function categoryLimitConfig(config: unknown) {
  return validateAlertConfig("category_spend_over_limit", config) as {
    category?: string;
    monthly_limit?: number;
    baseline_multiplier: number;
  };
}

function cashFlowRiskConfig(config: unknown) {
  return validateAlertConfig("cash_flow_risk", config) as { minimum_projected_cash_flow: number };
}

async function ensureStarterRules(userId: string) {
  const supabase = createAdminSupabase();
  const { data: existing, error } = await supabase
    .from("alert_rules")
    .select("type")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const existingTypes = new Set((existing ?? []).map((rule) => rule.type));
  const missing = starterAlertRules
    .filter((rule) => !existingTypes.has(rule.type))
    .map((rule) => ({
      user_id: userId,
      type: rule.type,
      name: rule.name,
      config: validateAlertConfig(rule.type, rule.config),
      enabled: true
    }));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from("alert_rules").insert(missing);
    if (insertError) {
      throw insertError;
    }
  }
}

async function getRules(userId: string) {
  await ensureStarterRules(userId);
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("id,user_id,type,name,config,enabled")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (error) {
    throw error;
  }

  return (data ?? []) as AlertRule[];
}

async function getRecentTransactions(userId: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,date,name,merchant_name,amount,category_primary,pending")
    .eq("user_id", userId)
    .eq("pending", false)
    .gte("date", daysAgo(90))
    .lte("date", today())
    .order("date", { ascending: false })
    .limit(5000);

  if (error) {
    throw error;
  }

  return (data ?? []) as TransactionRow[];
}

async function getAccounts(userId: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .select("id,name,mask,current_balance,iso_currency_code")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return (data ?? []) as AccountRow[];
}

function largeTransactionAlerts(rule: AlertRule, transactions: TransactionRow[]) {
  const config = largeTransactionConfig(rule.config);

  return transactions
    .filter((transaction) => numberValue(transaction.amount) >= config.threshold)
    .map((transaction) => ({
      alert_rule_id: rule.id,
      type: rule.type,
      title: "Large transaction",
      message: `${merchantName(transaction)} was $${numberValue(transaction.amount).toFixed(2)} on ${transaction.date}.`,
      severity: numberValue(transaction.amount) >= config.threshold * 3 ? "warning" : "info",
      related_transaction_id: transaction.id,
      dedupeKey: dedupe([rule.id, transaction.id])
    }));
}

function balanceBelowThresholdAlerts(rule: AlertRule, accounts: AccountRow[]) {
  const config = balanceThresholdConfig(rule.config);

  return accounts
    .filter((account) => numberValue(account.current_balance) < config.threshold)
    .map((account) => ({
      alert_rule_id: rule.id,
      type: rule.type,
      title: "Balance below threshold",
      message: `${account.name ?? "Account"} is at $${numberValue(account.current_balance).toFixed(2)}.`,
      severity: "warning",
      related_transaction_id: null,
      dedupeKey: dedupe([rule.id, account.id, Math.floor(numberValue(account.current_balance))])
    }));
}

function duplicateChargeAlerts(rule: AlertRule, transactions: TransactionRow[]) {
  const config = duplicateChargeConfig(rule.config);
  const alerts: GeneratedAlert[] = [];

  for (const transaction of transactions) {
    const amount = numberValue(transaction.amount);
    if (amount <= 0) {
      continue;
    }

    const date = new Date(transaction.date).getTime();
    const matches = transactions.filter((candidate) => {
      if (candidate.id === transaction.id) {
        return false;
      }

      const candidateDate = new Date(candidate.date).getTime();
      return (
        merchantName(candidate) === merchantName(transaction) &&
        Math.abs(numberValue(candidate.amount) - amount) <= config.amount_tolerance &&
        Math.abs(candidateDate - date) <= config.days * MS_PER_DAY
      );
    });

    if (matches.length > 0) {
      alerts.push({
        alert_rule_id: rule.id,
        type: rule.type,
        title: "Possible duplicate charge",
        message: `${merchantName(transaction)} has similar $${amount.toFixed(2)} charges within ${config.days} days.`,
        severity: "warning",
        related_transaction_id: transaction.id,
        dedupeKey: dedupe([rule.id, merchantName(transaction), amount.toFixed(2), transaction.date])
      });
    }
  }

  return alerts;
}

function categorySpendAlerts(rule: AlertRule, transactions: TransactionRow[]) {
  const config = categoryLimitConfig(rule.config);
  const month = today().slice(0, 7);
  const currentMonth = new Map<string, number>();
  const baseline = new Map<string, number[]>();

  for (const transaction of transactions) {
    const amount = numberValue(transaction.amount);
    if (amount <= 0) {
      continue;
    }

    const category = transaction.category_primary ?? "Uncategorized";
    if (config.category && category !== config.category) {
      continue;
    }

    if (transaction.date.startsWith(month)) {
      currentMonth.set(category, (currentMonth.get(category) ?? 0) + amount);
    } else {
      baseline.set(category, [...(baseline.get(category) ?? []), amount]);
    }
  }

  return Array.from(currentMonth.entries()).flatMap(([category, amount]) => {
    const configuredLimit = config.monthly_limit;
    const baselineAmounts = baseline.get(category) ?? [];
    const baselineAverage =
      baselineAmounts.reduce((total, value) => total + value, 0) / Math.max(1, baselineAmounts.length);
    const limit = configuredLimit ?? baselineAverage * config.baseline_multiplier;

    if (!limit || amount <= limit) {
      return [];
    }

    return [
      {
        alert_rule_id: rule.id,
        type: rule.type,
        title: "Category spend over limit",
        message: `${category} spending is $${amount.toFixed(2)} this month, above the $${limit.toFixed(2)} limit.`,
        severity: "warning",
        related_transaction_id: null,
        dedupeKey: dedupe([rule.id, category, month])
      }
    ];
  });
}

async function recurringAndSubscriptionAlerts(rule: AlertRule, userId: string) {
  const recurring = await getRecurringChargesForUser(userId, { lookback_days: 90 });
  const config =
    rule.type === "subscription_detected"
      ? validateAlertConfig("subscription_detected", rule.config)
      : validateAlertConfig("recurring_bill_increased", rule.config);

  return recurring.recurring_charges
    .filter((charge) => charge.confidence >= 0.65)
    .slice(0, 10)
    .map((charge) => ({
      alert_rule_id: rule.id,
      type: rule.type,
      title: rule.type === "subscription_detected" ? "Subscription detected" : "Recurring bill detected",
      message:
        rule.type === "subscription_detected"
          ? `${charge.merchant_name} appears to recur ${charge.frequency} around $${charge.amount.toFixed(2)}.`
          : `${charge.merchant_name} is recurring around $${charge.amount.toFixed(2)}. Review for increases over ${"percent_increase" in config ? config.percent_increase : 15}%.`,
      severity: "info",
      related_transaction_id: null,
      dedupeKey: dedupe([rule.id, charge.merchant_name, charge.frequency])
    }));
}

async function cashFlowRiskAlerts(rule: AlertRule, userId: string) {
  const config = cashFlowRiskConfig(rule.config);
  const flow = await getCashFlowForUser(userId, {
    start_date: daysAgo(30),
    end_date: today()
  });

  if (flow.projected_remaining_cash_flow >= config.minimum_projected_cash_flow) {
    return [];
  }

  return [
    {
      alert_rule_id: rule.id,
      type: rule.type,
      title: "Cash-flow risk",
      message: `Projected remaining cash flow is $${flow.projected_remaining_cash_flow.toFixed(2)} based on synced data.`,
      severity: "warning",
      related_transaction_id: null,
      dedupeKey: dedupe([rule.id, today().slice(0, 7)])
    }
  ];
}

async function insertGeneratedAlerts(userId: string, alerts: GeneratedAlert[]) {
  const supabase = createAdminSupabase();
  let created = 0;

  for (const alert of alerts) {
    const { data: existing, error: lookupError } = await supabase
      .from("alerts")
      .select("id")
      .eq("user_id", userId)
      .eq("type", alert.type)
      .eq("title", alert.title)
      .eq("message", alert.message)
      .limit(1);

    if (lookupError) {
      throw lookupError;
    }

    if ((existing ?? []).length > 0) {
      continue;
    }

    const { error } = await supabase.from("alerts").insert({
      user_id: userId,
      alert_rule_id: alert.alert_rule_id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      related_transaction_id: alert.related_transaction_id ?? null,
      status: "new"
    });

    if (error) {
      throw error;
    }

    created += 1;
  }

  return created;
}

export async function generateAlertsForUser(userId: string) {
  const [rules, transactions, accounts] = await Promise.all([
    getRules(userId),
    getRecentTransactions(userId),
    getAccounts(userId)
  ]);
  const generated: GeneratedAlert[] = [];

  for (const rule of rules) {
    if (rule.type === "large_transaction") {
      generated.push(...largeTransactionAlerts(rule, transactions));
    } else if (rule.type === "balance_below_threshold") {
      generated.push(...balanceBelowThresholdAlerts(rule, accounts));
    } else if (rule.type === "duplicate_charge_possible") {
      generated.push(...duplicateChargeAlerts(rule, transactions));
    } else if (rule.type === "category_spend_over_limit") {
      generated.push(...categorySpendAlerts(rule, transactions));
    } else if (rule.type === "subscription_detected" || rule.type === "recurring_bill_increased") {
      generated.push(...(await recurringAndSubscriptionAlerts(rule, userId)));
    } else if (rule.type === "cash_flow_risk") {
      generated.push(...(await cashFlowRiskAlerts(rule, userId)));
    }
  }

  const created = await insertGeneratedAlerts(userId, generated);
  return { evaluated: generated.length, created };
}

export const alertEngineTestExports = {
  duplicateChargeAlerts,
  largeTransactionAlerts
};
