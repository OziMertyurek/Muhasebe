import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import {
  authCookieName,
  createLocalSessionToken,
  getAuthCookieOptions,
  getLocalPinHash,
  getPinConfiguredCookieOptions,
  hashLocalPin,
  pinConfiguredCookieName,
  requireRequestLocalAuth,
  saveLocalPinHash,
  verifyLocalPin,
} from "@/lib/security-utils";

export async function POST(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const formData = await request.formData();
  const currentPin = String(formData.get("currentPin") ?? "");
  const newPin = String(formData.get("newPin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");
  const storedHash = await getLocalPinHash();

  if (storedHash && !(await verifyLocalPin(currentPin, storedHash))) {
    return redirectToSecurity(request, "current");
  }

  if (newPin.trim().length < 4) {
    return redirectToSecurity(request, "length");
  }

  if (newPin !== confirmPin) {
    return redirectToSecurity(request, "match");
  }

  const newHash = await hashLocalPin(newPin);
  await saveLocalPinHash(newHash);

  await createAuditLog({
    entityType: "SETTINGS",
    action: "UPDATE",
    title: storedHash ? "Local PIN değiştirildi" : "Local PIN belirlendi",
    description: "Uygulama giriş PIN'i hash olarak güncellendi.",
    metadata: { settingKey: "security.localPinHash" },
  });

  const response = NextResponse.redirect(new URL("/settings/security?saved=1", request.url), 303);
  response.cookies.set(authCookieName, createLocalSessionToken(newHash), getAuthCookieOptions());
  response.cookies.set(pinConfiguredCookieName, "1", getPinConfiguredCookieOptions());

  return response;
}

function redirectToSecurity(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/settings/security?error=${error}`, request.url), 303);
}
