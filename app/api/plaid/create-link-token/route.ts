import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getServerEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { createPlaidClient, plaidCountries, plaidReadOnlyProducts } from "@/lib/plaid/client";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { user, error } = await requireUser();
  if (error || !user) {
    return jsonError("Authentication required", 401);
  }

  const env = getServerEnv();
  const plaid = createPlaidClient();

  const response = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "Local PFA",
    products: plaidReadOnlyProducts as Products[],
    country_codes: plaidCountries as CountryCode[],
    language: "en",
    webhook: `${env.APP_BASE_URL}/api/plaid/webhook`
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
