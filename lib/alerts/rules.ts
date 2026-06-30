import { z } from "zod";

export const alertTypes = [
  "large_transaction",
  "balance_below_threshold",
  "recurring_bill_increased",
  "duplicate_charge_possible",
  "category_spend_over_limit",
  "subscription_detected",
  "cash_flow_risk"
] as const;

export const alertTypeSchema = z.enum(alertTypes);

const alertConfigSchemas = {
  large_transaction: z.object({
    threshold: z.coerce.number().positive().default(250)
  }),
  balance_below_threshold: z.object({
    threshold: z.coerce.number().positive().default(500)
  }),
  recurring_bill_increased: z.object({
    percent_increase: z.coerce.number().positive().default(15)
  }),
  duplicate_charge_possible: z.object({
    days: z.coerce.number().int().positive().default(3),
    amount_tolerance: z.coerce.number().nonnegative().default(1)
  }),
  category_spend_over_limit: z.object({
    category: z.string().min(1).optional(),
    monthly_limit: z.coerce.number().positive().optional(),
    baseline_multiplier: z.coerce.number().positive().default(1.25)
  }),
  subscription_detected: z.object({
    min_occurrences: z.coerce.number().int().min(2).default(2)
  }),
  cash_flow_risk: z.object({
    minimum_projected_cash_flow: z.coerce.number().default(0)
  })
} satisfies Record<(typeof alertTypes)[number], z.ZodTypeAny>;

export const createAlertRuleSchema = z.object({
  type: alertTypeSchema,
  name: z.string().trim().min(1),
  config: z.record(z.unknown()).default({})
});

export const alertStatusQuerySchema = z.object({
  status: z.enum(["new", "dismissed", "all"]).default("new")
});

export function validateAlertConfig(type: z.infer<typeof alertTypeSchema>, config: unknown) {
  return alertConfigSchemas[type].parse(config ?? {});
}

export const starterAlertRules = [
  {
    type: "large_transaction",
    name: "Transaction over $250",
    config: { threshold: 250 }
  },
  {
    type: "balance_below_threshold",
    name: "Balance below $500",
    config: { threshold: 500 }
  },
  {
    type: "recurring_bill_increased",
    name: "Recurring bill increase over 15%",
    config: { percent_increase: 15 }
  },
  {
    type: "duplicate_charge_possible",
    name: "Duplicate charge within 3 days",
    config: { days: 3, amount_tolerance: 1 }
  },
  {
    type: "category_spend_over_limit",
    name: "Category spend exceeds monthly baseline by 25%",
    config: { baseline_multiplier: 1.25 }
  }
] satisfies Array<{
  type: z.infer<typeof alertTypeSchema>;
  name: string;
  config: Record<string, unknown>;
}>;
