import { NextResponse } from "next/server";
import { getTransactionsForUser, transactionsQuerySchema } from "@/lib/finance/analysis";
import { jsonError, validationError } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = transactionsQuerySchema.parse(params);
    return NextResponse.json(await getTransactionsForUser(user.id, query));
  } catch (err) {
    return "issues" in (err as object) ? validationError(err) : jsonError("Could not load transactions", 500);
  }
}
