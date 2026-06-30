import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
});

const plaidEnvSchema = publicEnvSchema.extend({
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
  APP_BASE_URL: z.string().url()
});

const adminEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

const encryptionEnvSchema = z.object({
  ENCRYPTION_KEY: z.string().min(16)
});

const mcpEnvSchema = z.object({
  MCP_API_KEY: z.string().min(1)
});

const hostedMcpEnvSchema = mcpEnvSchema.extend({
  MCP_USER_ID: z.string().uuid()
});

export function getPlaidEnv() {
  return plaidEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
    PLAID_SECRET: process.env.PLAID_SECRET,
    PLAID_ENV: process.env.PLAID_ENV,
    APP_BASE_URL: process.env.APP_BASE_URL
  });
}

export function getAdminEnv() {
  return adminEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}

export function getEncryptionEnv() {
  return encryptionEnvSchema.parse({
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
  });
}

export function getMcpEnv() {
  return mcpEnvSchema.parse({
    MCP_API_KEY: process.env.MCP_API_KEY
  });
}

export function getHostedMcpEnv() {
  return hostedMcpEnvSchema.parse({
    MCP_API_KEY: process.env.MCP_API_KEY,
    MCP_USER_ID: process.env.MCP_USER_ID
  });
}

export function readPublicEnv() {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });

  return result.success ? result.data : null;
}

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}
