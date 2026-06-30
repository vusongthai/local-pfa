import { createHash } from "crypto";

const DEFAULT_LOOKBACK_DAYS = 90;
const SECONDS_PER_DAY = 24 * 60 * 60;
const CLAIM_TIMEOUT_MS = 15_000;
const ACCOUNTS_TIMEOUT_MS = 60_000;

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

async function requestFromCredentialUrl(value: string, init?: RequestInit & { timeoutMs?: number }) {
  const url = new URL(value);
  const headers = new Headers(init?.headers);
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? ACCOUNTS_TIMEOUT_MS;
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const { timeoutMs: _timeoutMs, ...fetchInit } = init ?? {};

  if (url.username || url.password) {
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    headers.set("Authorization", `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`);
    url.username = "";
    url.password = "";
  }

  try {
    return await fetch(url, {
      ...fetchInit,
      headers,
      signal: controller.signal
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("SimpleFIN took too long to respond. Try syncing again in a minute.");
    }

    throw err;
  } finally {
    globalThis.clearTimeout(timeout);
  }
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
  const response = await requestFromCredentialUrl(setupUrl, { method: "POST", timeoutMs: CLAIM_TIMEOUT_MS });
  const body = (await response.text()).trim();

  if (!response.ok) {
    throw new Error(readableSimpleFinError(body, "Could not claim SimpleFIN setup token"));
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
  const url = new URL(accessUrl.replace(/\/$/, "") + "/accounts");
  const range = simpleFinRange(lookbackDays);
  url.searchParams.set("start-date", String(range.start));
  url.searchParams.set("end-date", String(range.end));
  url.searchParams.set("pending", "1");
  url.searchParams.set("version", "2");

  const response = await requestFromCredentialUrl(url.toString(), { timeoutMs: ACCOUNTS_TIMEOUT_MS });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(readableSimpleFinError(body, "Could not fetch SimpleFIN accounts"));
  }

  return JSON.parse(body) as SimpleFinAccountsResponse;
}

function readableSimpleFinError(body: string, fallback: string) {
  if (!body) {
    return fallback;
  }

  if (body.includes("<html") || body.includes("<!doctype html")) {
    const title = body.match(/<title>(.*?)<\/title>/i)?.[1]?.trim();
    const heading = body.match(/<h1>(.*?)<\/h1>/i)?.[1]?.trim();
    const message = [title, heading].filter(Boolean).join(": ");

    return message || fallback;
  }

  return body;
}
