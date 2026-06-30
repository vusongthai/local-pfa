import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { getPlaidEnv } from "@/lib/env";

export function createPlaidClient() {
  const env = getPlaidEnv();

  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env.PLAID_ENV],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
          "PLAID-SECRET": env.PLAID_SECRET
        }
      }
    })
  );
}

export const plaidReadOnlyProducts = [Products.Transactions];
export const plaidCountries = [CountryCode.Us];
