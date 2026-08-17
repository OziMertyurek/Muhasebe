import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const hashVersion = "scrypt-v1";
const keyLength = 64;
const sessionVersion = "session-v1";
export const sessionMaxAgeSeconds = 60 * 60 * 12;

export async function hashLocalPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(pin, salt, keyLength)) as Buffer;
  return `${hashVersion}$${salt}$${key.toString("hex")}`;
}

export async function verifyLocalPin(pin: string, storedHash: string) {
  const parts = storedHash.split("$");

  if (parts.length !== 3 || parts[0] !== hashVersion) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(pin, salt, expected.length)) as Buffer;

  return safeEqual(actual, expected);
}

export function createLocalSessionToken(storedHash: string, now = Date.now()) {
  const issuedAt = String(now);
  const signature = signSessionToken(storedHash, issuedAt);
  return `${sessionVersion}.${issuedAt}.${signature}`;
}

export function verifyLocalSessionToken(token: string | undefined, storedHash: string | null) {
  if (!token || !storedHash) {
    return false;
  }

  const [version, issuedAt, signature] = token.split(".");

  if (version !== sessionVersion || !issuedAt || !signature) {
    return false;
  }

  const issuedAtNumber = Number(issuedAt);

  if (!Number.isFinite(issuedAtNumber)) {
    return false;
  }

  const ageMs = Date.now() - issuedAtNumber;

  if (ageMs < 0 || ageMs > sessionMaxAgeSeconds * 1000) {
    return false;
  }

  return safeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(signSessionToken(storedHash, issuedAt), "hex"),
  );
}

function signSessionToken(storedHash: string, issuedAt: string) {
  const secret = createHash("sha256")
    .update(`local-muhasebe-session:${storedHash}`)
    .digest();

  return createHmac("sha256", secret)
    .update(`${sessionVersion}.${issuedAt}`)
    .digest("hex");
}

function safeEqual(actual: Buffer, expected: Buffer) {
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
