import { createHash } from "crypto";

const DEFAULT_LOOKBACK_DAYS = 180;
const SECONDS_PER_DAY = 24 * 60 * 60;

export type SimpleFinTransaction = {
  id: string;
  posted?: number;
  transacted_at?: number;
  amount: string;
  description?: string;
  payee?: string;
  memo?: string;
  pending?: boolean;
  extra?: Record<string, unknown>;
};

export type SimpleFinAccount = {
  id: string;
  name?: string;
  org?: {
    name?: string;
    domain?: string;
  };
  currency?: string;
  balance?: string;
  "available-balance"?: string;
  "balance-date"?: number;
  transactions?: SimpleFinTransaction[];
  extra?: Record<string, unknown>;
};

export type SimpleFinAccountsResponse = {
  accounts: SimpleFinAccount[];
};

function normalizeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return normalized + padding;
}

function requestFromCredentialUrl(value: string, init?: RequestInit) {
  const url = new URL(value);
  const headers = new Headers(init?.headers);

  if (url.username || url.password) {
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    headers.set("Authorization", `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`);
    url.username = "";
    url.password = "";
  }

  return fetch(url, {
    ...init,
    headers
  });
}

export function decodeSetupToken(setupToken: string) {
  const trimmed = setupToken.trim();
  if (!trimmed) {
    throw new Error("SimpleFIN setup token is required");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const decoded = Buffer.from(normalizeBase64(trimmed), "base64").toString("utf8").trim();
  if (!decoded.startsWith("http://") && !decoded.startsWith("https://")) {
    throw new Error("SimpleFIN setup token is not a valid URL token");
  }

  return decoded;
}

export function simpleFinConnectionId(accessUrl: string) {
  return `simplefin:${createHash("sha256").update(accessUrl).digest("hex").slice(0, 32)}`;
}

export async function claimSimpleFinSetupToken(setupToken: string) {
  const setupUrl = decodeSetupToken(setupToken);
  const response = await requestFromCredentialUrl(setupUrl, { method: "POST" });
  const body = (await response.text()).trim();

  if (!response.ok) {
    throw new Error(body || "Could not claim SimpleFIN setup token");
  }

  if (!body.startsWith("http://") && !body.startsWith("https://")) {
    throw new Error("SimpleFIN did not return a valid access URL");
  }

  return body;
}

export function simpleFinRange(lookbackDays = DEFAULT_LOOKBACK_DAYS) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - lookbackDays * SECONDS_PER_DAY;

  return {
    start,
    end
  };
}

export async function fetchSimpleFinAccounts(accessUrl: string, lookbackDays = DEFAULT_LOOKBACK_DAYS) {
  const url = new URL(accessUrl);
  const range = simpleFinRange(lookbackDays);
  url.searchParams.set("start-date", String(range.start));
  url.searchParams.set("end-date", String(range.end));
  url.searchParams.set("pending", "1");

  const response = await requestFromCredentialUrl(url.toString());
  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || "Could not fetch SimpleFIN accounts");
  }

  return JSON.parse(body) as SimpleFinAccountsResponse;
}
