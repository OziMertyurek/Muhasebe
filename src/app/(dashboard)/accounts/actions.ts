"use server";

import { FinancialAccountType, Prisma } from "#prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log-utils";
import { cancelCreditCardReminders, syncCreditCardReminders } from "@/lib/auto-reminder-utils";
import { prisma } from "@/lib/prisma";

export type AccountFormState = {
  message?: string;
  errors?: Partial<Record<AccountFormField, string>>;
};

type AccountFormField =
  | "name"
  | "type"
  | "bankName"
  | "iban"
  | "currency"
  | "openingBalance"
  | "currentBalance"
  | "creditLimit"
  | "statementDay"
  | "dueDay"
  | "isActive"
  | "notes";

type AccountFormErrors = NonNullable<AccountFormState["errors"]>;

type AccountPayload = {
  name: string;
  type: FinancialAccountType;
  bankName: string | null;
  iban: string | null;
  currency: string;
  openingBalance: Prisma.Decimal;
  currentBalance: Prisma.Decimal;
  creditLimit: Prisma.Decimal | null;
  statementDay: number | null;
  dueDay: number | null;
  isActive: boolean;
  notes: string | null;
};

function readText(formData: FormData, key: AccountFormField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function parseDecimal(
  value: string,
  label: string,
  field: AccountFormField,
  errors: AccountFormErrors,
  options: { defaultValue?: string; allowNegative?: boolean } = {},
) {
  const normalizedValue = value.replace(",", ".") || options.defaultValue;

  if (!normalizedValue) {
    errors[field] = `${label} girilmeli.`;
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (Number.isNaN(numericValue)) {
    errors[field] = `${label} sayÄ± olmalÄ±.`;
    return null;
  }

  if (!options.allowNegative && numericValue < 0) {
    errors[field] = `${label} negatif olamaz.`;
    return null;
  }

  return new Prisma.Decimal(normalizedValue);
}

function parseOptionalDay(
  value: string,
  label: string,
  field: AccountFormField,
  errors: AccountFormErrors,
) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 31) {
    errors[field] = `${label} 1-31 arasÄ±nda olmalÄ±.`;
    return null;
  }

  return numericValue;
}

function parseAccountForm(formData: FormData): {
  data?: AccountPayload;
  errors: AccountFormErrors;
} {
  const errors: AccountFormErrors = {};
  const name = readText(formData, "name");
  const typeValue = readText(formData, "type");
  const currency = readText(formData, "currency").toUpperCase() || "TRY";
  const openingBalance = parseDecimal(
    readText(formData, "openingBalance"),
    "AÃ§Ä±lÄ±ÅŸ bakiyesi",
    "openingBalance",
    errors,
    { defaultValue: "0", allowNegative: true },
  );
  const currentBalanceValue = readText(formData, "currentBalance");
  const currentBalance = parseDecimal(
    currentBalanceValue || openingBalance?.toString() || "0",
    "Mevcut bakiye",
    "currentBalance",
    errors,
    { defaultValue: "0", allowNegative: true },
  );
  const creditLimitValue = readText(formData, "creditLimit");
  const creditLimit = creditLimitValue
    ? parseDecimal(creditLimitValue, "Kredi limiti", "creditLimit", errors)
    : null;
  const statementDay = parseOptionalDay(
    readText(formData, "statementDay"),
    "Hesap kesim gÃ¼nÃ¼",
    "statementDay",
    errors,
  );
  const dueDay = parseOptionalDay(readText(formData, "dueDay"), "Son Ã¶deme gÃ¼nÃ¼", "dueDay", errors);

  if (!name) {
    errors.name = "Hesap adÄ± boÅŸ olamaz.";
  }

  if (!typeValue || !Object.values(FinancialAccountType).includes(typeValue as FinancialAccountType)) {
    errors.type = "Hesap tipi seÃ§ilmeli.";
  }

  if (Object.keys(errors).length > 0 || !openingBalance || !currentBalance) {
    return { errors };
  }

  return {
    data: {
      name,
      type: typeValue as FinancialAccountType,
      bankName: optionalText(readText(formData, "bankName")),
      iban: optionalText(readText(formData, "iban")),
      currency,
      openingBalance,
      currentBalance,
      creditLimit,
      statementDay,
      dueDay,
      isActive: formData.get("isActive") === "on",
      notes: optionalText(readText(formData, "notes")),
    },
    errors,
  };
}

export async function createAccountAction(
  _previousState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = parseAccountForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  let accountId: string;

  try {
    const account = await prisma.financialAccount.create({
      data: parsed.data,
      select: { id: true, name: true, type: true, statementDay: true, dueDay: true },
    });
    accountId = account.id;
    await createAuditLog({
      entityType: "FINANCIAL_ACCOUNT",
      entityId: accountId,
      action: "CREATE",
      title: `Finansal hesap oluÅŸturuldu: ${parsed.data.name}`,
      description: `${parsed.data.currency} para birimli hesap oluÅŸturuldu.`,
      after: parsed.data,
    });
    await syncCreditCardReminders(account);
  } catch {
    return { message: "Hesap kaydÄ± oluÅŸturulurken bir hata oluÅŸtu." };
  }

  revalidatePath("/accounts");
  revalidatePath("/important-dates");
  redirect(`/accounts/${accountId}`);
}

export async function updateAccountAction(
  accountId: string,
  _previousState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = parseAccountForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  try {
    const before = await prisma.financialAccount.findFirst({
      where: { id: accountId, deletedAt: null },
    });

    await prisma.financialAccount.update({
      where: { id: accountId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });
    await syncCreditCardReminders({
      id: accountId,
      name: parsed.data.name,
      type: parsed.data.type,
      statementDay: parsed.data.statementDay,
      dueDay: parsed.data.dueDay,
    });
    await createAuditLog({
      entityType: "FINANCIAL_ACCOUNT",
      entityId: accountId,
      action: "UPDATE",
      title: `Finansal hesap gÃ¼ncellendi: ${parsed.data.name}`,
      description: "Finansal hesap bilgilerinde deÄŸiÅŸiklik yapÄ±ldÄ±.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Hesap kaydÄ± gÃ¼ncellenirken bir hata oluÅŸtu." };
  }

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/important-dates");
  redirect(`/accounts/${accountId}`);
}

export async function deleteAccountAction(accountId: string) {
  try {
    const account = await prisma.financialAccount.update({
      where: { id: accountId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, name: true, type: true, currency: true },
    });
    await createAuditLog({
      entityType: "FINANCIAL_ACCOUNT",
      entityId: account.id,
      action: "SOFT_DELETE",
      title: `Finansal hesap silindi: ${account.name}`,
      description: "KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±ndÄ±.",
      before: account,
    });
    await cancelCreditCardReminders(account.id, "Finansal hesap silindiÄŸi iÃ§in kredi kartÄ± hatÄ±rlatmalarÄ± iptal edildi.");
  } catch {
    redirect(`/accounts/${accountId}?error=delete`);
  }

  revalidatePath("/accounts");
  revalidatePath("/important-dates");
  redirect("/accounts");
}
