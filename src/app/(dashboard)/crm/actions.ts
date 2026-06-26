"use server";

import { CrmCompanyStatus, CrmReplyStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log-utils";
import { parseCrmDate, stringifyCrmTags } from "@/lib/crm-company-utils";
import { prisma } from "@/lib/prisma";

export type CrmCompanyFormState = {
  message?: string;
  errors?: Partial<Record<CrmCompanyFormField, string>>;
};

type CrmCompanyFormField =
  | "companyName"
  | "country"
  | "email"
  | "website"
  | "contactPerson"
  | "phone"
  | "sector"
  | "source"
  | "status"
  | "replyStatus"
  | "lastContactDate"
  | "followUpDate"
  | "tags"
  | "notes";

type CrmCompanyPayload = {
  companyName: string;
  country: string | null;
  email: string | null;
  website: string | null;
  contactPerson: string | null;
  phone: string | null;
  sector: string | null;
  source: string | null;
  status: CrmCompanyStatus;
  replyStatus: CrmReplyStatus;
  lastContactDate: Date | null;
  followUpDate: Date | null;
  notes: string | null;
  tagsJson: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: CrmCompanyFormField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function normalizeWebsite(value: string) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function parseCrmCompanyForm(formData: FormData): {
  data?: CrmCompanyPayload;
  errors: CrmCompanyFormState["errors"];
} {
  const errors: CrmCompanyFormState["errors"] = {};
  const companyName = readText(formData, "companyName");
  const email = readText(formData, "email");
  const website = readText(formData, "website");
  const status = readText(formData, "status");
  const replyStatus = readText(formData, "replyStatus");
  const lastContactDateValue = readText(formData, "lastContactDate");
  const followUpDateValue = readText(formData, "followUpDate");

  if (!companyName) {
    errors.companyName = "Firma adı boş olamaz.";
  }

  if (email && !emailPattern.test(email)) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }

  if (!status || !Object.values(CrmCompanyStatus).includes(status as CrmCompanyStatus)) {
    errors.status = "Durum seçilmeli.";
  }

  if (!replyStatus || !Object.values(CrmReplyStatus).includes(replyStatus as CrmReplyStatus)) {
    errors.replyStatus = "Cevap durumu seçilmeli.";
  }

  const lastContactDate = parseCrmDate(lastContactDateValue);
  const followUpDate = parseCrmDate(followUpDateValue);

  if (lastContactDateValue && !lastContactDate) {
    errors.lastContactDate = "Geçerli bir tarih girin.";
  }

  if (followUpDateValue && !followUpDate) {
    errors.followUpDate = "Geçerli bir tarih girin.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      companyName,
      country: optionalText(readText(formData, "country")),
      email: optionalText(email),
      website: normalizeWebsite(website),
      contactPerson: optionalText(readText(formData, "contactPerson")),
      phone: optionalText(readText(formData, "phone")),
      sector: optionalText(readText(formData, "sector")),
      source: optionalText(readText(formData, "source")),
      status: status as CrmCompanyStatus,
      replyStatus: replyStatus as CrmReplyStatus,
      lastContactDate,
      followUpDate,
      notes: optionalText(readText(formData, "notes")),
      tagsJson: stringifyCrmTags(readText(formData, "tags")),
    },
    errors,
  };
}

export async function createCrmCompanyAction(
  _previousState: CrmCompanyFormState,
  formData: FormData,
): Promise<CrmCompanyFormState> {
  const parsed = parseCrmCompanyForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let crmCompanyId: string;

  try {
    const crmCompany = await prisma.crmCompany.create({
      data: parsed.data,
      select: { id: true },
    });
    crmCompanyId = crmCompany.id;
    await createAuditLog({
      entityType: "CRM_COMPANY",
      entityId: crmCompanyId,
      action: "CREATE",
      title: `Firma takip kaydı oluşturuldu: ${parsed.data.companyName}`,
      description: "Dış ticaret firma takip kaydı oluşturuldu.",
      after: parsed.data,
    });
  } catch {
    return { message: "Firma takip kaydı oluşturulurken bir hata oluştu." };
  }

  revalidatePath("/crm");
  redirect(`/crm/${crmCompanyId}`);
}

export async function updateCrmCompanyAction(
  crmCompanyId: string,
  _previousState: CrmCompanyFormState,
  formData: FormData,
): Promise<CrmCompanyFormState> {
  const parsed = parseCrmCompanyForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  try {
    const before = await prisma.crmCompany.findFirst({
      where: { id: crmCompanyId, deletedAt: null },
    });

    await prisma.crmCompany.update({
      where: { id: crmCompanyId },
      data: parsed.data,
      select: { id: true },
    });
    await createAuditLog({
      entityType: "CRM_COMPANY",
      entityId: crmCompanyId,
      action: "UPDATE",
      title: `Firma takip kaydı güncellendi: ${parsed.data.companyName}`,
      description: "Firma takip bilgilerinde değişiklik yapıldı.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Firma takip kaydı güncellenirken bir hata oluştu." };
  }

  revalidatePath("/crm");
  revalidatePath(`/crm/${crmCompanyId}`);
  redirect(`/crm/${crmCompanyId}`);
}

export async function deleteCrmCompanyAction(crmCompanyId: string) {
  try {
    const crmCompany = await prisma.crmCompany.update({
      where: { id: crmCompanyId },
      data: { deletedAt: new Date() },
      select: { id: true, companyName: true },
    });
    await createAuditLog({
      entityType: "CRM_COMPANY",
      entityId: crmCompany.id,
      action: "SOFT_DELETE",
      title: `Firma takip kaydı silindi: ${crmCompany.companyName}`,
      description: "Firma takip kaydı çöp kutusu dışı pasif listeye taşındı.",
      before: crmCompany,
    });
  } catch {
    redirect(`/crm/${crmCompanyId}?error=delete`);
  }

  revalidatePath("/crm");
  redirect("/crm");
}
