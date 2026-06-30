import { z } from "zod";
import { mcpToolDefinitions } from "./manifest";
import { callMcpTool } from "./tools";

const requestSchema = z.object({
  jsonrpc: z.literal("2.0").optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string(),
  params: z.unknown().optional()
});

const toolCallParamsSchema = z.object({
  name: z.string().min(1),
  arguments: z.unknown().optional()
});

type JsonRpcId = string | number | null | undefined;

function success(id: JsonRpcId, result: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result
  };
}

function failure(id: JsonRpcId, code: number, message: string, data?: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  };
}

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

export async function handleMcpJsonRpc(params: {
  userId: string;
  body: unknown;
}) {
  const parsed = requestSchema.safeParse(params.body);

  if (!parsed.success) {
    return failure(null, -32600, "Invalid JSON-RPC request", parsed.error.flatten());
  }

  const request = parsed.data;

  if (request.id === undefined && request.method.startsWith("notifications/")) {
    return null;
  }

  if (request.method === "initialize") {
    return success(request.id, {
      protocolVersion: "2025-06-18",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "local-pfa",
        version: "0.1.0"
      }
    });
  }

  if (request.method === "tools/list") {
    return success(request.id, {
      tools: mcpToolDefinitions
    });
  }

  if (request.method === "tools/call") {
    const toolCall = toolCallParamsSchema.safeParse(request.params);

    if (!toolCall.success) {
      return failure(request.id, -32602, "Invalid tool call parameters", toolCall.error.flatten());
    }

    try {
      const result = await callMcpTool({
        userId: params.userId,
        name: toolCall.data.name,
        arguments: toolCall.data.arguments
      });

      return success(request.id, textResult(result));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return failure(request.id, -32602, "Tool arguments failed validation", err.flatten());
      }

      return failure(
        request.id,
        -32000,
        err instanceof Error ? err.message : "Tool call failed"
      );
    }
  }

  return failure(request.id, -32601, `Unsupported MCP method: ${request.method}`);
}
