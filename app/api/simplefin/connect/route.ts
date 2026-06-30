import { z } from "zod";
import { jsonError, validationError } from "@/lib/http";
import { connectSimpleFinForUser } from "@/lib/simplefin/service";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  setup_token: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    const body = requestSchema.parse(await request.json());
    const result = await connectSimpleFinForUser(user.id, body.setup_token);

    return Response.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationError(err);
    }

    return jsonError(err instanceof Error ? err.message : "Could not connect SimpleFIN", 502);
  }
}
