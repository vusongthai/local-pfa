import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getPlaidEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { createPlaidClient, plaidCountries, plaidReadOnlyProducts } from "@/lib/plaid/client";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function buildWebhookUrl(appBaseUrl: string) {
  const url = new URL(appBaseUrl);

  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    return undefined;
  }

  return `${url.origin}/api/plaid/webhook`;
}

function getPlaidErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (data && typeof data === "object") {
      const details = data as {
        error_code?: string;
        error_message?: string;
        display_message?: string;
      };
      const message = details.display_message ?? details.error_message;

      if (details.error_code && message) {
        return `${details.error_code}: ${message}`;
      }

      if (message) {
        return message;
      }
    }
  }

  return err instanceof Error && err.message ? err.message : "Could not create Plaid link token";
}

export async function POST() {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  try {
    const env = getPlaidEnv();
    const plaid = createPlaidClient();
    const webhook = buildWebhookUrl(env.APP_BASE_URL);

    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Local PFA",
      products: plaidReadOnlyProducts as Products[],
      country_codes: plaidCountries as CountryCode[],
      language: "en",
      ...(webhook ? { webhook } : {})
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    return jsonError(getPlaidErrorMessage(err), 502);
  }
}
