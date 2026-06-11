"use server";

import { CompanyType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";

export type CompanyFormState = {
  message?: string;
  errors?: Partial<Record<CompanyFormField, string>>;
};

type CompanyFormField =
  | "name"
  | "type"
  | "taxNumber"
  | "taxOffice"
  | "email"
  | "phone"
  | "country"
  | "city"
  | "address"
  | "defaultCurrency"
  | "riskLimit"
  | "paymentTermDays"
  | "notes";

type CompanyPayload = {
  name: string;
  type: CompanyType;
  taxNumber: string | null;
  taxOffice: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  defaultCurrency: string;
  riskLimit: Prisma.Decimal | null;
  paymentTermDays: number | null;
  notes: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: CompanyFormField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function parseCompanyForm(formData: FormData): {
  data?: CompanyPayload;
  errors: CompanyFormState["errors"];
} {
  const errors: CompanyFormState["errors"] = {};
  const name = readText(formData, "name");
  const type = readText(formData, "type");
  const email = readText(formData, "email");
  const defaultCurrency = readText(formData, "defaultCurrency").toUpperCase() || "TRY";
  const riskLimitValue = readText(formData, "riskLimit").replace(",", ".");
  const paymentTermDaysValue = readText(formData, "paymentTermDays");

  if (!name) {
    errors.name = "Firma adı boş olamaz.";
  }

  if (!type || !Object.values(CompanyType).includes(type as CompanyType)) {
    errors.type = "Cari tipi seçilmeli.";
  }

  if (email && !emailPattern.test(email)) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }

  let riskLimit: Prisma.Decimal | null = null;

  if (riskLimitValue) {
    const parsedRiskLimit = Number(riskLimitValue);

    if (Number.isNaN(parsedRiskLimit)) {
      errors.riskLimit = "Risk limiti sayı olmalı.";
    } else if (parsedRiskLimit < 0) {
      errors.riskLimit = "Risk limiti negatif olamaz.";
    } else {
      riskLimit = new Prisma.Decimal(riskLimitValue);
    }
  }

  let paymentTermDays: number | null = null;

  if (paymentTermDaysValue) {
    const parsedPaymentTermDays = Number(paymentTermDaysValue);

    if (!Number.isInteger(parsedPaymentTermDays)) {
      errors.paymentTermDays = "Vade günü tam sayı olmalı.";
    } else if (parsedPaymentTermDays < 0) {
      errors.paymentTermDays = "Vade günü negatif olamaz.";
    } else {
      paymentTermDays = parsedPaymentTermDays;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      name,
      type: type as CompanyType,
      taxNumber: optionalText(readText(formData, "taxNumber")),
      taxOffice: optionalText(readText(formData, "taxOffice")),
      email: optionalText(email),
      phone: optionalText(readText(formData, "phone")),
      country: optionalText(readText(formData, "country")),
      city: optionalText(readText(formData, "city")),
      address: optionalText(readText(formData, "address")),
      defaultCurrency,
      riskLimit,
      paymentTermDays,
      notes: optionalText(readText(formData, "notes")),
    },
    errors,
  };
}

export async function createCompanyAction(
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const parsed = parseCompanyForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let companyId: string;

  try {
    const company = await prisma.company.create({
      data: parsed.data,
      select: { id: true },
    });
    companyId = company.id;
    await createAuditLog({
      entityType: "COMPANY",
      entityId: companyId,
      action: "CREATE",
      title: `Cari oluşturuldu: ${parsed.data.name}`,
      description: `${parsed.data.defaultCurrency} para birimli cari kaydı oluşturuldu.`,
      after: parsed.data,
    });
  } catch {
    return { message: "Cari kaydı oluşturulurken bir hata oluştu." };
  }

  revalidatePath("/companies");
  redirect(`/companies/${companyId}`);
}

export async function updateCompanyAction(
  companyId: string,
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const parsed = parseCompanyForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  try {
    const before = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    });

    await prisma.company.update({
      where: { id: companyId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });
    await createAuditLog({
      entityType: "COMPANY",
      entityId: companyId,
      action: "UPDATE",
      title: `Cari güncellendi: ${parsed.data.name}`,
      description: "Cari bilgilerinde değişiklik yapıldı.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Cari kaydı güncellenirken bir hata oluştu." };
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}

export async function deleteCompanyAction(companyId: string) {
  try {
    const company = await prisma.company.update({
      where: { id: companyId, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { id: true, name: true, type: true, defaultCurrency: true },
    });
    await createAuditLog({
      entityType: "COMPANY",
      entityId: company.id,
      action: "SOFT_DELETE",
      title: `Cari silindi: ${company.name}`,
      description: "Kayıt çöp kutusuna taşındı.",
      before: company,
    });
  } catch {
    redirect(`/companies/${companyId}?error=delete`);
  }

  revalidatePath("/companies");
  redirect("/companies");
}
