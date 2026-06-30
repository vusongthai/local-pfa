import { NextResponse } from "next/server";
import { alertStatusQuerySchema } from "@/lib/alerts/rules";
import { listAlerts } from "@/lib/alerts/service";
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
    const query = alertStatusQuerySchema.parse(params);
    return NextResponse.json(await listAlerts(user.id, query));
  } catch (err) {
    return "issues" in (err as object) ? validationError(err) : jsonError("Could not list alerts", 500);
  }
}
