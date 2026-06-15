import "server-only";

import type { CompanySettings } from "@/lib/settings-utils";
import {
  defaultCompanySettings,
  getAppSettingValue,
  upsertAppSetting,
  upsertCompanySettings,
} from "@/lib/settings-utils";

export const onboardingCompletedSettingKey = "app.onboardingCompleted";

export type OnboardingSettingsInput = {
  company: CompanySettings;
};

export async function isOnboardingCompleted() {
  return (await getAppSettingValue(onboardingCompletedSettingKey)) === "true";
}

export async function markOnboardingCompleted() {
  await upsertAppSetting(onboardingCompletedSettingKey, "true");
}

export async function saveOnboardingSettings(input: OnboardingSettingsInput) {
  await upsertCompanySettings(input.company);
  await markOnboardingCompleted();
}

export async function requireRequestOnboardingCompleted() {
  if (await isOnboardingCompleted()) {
    return null;
  }

  return new Response("Bu işlem için önce ilk kurulum tamamlanmalıdır.", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export function readOnboardingCompanySettings(formData: FormData): CompanySettings {
  const defaultCurrency =
    readText(formData, "app.defaultCurrency").toUpperCase() ||
    defaultCompanySettings["app.defaultCurrency"];
  const defaultVatRate =
    readText(formData, "app.defaultVatRate").replace(",", ".") ||
    defaultCompanySettings["app.defaultVatRate"];

  return {
    "company.name": readText(formData, "company.name"),
    "company.taxNumber": readText(formData, "company.taxNumber"),
    "company.taxOffice": readText(formData, "company.taxOffice"),
    "company.email": readText(formData, "company.email"),
    "company.phone": readText(formData, "company.phone"),
    "company.country": readText(formData, "company.country"),
    "company.city": readText(formData, "company.city"),
    "company.address": readText(formData, "company.address"),
    "app.defaultCurrency": defaultCurrency,
    "app.defaultVatRate": defaultVatRate,
    "company.notes": defaultCompanySettings["company.notes"],
  };
}

export function validateOnboardingCompanySettings(settings: CompanySettings) {
  const errors: string[] = [];
  const email = settings["company.email"];
  const vatRate = Number(settings["app.defaultVatRate"]);

  if (!settings["company.name"]) {
    errors.push("Şirket adı boş olamaz.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Geçerli bir e-posta adresi girin.");
  }

  if (!/^[A-Z]{3}$/.test(settings["app.defaultCurrency"])) {
    errors.push("Varsayılan para birimi TRY, USD veya EUR olmalıdır.");
  }

  if (!Number.isFinite(vatRate) || vatRate < 0) {
    errors.push("Varsayılan KDV oranı negatif olmayan sayısal bir değer olmalıdır.");
  }

  return errors;
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
