import { NextResponse } from "next/server";
import {
  authCookieName,
  createLocalSessionToken,
  getAuthCookieOptions,
  getLocalPinHash,
  getPinConfiguredCookieOptions,
  getSafeRedirectPath,
  pinConfiguredCookieName,
  verifyLocalPin,
} from "@/lib/security-utils";

export async function POST(request: Request) {
  const formData = await request.formData();
  const pin = String(formData.get("pin") ?? "");
  const nextPath = getSafeRedirectPath(formData.get("next"));
  const storedHash = await getLocalPinHash();

  if (!storedHash) {
    return NextResponse.redirect(new URL(nextPath, request.url), 303);
  }

  if (!pin || !(await verifyLocalPin(pin, storedHash))) {
    return NextResponse.redirect(
      new URL(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`, request.url),
      303,
    );
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(
    authCookieName,
    createLocalSessionToken(storedHash),
    getAuthCookieOptions(),
  );
  response.cookies.set(pinConfiguredCookieName, "1", getPinConfiguredCookieOptions());

  return response;
}
