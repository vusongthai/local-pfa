import { NextResponse } from "next/server";
import { createAlertRule, listAlertRules } from "@/lib/alerts/service";
import { createAlertRuleSchema } from "@/lib/alerts/rules";
import { jsonError, validationError } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  return NextResponse.json(await listAlertRules(user.id));
}

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    const input = createAlertRuleSchema.parse(await request.json());
    return NextResponse.json(await createAlertRule(user.id, input));
  } catch (err) {
    return "issues" in (err as object) ? validationError(err) : jsonError("Could not create alert rule", 500);
  }
}
