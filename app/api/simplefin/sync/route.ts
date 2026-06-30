import { jsonError } from "@/lib/http";
import { syncSimpleFinForUser } from "@/lib/simplefin/service";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    const result = await syncSimpleFinForUser(user.id);

    return Response.json(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not sync SimpleFIN", 502);
  }
}
