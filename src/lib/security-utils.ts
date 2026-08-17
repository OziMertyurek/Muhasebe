import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { getAppSettingValue, upsertAppSetting } from "@/lib/settings-utils";
import { getEffectiveRequestOrigin, validateSameOriginRequest } from "@/lib/origin-validation-utils";

export const pinHashSettingKey = "security.localPinHash";
export const authCookieName = "local-auth-session";
export const pinConfiguredCookieName = "local-pin-configured";

const scrypt = promisify(scryptCallback);
const hashVersion = "scrypt-v1";
const keyLength = 64;
const sessionVersion = "session-v1";
const sessionMaxAgeSeconds = 60 * 60 * 12;
const maxFailedPinAttempts = 5;
const pinLockoutMs = 5 * 60 * 1000;
const hostedRequestBlockedMessage = "Bu istek yalnizca ayni guvenli web oturumu uzerinden yapilabilir.";
const hostedPinRequiredMessage = "Hosted uretim ortaminda PIN veya web kimlik dogrulamasi yapilandirilmadan erisim acilamaz.";
const localRequestBlockedMessage = "Bu istek yalnızca yerel uygulama üzerinden yapılabilir.";
const pinLockoutMessage = "Çok fazla hatalı PIN denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";

type PinAttemptState = {
  failedAttempts: number;
  lockedUntil: number;
};

type PinAttemptStore = {
  __muhasebePinAttempts?: PinAttemptState;
};

const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: sessionMaxAgeSeconds,
};

const pinConfiguredCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export function getAuthCookieOptions() {
  return authCookieOptions;
}

export function getPinConfiguredCookieOptions() {
  return pinConfiguredCookieOptions;
}

export function isHostedProductionRuntime() {
  const appMode = process.env.APP_MODE?.trim().toLowerCase();

  return (
    process.env.NODE_ENV === "production" &&
    appMode !== "desktop" &&
    process.env.DESKTOP_MODE !== "1"
  );
}

export async function getLocalPinHash() {
  return getAppSettingValue(pinHashSettingKey);
}

export async function isLocalPinConfigured() {
  return Boolean(await getLocalPinHash());
}

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

export async function saveLocalPinHash(hash: string) {
  await upsertAppSetting(pinHashSettingKey, hash);
}

function getPinAttemptState() {
  const store = globalThis as typeof globalThis & PinAttemptStore;

  if (!store.__muhasebePinAttempts) {
    store.__muhasebePinAttempts = { failedAttempts: 0, lockedUntil: 0 };
  }

  return store.__muhasebePinAttempts;
}

export function getPinRateLimitStatus(now = Date.now()) {
  const state = getPinAttemptState();

  if (state.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }

  return {
    locked: false,
    retryAfterSeconds: 0,
  };
}

export function recordFailedPinAttempt(now = Date.now()) {
  const state = getPinAttemptState();

  if (state.lockedUntil <= now) {
    state.lockedUntil = 0;
  }

  state.failedAttempts += 1;

  if (state.failedAttempts >= maxFailedPinAttempts) {
    state.lockedUntil = now + pinLockoutMs;
  }

  return getPinRateLimitStatus(now);
}

export function clearFailedPinAttempts() {
  const state = getPinAttemptState();
  state.failedAttempts = 0;
  state.lockedUntil = 0;
}

export function getPinLockoutMessage() {
  return pinLockoutMessage;
}

export async function setLocalPin(pin: string) {
  const hash = await hashLocalPin(pin);
  await saveLocalPinHash(hash);
  return hash;
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

export async function isLocalSessionValid() {
  const storedHash = await getLocalPinHash();

  if (!storedHash) {
    return !isHostedProductionRuntime();
  }

  const cookieStore = await cookies();
  return verifyLocalSessionToken(cookieStore.get(authCookieName)?.value, storedHash);
}

export async function requireLocalAuth(nextPath = "/") {
  const storedHash = await getLocalPinHash();

  if (!storedHash) {
    if (isHostedProductionRuntime()) {
      redirect(`/login?error=pin-required&next=${encodeURIComponent(nextPath)}`);
    }

    return;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  if (!verifyLocalSessionToken(token, storedHash)) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
}

export async function setLocalAuthCookies(storedHash: string) {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, createLocalSessionToken(storedHash), authCookieOptions);
  cookieStore.set(pinConfiguredCookieName, "1", pinConfiguredCookieOptions);
}

export async function clearLocalAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(authCookieName);
}

export function requireLocalRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const effectiveOrigin = getEffectiveRequestOrigin(request);
  const hostHeader = effectiveOrigin ? new URL(effectiveOrigin).host : request.headers.get("host") || requestUrl.host;
  const hostedRuntime = isHostedProductionRuntime();

  if (!hostedRuntime && !isLocalHostValue(hostHeader)) {
    return new Response(localRequestBlockedMessage, {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (!isStateChangingMethod(request.method)) {
    return null;
  }

  const validation = validateSameOriginRequest(request);

  if (!validation.ok) {
    if (!hostedRuntime && validation.reason === "missing-origin") {
      return null;
    }

    return new Response(hostedRuntime ? hostedRequestBlockedMessage : localRequestBlockedMessage, {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return null;
}

export async function requireRequestLocalAuth(request: Request) {
  const localOriginResponse = requireLocalRequestOrigin(request);

  if (localOriginResponse) {
    return localOriginResponse;
  }

  const storedHash = await getLocalPinHash();

  if (!storedHash) {
    if (isHostedProductionRuntime()) {
      return new Response(hostedPinRequiredMessage, {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    return null;
  }

  const token = getCookieFromHeader(request.headers.get("cookie"), authCookieName);

  if (verifyLocalSessionToken(token, storedHash)) {
    return null;
  }

  return new Response("Bu işlem için önce PIN ile giriş yapmalısınız.", {
    status: 401,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function getSafeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.startsWith("/login") || value.startsWith("/cikis")) {
    return "/";
  }

  return value;
}

function isStateChangingMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function isLocalHostValue(value: string) {
  const host = value.trim().toLowerCase();
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]"))
    : host.split(":")[0];

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getCookieFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");

    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return undefined;
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
