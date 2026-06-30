import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getEncryptionEnv } from "./env";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function keyFromEnv() {
  const { ENCRYPTION_KEY: value } = getEncryptionEnv();

  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 32) {
    return decoded;
  }

  const hex = Buffer.from(value, "hex");
  if (hex.length === 32) {
    return hex;
  }

  return createHash("sha256").update(value).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyFromEnv(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(value: string): string {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted secret format");
  }

  const decipher = createDecipheriv(ALGORITHM, keyFromEnv(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
