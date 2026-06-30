import { NextResponse } from "next/server";
import { generateAlertsForUser } from "@/lib/alerts/engine";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    return NextResponse.json(await generateAlertsForUser(user.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate alerts";
    return jsonError(message, 500);
  }
}
