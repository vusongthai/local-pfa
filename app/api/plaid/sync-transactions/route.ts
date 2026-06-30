import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { syncTransactionsForUser } from "@/lib/plaid/transactions";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    const summary = await syncTransactionsForUser(user.id);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sync transactions";
    return jsonError(message, 502);
  }
}
