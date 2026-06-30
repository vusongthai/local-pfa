import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../lib/crypto";

describe("Plaid access token encryption", () => {
  it("round trips without storing plaintext", () => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-with-enough-entropy";

    const encrypted = encryptSecret("access-sandbox-secret");

    expect(encrypted).not.toContain("access-sandbox-secret");
    expect(decryptSecret(encrypted)).toBe("access-sandbox-secret");
  });
});
