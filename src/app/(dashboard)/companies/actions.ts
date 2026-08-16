"use server";

import { CompanyType, Prisma } from "#prisma/client";
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
    errors.name = "Firma adÄ± boÅŸ olamaz.";
  }

  if (!type || !Object.values(CompanyType).includes(type as CompanyType)) {
    errors.type = "Cari tipi seÃ§ilmeli.";
  }

  if (email && !emailPattern.test(email)) {
    errors.email = "GeÃ§erli bir e-posta adresi girin.";
  }

  let riskLimit: Prisma.Decimal | null = null;

  if (riskLimitValue) {
    const parsedRiskLimit = Number(riskLimitValue);

    if (Number.isNaN(parsedRiskLimit)) {
      errors.riskLimit = "Risk limiti sayÄ± olmalÄ±.";
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
      errors.paymentTermDays = "Vade gÃ¼nÃ¼ tam sayÄ± olmalÄ±.";
    } else if (parsedPaymentTermDays < 0) {
      errors.paymentTermDays = "Vade gÃ¼nÃ¼ negatif olamaz.";
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
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
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
      title: `Cari oluÅŸturuldu: ${parsed.data.name}`,
      description: `${parsed.data.defaultCurrency} para birimli cari kaydÄ± oluÅŸturuldu.`,
      after: parsed.data,
    });
  } catch {
    return { message: "Cari kaydÄ± oluÅŸturulurken bir hata oluÅŸtu." };
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
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
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
      title: `Cari gÃ¼ncellendi: ${parsed.data.name}`,
      description: "Cari bilgilerinde deÄŸiÅŸiklik yapÄ±ldÄ±.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Cari kaydÄ± gÃ¼ncellenirken bir hata oluÅŸtu." };
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}

export async function deleteCompanyAction(companyId: string) {
  const linkedCounts = await prisma.$transaction([
    prisma.invoice.count({ where: { companyId, deletedAt: null } }),
    prisma.payment.count({ where: { companyId, deletedAt: null } }),
    prisma.expense.count({ where: { companyId, deletedAt: null } }),
    prisma.fileAttachment.count({ where: { companyId, deletedAt: null } }),
  ]);

  if (linkedCounts.some((count) => count > 0)) {
    redirect(`/companies/${companyId}?error=delete-linked`);
  }

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
      description: "KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±ndÄ±.",
      before: company,
    });
  } catch {
    redirect(`/companies/${companyId}?error=delete`);
  }

  revalidatePath("/companies");
  redirect("/companies");
}
