import { NextResponse } from "next/server";
import { getHostedMcpEnv } from "@/lib/env";
import { handleMcpJsonRpc } from "@/lib/mcp/protocol";

export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
}

function getRequestToken(request: Request) {
  const url = new URL(request.url);

  return getBearerToken(request) ?? url.searchParams.get("key");
}

function unauthorized() {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message: "Authentication required"
      }
    },
    { status: 401 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export async function POST(request: Request) {
  const env = getHostedMcpEnv();
  const token = getRequestToken(request);

  if (!token || token !== env.MCP_API_KEY) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Invalid JSON"
        }
      },
      { status: 400 }
    );
  }

  const response = await handleMcpJsonRpc({
    userId: env.MCP_USER_ID,
    body
  });

  if (!response) {
    return new NextResponse(null, { status: 202 });
  }

  return NextResponse.json(response, {
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  });
}
