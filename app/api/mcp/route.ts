import { NextResponse } from "next/server";
import { z } from "zod";
import { getMcpEnv } from "@/lib/env";
import { jsonError, validationError } from "@/lib/http";
import { callMcpTool } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  user_id: z.string().uuid(),
  tool: z.string().min(1),
  arguments: z.unknown().optional()
});

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const env = getMcpEnv();
  const token = getBearerToken(request);

  if (!token || token !== env.MCP_API_KEY) {
    return jsonError("Authentication required", 401);
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (err) {
    return validationError(err);
  }

  try {
    const result = await callMcpTool({
      userId: body.user_id,
      name: body.tool,
      arguments: body.arguments
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationError(err);
    }

    return jsonError("MCP tool call failed", 500);
  }
}
