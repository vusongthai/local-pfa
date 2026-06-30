import { z } from "zod";
import { createAdminSupabase } from "../supabase/server";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

const baseDateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

function withDateRangeValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine((value) => new Date(value.start_date) <= new Date(value.end_date), {
    message: "start_date must be on or before end_date"
    })
    .refine((value) => daysBetween(value.start_date, value.end_date) <= MAX_RANGE_DAYS, {
    message: "Date range cannot exceed 12 months"
    });
}

export const dateRangeSchema = withDateRangeValidation(baseDateRangeSchema);

export const transactionsQuerySchema = withDateRangeValidation(baseDateRangeSchema.extend({
  account_id: z.string().uuid().optional(),
  merchant: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  include_pending: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
}));

export const spendSummaryQuerySchema = withDateRangeValidation(baseDateRangeSchema.extend({
  group_by: z.enum(["category", "merchant", "account", "month"]).default("category")
}));

export const lookbackQuerySchema = z.object({
  lookback_days: z.coerce.number().int().min(30).max(365).default(90)
});

export const unusualSpendQuerySchema = lookbackQuerySchema.extend({
  sensitivity: z.enum(["low", "medium", "high"]).default("medium")
});

type TransactionRow = {
  id: string;
  account_id: string;
  date: string;
  authorized_date: string | null;
  name: string | null;
  merchant_name: string | null;
  amount: number | string;
  category_primary: string | null;
  category_detailed: string | null;
  pending: boolean | null;
  payment_channel: string | null;
  iso_currency_code: string | null;
};

type AccountLabelRow = {
  id: string;
  name: string | null;
  mask: string | null;
};

function daysBetween(startDate: string, endDate: string) {
  return Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / MS_PER_DAY);
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value: number | string | null) {
  return Number(value ?? 0);
}

function transactionLabel(transaction: TransactionRow) {
  return transaction.merchant_name ?? transaction.name ?? "Unknown";
}

async function getAccountLabels(userId: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.from("accounts").select("id,name,mask").eq("user_id", userId);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as AccountLabelRow[]).map((account) => [
      account.id,
      account.mask ? `${account.name ?? "Account"} (...${account.mask})` : account.name ?? "Account"
    ])
  );
}

async function fetchTransactions(params: {
  userId: string;
  startDate: string;
  endDate: string;
  includePending?: boolean;
  accountId?: string;
  merchant?: string;
  category?: string;
  limit?: number;
}) {
  const supabase = createAdminSupabase();
  let query = supabase
    .from("transactions")
    .select(
      "id,account_id,date,authorized_date,name,merchant_name,amount,category_primary,category_detailed,pending,payment_channel,iso_currency_code"
    )
    .eq("user_id", params.userId)
    .gte("date", params.startDate)
    .lte("date", params.endDate)
    .order("date", { ascending: false })
    .limit(params.limit ?? 500);

  if (!params.includePending) {
    query = query.eq("pending", false);
  }

  if (params.accountId) {
    query = query.eq("account_id", params.accountId);
  }

  if (params.merchant) {
    query = query.ilike("merchant_name", `%${params.merchant}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as TransactionRow[];
  if (!params.category) {
    return rows;
  }

  return rows.filter(
    (transaction) =>
      transaction.category_primary === params.category || transaction.category_detailed === params.category
  );
}

export async function getTransactionsForUser(
  userId: string,
  query: z.infer<typeof transactionsQuerySchema>
) {
  const transactions = await fetchTransactions({
    userId,
    startDate: query.start_date,
    endDate: query.end_date,
    includePending: query.include_pending,
    accountId: query.account_id,
    merchant: query.merchant,
    category: query.category,
    limit: 500
  });

  return { transactions };
}

export async function getSpendSummaryForUser(
  userId: string,
  query: z.infer<typeof spendSummaryQuerySchema>
) {
  const transactions = await fetchTransactions({
    userId,
    startDate: query.start_date,
    endDate: query.end_date,
    includePending: false,
    limit: 5000
  });
  const accountLabels = query.group_by === "account" ? await getAccountLabels(userId) : new Map<string, string>();
  const groups = new Map<string, { label: string; amount: number; count: number }>();

  for (const transaction of transactions) {
    const amount = numberValue(transaction.amount);
    if (amount <= 0) {
      continue;
    }

    const label =
      query.group_by === "merchant"
        ? transactionLabel(transaction)
        : query.group_by === "account"
          ? accountLabels.get(transaction.account_id) ?? "Account"
          : query.group_by === "month"
            ? transaction.date.slice(0, 7)
            : transaction.category_primary ?? "Uncategorized";

    const current = groups.get(label) ?? { label, amount: 0, count: 0 };
    current.amount += amount;
    current.count += 1;
    groups.set(label, current);
  }

  return {
    group_by: query.group_by,
    total_spend: Array.from(groups.values()).reduce((total, group) => total + group.amount, 0),
    groups: Array.from(groups.values()).sort((a, b) => b.amount - a.amount)
  };
}

export async function getCashFlowForUser(userId: string, query: z.infer<typeof dateRangeSchema>) {
  const transactions = await fetchTransactions({
    userId,
    startDate: query.start_date,
    endDate: query.end_date,
    includePending: false,
    limit: 5000
  });
  const recurring = await getRecurringChargesForUser(userId, { lookback_days: 90 });

  const inflows = transactions
    .filter((transaction) => numberValue(transaction.amount) < 0)
    .reduce((total, transaction) => total + Math.abs(numberValue(transaction.amount)), 0);
  const outflows = transactions
    .filter((transaction) => numberValue(transaction.amount) > 0)
    .reduce((total, transaction) => total + numberValue(transaction.amount), 0);

  return {
    inflows,
    outflows,
    net_cash_flow: inflows - outflows,
    recurring_charges: recurring.recurring_charges.slice(0, 10),
    projected_remaining_cash_flow: inflows - outflows - recurring.recurring_charges_total
  };
}

export async function getRecurringChargesForUser(
  userId: string,
  query: z.infer<typeof lookbackQuerySchema>
) {
  const transactions = await fetchTransactions({
    userId,
    startDate: dateDaysAgo(query.lookback_days),
    endDate: today(),
    includePending: false,
    limit: 5000
  });
  const grouped = new Map<string, TransactionRow[]>();

  for (const transaction of transactions) {
    const amount = numberValue(transaction.amount);
    if (amount <= 0) {
      continue;
    }

    const label = transactionLabel(transaction);
    grouped.set(label, [...(grouped.get(label) ?? []), transaction]);
  }

  const recurringCharges = Array.from(grouped.entries())
    .flatMap(([merchant_name, rows]) => {
      if (rows.length < 2) {
        return [];
      }

      const sorted = rows.sort((a, b) => a.date.localeCompare(b.date));
      const gaps = sorted
        .slice(1)
        .map((row, index) => Math.max(1, daysBetween(sorted[index].date, row.date)));
      const averageGap = gaps.reduce((total, gap) => total + gap, 0) / gaps.length;
      const averageAmount =
        sorted.reduce((total, row) => total + numberValue(row.amount), 0) / sorted.length;
      const lastSeen = sorted[sorted.length - 1].date;
      const frequency =
        averageGap <= 10 ? "weekly" : averageGap <= 20 ? "biweekly" : averageGap <= 45 ? "monthly" : "irregular";

      return [
        {
          merchant_name,
          amount: averageAmount,
          frequency,
          last_seen_date: lastSeen,
          next_expected_date: new Date(new Date(lastSeen).getTime() + averageGap * MS_PER_DAY)
            .toISOString()
            .slice(0, 10),
          confidence: frequency === "irregular" ? 0.45 : Math.min(0.95, 0.55 + sorted.length * 0.1)
        }
      ];
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    lookback_days: query.lookback_days,
    recurring_charges_total: recurringCharges.reduce((total, charge) => total + charge.amount, 0),
    recurring_charges: recurringCharges
  };
}

export async function getUnusualSpendForUser(
  userId: string,
  query: z.infer<typeof unusualSpendQuerySchema>
) {
  const transactions = await fetchTransactions({
    userId,
    startDate: dateDaysAgo(query.lookback_days),
    endDate: today(),
    includePending: false,
    limit: 5000
  });
  const thresholdBySensitivity = {
    low: 1.5,
    medium: 2,
    high: 3
  } satisfies Record<typeof query.sensitivity, number>;
  const byCategory = new Map<string, number[]>();

  for (const transaction of transactions) {
    const amount = numberValue(transaction.amount);
    if (amount <= 0) {
      continue;
    }

    const category = transaction.category_primary ?? "Uncategorized";
    byCategory.set(category, [...(byCategory.get(category) ?? []), amount]);
  }

  const unusual = transactions
    .filter((transaction) => numberValue(transaction.amount) > 0)
    .flatMap((transaction) => {
      const category = transaction.category_primary ?? "Uncategorized";
      const amounts = byCategory.get(category) ?? [];
      const baseline = amounts.reduce((total, amount) => total + amount, 0) / Math.max(1, amounts.length);
      const amount = numberValue(transaction.amount);

      if (amount < baseline * thresholdBySensitivity[query.sensitivity] || amount < 25) {
        return [];
      }

      return [
        {
          id: transaction.id,
          date: transaction.date,
          merchant_name: transactionLabel(transaction),
          category,
          amount,
          baseline,
          ratio: baseline > 0 ? amount / baseline : 0
        }
      ];
    })
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 25);

  return {
    lookback_days: query.lookback_days,
    sensitivity: query.sensitivity,
    unusual_transactions: unusual
  };
}

export function defaultAnalysisRange() {
  return {
    start_date: dateDaysAgo(90),
    end_date: today()
  };
}
