import { NextResponse } from "next/server";
import {
  authCookieName,
  clearFailedPinAttempts,
  createLocalSessionToken,
  getAuthCookieOptions,
  getLocalPinHash,
  getPinConfiguredCookieOptions,
  getPinLockoutMessage,
  getPinRateLimitStatus,
  getSafeRedirectPath,
  pinConfiguredCookieName,
  recordFailedPinAttempt,
  requireLocalRequestOrigin,
  verifyLocalPin,
} from "@/lib/security-utils";

function createPinLockoutResponse(retryAfterSeconds: number) {
  return new Response(getPinLockoutMessage(), {
    status: 429,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "retry-after": String(retryAfterSeconds),
    },
  });
}

export async function POST(request: Request) {
  const localOriginResponse = requireLocalRequestOrigin(request);

  if (localOriginResponse) {
    return localOriginResponse;
  }

  const formData = await request.formData();
  const pin = String(formData.get("pin") ?? "");
  const nextPath = getSafeRedirectPath(formData.get("next"));
  const storedHash = await getLocalPinHash();

  if (!storedHash) {
    return NextResponse.redirect(new URL(nextPath, request.url), 303);
  }

  const rateLimitStatus = getPinRateLimitStatus();

  if (rateLimitStatus.locked) {
    return createPinLockoutResponse(rateLimitStatus.retryAfterSeconds);
  }

  if (!pin || !(await verifyLocalPin(pin, storedHash))) {
    const nextStatus = recordFailedPinAttempt();

    if (nextStatus.locked) {
      return createPinLockoutResponse(nextStatus.retryAfterSeconds);
    }

    return NextResponse.redirect(
      new URL(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`, request.url),
      303,
    );
  }

  clearFailedPinAttempts();

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(
    authCookieName,
    createLocalSessionToken(storedHash),
    getAuthCookieOptions(),
  );
  response.cookies.set(pinConfiguredCookieName, "1", getPinConfiguredCookieOptions());

  return response;
}
