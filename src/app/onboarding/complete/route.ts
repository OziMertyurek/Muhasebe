import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import { initializeDefaultBackupReminderSettings } from "@/lib/backup-reminder-utils";
import {
  readOnboardingCompanySettings,
  saveOnboardingSettings,
  validateOnboardingCompanySettings,
} from "@/lib/onboarding-utils";
import {
  authCookieName,
  createLocalSessionToken,
  getAuthCookieOptions,
  getLocalPinHash,
  getPinConfiguredCookieOptions,
  hashLocalPin,
  pinConfiguredCookieName,
  requireLocalRequestOrigin,
  requireRequestLocalAuth,
  saveLocalPinHash,
} from "@/lib/security-utils";

export async function POST(request: Request) {
  const localOriginResponse = requireLocalRequestOrigin(request);

  if (localOriginResponse) {
    return localOriginResponse;
  }

  const existingPinHash = await getLocalPinHash();

  if (existingPinHash) {
    const authResponse = await requireRequestLocalAuth(request);

    if (authResponse) {
      return redirectToOnboarding(request, "auth");
    }
  }

  const formData = await request.formData();
  const company = readOnboardingCompanySettings(formData);
  const companyErrors = validateOnboardingCompanySettings(company);
  const backupAcknowledged = formData.get("backupAcknowledged") === "yes";
  const pin = String(formData.get("pin") ?? "");
  const pinConfirm = String(formData.get("pinConfirm") ?? "");

  if (companyErrors.length > 0) {
    return redirectToOnboarding(request, "company");
  }

  if (!backupAcknowledged) {
    return redirectToOnboarding(request, "backup");
  }

  let pinHash = existingPinHash;

  if (!existingPinHash || pin || pinConfirm) {
    if (pin.trim().length < 4 || pin !== pinConfirm) {
      return redirectToOnboarding(request, "pin");
    }

    pinHash = await hashLocalPin(pin);
    await saveLocalPinHash(pinHash);
  }

  try {
    await saveOnboardingSettings({ company });
    await initializeDefaultBackupReminderSettings();
    await createAuditLog({
      entityType: "SETTINGS",
      action: "UPDATE",
      title: "İlk kurulum tamamlandı",
      description: "Şirket bilgileri, varsayılan ayarlar ve local güvenlik ayarları kaydedildi.",
      after: {
        company,
        onboardingCompleted: true,
        pinConfigured: Boolean(pinHash),
        backupReminderEnabled: true,
        backupReminderIntervalDays: 7,
      },
    });
  } catch {
    return redirectToOnboarding(request, "save");
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);

  if (pinHash) {
    response.cookies.set(authCookieName, createLocalSessionToken(pinHash), getAuthCookieOptions());
    response.cookies.set(pinConfiguredCookieName, "1", getPinConfiguredCookieOptions());
  }

  return response;
}

function redirectToOnboarding(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/onboarding?error=${error}`, request.url), 303);
}
