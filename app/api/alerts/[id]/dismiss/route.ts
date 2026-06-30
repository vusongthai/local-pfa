import { z } from "zod";
import { dismissAlert } from "@/lib/alerts/service";
import { jsonError, validationError } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export async function POST(_request: Request, context: { params: { id: string } }) {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    const params = paramsSchema.parse(context.params);
    return Response.json(await dismissAlert(user.id, params.id));
  } catch (err) {
    return "issues" in (err as object) ? validationError(err) : jsonError("Could not dismiss alert", 500);
  }
}
