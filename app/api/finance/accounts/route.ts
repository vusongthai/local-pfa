import { NextResponse } from "next/server";
import { getAccountsForUser } from "@/lib/finance/accounts";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  const accounts = await getAccountsForUser(user.id);
  return NextResponse.json({ accounts });
}
