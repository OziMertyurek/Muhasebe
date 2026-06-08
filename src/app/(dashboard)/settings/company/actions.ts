"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  defaultCompanySettings,
  type CompanySettings,
  upsertCompanySettings,
} from "@/lib/settings-utils";

export type CompanySettingsFormField =
  | "company.name"
  | "company.taxNumber"
  | "company.taxOffice"
  | "company.email"
  | "company.phone"
  | "company.country"
  | "company.city"
  | "company.address"
  | "app.defaultCurrency"
  | "app.defaultVatRate"
  | "company.notes";

export type CompanySettingsFormState = {
  message?: string;
  errors?: Partial<Record<CompanySettingsFormField, string>>;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: CompanySettingsFormField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseSettingsForm(formData: FormData): {
  data?: CompanySettings;
  errors: CompanySettingsFormState["errors"];
} {
  const errors: CompanySettingsFormState["errors"] = {};
  const email = readText(formData, "company.email");
  const defaultCurrency =
    readText(formData, "app.defaultCurrency").toUpperCase() ||
    defaultCompanySettings["app.defaultCurrency"];
  const defaultVatRate = readText(formData, "app.defaultVatRate").replace(",", ".");

  if (email && !emailPattern.test(email)) {
    errors["company.email"] = "Geçerli bir e-posta adresi girin.";
  }

  if (!defaultCurrency) {
    errors["app.defaultCurrency"] = "Para birimi boş olamaz.";
  } else if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
    errors["app.defaultCurrency"] = "Para birimi 3 harfli kod olmalı. Örn: TRY";
  }

  if (defaultVatRate) {
    const parsedVatRate = Number(defaultVatRate);

    if (Number.isNaN(parsedVatRate)) {
      errors["app.defaultVatRate"] = "KDV oranı sayısal olmalı.";
    } else if (parsedVatRate < 0) {
      errors["app.defaultVatRate"] = "KDV oranı negatif olamaz.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      "company.name": readText(formData, "company.name"),
      "company.taxNumber": readText(formData, "company.taxNumber"),
      "company.taxOffice": readText(formData, "company.taxOffice"),
      "company.email": email,
      "company.phone": readText(formData, "company.phone"),
      "company.country": readText(formData, "company.country"),
      "company.city": readText(formData, "company.city"),
      "company.address": readText(formData, "company.address"),
      "app.defaultCurrency": defaultCurrency,
      "app.defaultVatRate": defaultVatRate || defaultCompanySettings["app.defaultVatRate"],
      "company.notes": readText(formData, "company.notes"),
    },
    errors,
  };
}

export async function updateCompanySettingsAction(
  _previousState: CompanySettingsFormState,
  formData: FormData,
): Promise<CompanySettingsFormState> {
  const parsed = parseSettingsForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  try {
    await upsertCompanySettings(parsed.data);
  } catch {
    return { message: "Şirket ayarları kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/company");
  redirect("/settings/company?saved=1");
}
