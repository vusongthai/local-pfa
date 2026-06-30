import { z } from "zod";

const serverEnvSchema = z.object({
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MCP_API_KEY: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(16),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

export function getPublicEnv() {
  return z
    .object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
    })
    .parse(process.env);
}
