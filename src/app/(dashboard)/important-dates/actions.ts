"use server";

import {
  ImportantDateCategory,
  Priority,
  ReminderStatus,
  RepeatType,
} from "#prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";

export type ImportantDateFormState = {
  message?: string;
  errors?: Partial<Record<ImportantDateFormField, string>>;
};

type ImportantDateFormField =
  | "title"
  | "description"
  | "category"
  | "date"
  | "time"
  | "repeatType"
  | "reminderDaysBefore"
  | "priority"
  | "status"
  | "companyId"
  | "invoiceId"
  | "expenseId"
  | "financialAccountId";

type ImportantDateFormErrors = NonNullable<ImportantDateFormState["errors"]>;

type ImportantDatePayload = {
  title: string;
  description: string | null;
  category: ImportantDateCategory;
  date: Date;
  time: string | null;
  repeatType: RepeatType;
  reminderDaysBefore: number | null;
  priority: Priority;
  status: ReminderStatus;
  companyId: string | null;
  invoiceId: string | null;
  expenseId: string | null;
  financialAccountId: string | null;
};

function readText(formData: FormData, key: ImportantDateFormField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: string,
): T[keyof T] | null {
  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : null;
}

async function validateRelations(
  data: Pick<
    ImportantDatePayload,
    "companyId" | "invoiceId" | "expenseId" | "financialAccountId"
  >,
  errors: ImportantDateFormErrors,
) {
  const [company, invoice, expense, financialAccount] = await Promise.all([
    data.companyId
      ? prisma.company.findFirst({
          where: { id: data.companyId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    data.invoiceId
      ? prisma.invoice.findFirst({
          where: { id: data.invoiceId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    data.expenseId
      ? prisma.expense.findFirst({
          where: { id: data.expenseId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    data.financialAccountId
      ? prisma.financialAccount.findFirst({
          where: { id: data.financialAccountId, deletedAt: null, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (data.companyId && !company) {
    errors.companyId = "GeÃ§erli bir cari firma seÃ§in.";
  }

  if (data.invoiceId && !invoice) {
    errors.invoiceId = "GeÃ§erli bir fatura seÃ§in.";
  }

  if (data.expenseId && !expense) {
    errors.expenseId = "GeÃ§erli bir gider seÃ§in.";
  }

  if (data.financialAccountId && !financialAccount) {
    errors.financialAccountId = "GeÃ§erli bir finansal hesap seÃ§in.";
  }
}

async function parseImportantDateForm(formData: FormData): Promise<{
  data?: ImportantDatePayload;
  errors: ImportantDateFormErrors;
}> {
  const errors: ImportantDateFormErrors = {};
  const title = readText(formData, "title");
  const description = optionalText(readText(formData, "description"));
  const category = getEnumValue(ImportantDateCategory, readText(formData, "category"));
  const dateValue = readText(formData, "date");
  const time = optionalText(readText(formData, "time"));
  const repeatType = getEnumValue(RepeatType, readText(formData, "repeatType")) ?? "NONE";
  const reminderDaysValue = readText(formData, "reminderDaysBefore");
  const priority = getEnumValue(Priority, readText(formData, "priority")) ?? "NORMAL";
  const status = getEnumValue(ReminderStatus, readText(formData, "status")) ?? "PENDING";
  const companyId = optionalText(readText(formData, "companyId"));
  const invoiceId = optionalText(readText(formData, "invoiceId"));
  const expenseId = optionalText(readText(formData, "expenseId"));
  const financialAccountId = optionalText(readText(formData, "financialAccountId"));

  if (!title) {
    errors.title = "BaÅŸlÄ±k boÅŸ olamaz.";
  }

  if (!category) {
    errors.category = "Kategori seÃ§ilmeli.";
  }

  const date = parseDate(dateValue);

  if (!date) {
    errors.date = "Tarih boÅŸ olamaz.";
  }

  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    errors.time = "Saat HH:mm formatÄ±nda olmalÄ±.";
  }

  let reminderDaysBefore: number | null = null;

  if (reminderDaysValue) {
    const parsedReminderDays = Number(reminderDaysValue);

    if (!Number.isInteger(parsedReminderDays)) {
      errors.reminderDaysBefore = "HatÄ±rlatma gÃ¼nÃ¼ tam sayÄ± olmalÄ±.";
    } else if (parsedReminderDays < 0) {
      errors.reminderDaysBefore = "HatÄ±rlatma gÃ¼nÃ¼ negatif olamaz.";
    } else {
      reminderDaysBefore = parsedReminderDays;
    }
  }

  const relationData = { companyId, invoiceId, expenseId, financialAccountId };
  await validateRelations(relationData, errors);

  if (Object.keys(errors).length > 0 || !category || !date) {
    return { errors };
  }

  return {
    data: {
      title,
      description,
      category,
      date,
      time,
      repeatType,
      reminderDaysBefore,
      priority,
      status,
      ...relationData,
    },
    errors,
  };
}

export async function createImportantDateAction(
  _previousState: ImportantDateFormState,
  formData: FormData,
): Promise<ImportantDateFormState> {
  const parsed = await parseImportantDateForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  let importantDateId: string;

  try {
    const importantDate = await prisma.importantDate.create({
      data: parsed.data,
      select: { id: true },
    });
    importantDateId = importantDate.id;
    await createAuditLog({
      entityType: "IMPORTANT_DATE",
      entityId: importantDateId,
      action: "CREATE",
      title: `Ã–nemli tarih oluÅŸturuldu: ${parsed.data.title}`,
      description: "HatÄ±rlatma kaydÄ± oluÅŸturuldu.",
      after: parsed.data,
    });
  } catch {
    return { message: "Ã–nemli tarih kaydÄ± oluÅŸturulurken bir hata oluÅŸtu." };
  }

  revalidatePath("/important-dates");
  redirect(`/important-dates/${importantDateId}`);
}

export async function updateImportantDateAction(
  importantDateId: string,
  _previousState: ImportantDateFormState,
  formData: FormData,
): Promise<ImportantDateFormState> {
  const parsed = await parseImportantDateForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  try {
    const before = await prisma.importantDate.findFirst({
      where: { id: importantDateId, deletedAt: null },
    });

    await prisma.importantDate.update({
      where: { id: importantDateId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });
    await createAuditLog({
      entityType: "IMPORTANT_DATE",
      entityId: importantDateId,
      action: "UPDATE",
      title: `Ã–nemli tarih gÃ¼ncellendi: ${parsed.data.title}`,
      description: "HatÄ±rlatma bilgilerinde deÄŸiÅŸiklik yapÄ±ldÄ±.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Ã–nemli tarih kaydÄ± gÃ¼ncellenirken bir hata oluÅŸtu." };
  }

  revalidatePath("/important-dates");
  revalidatePath(`/important-dates/${importantDateId}`);
  redirect(`/important-dates/${importantDateId}`);
}

export async function deleteImportantDateAction(importantDateId: string) {
  try {
    const importantDate = await prisma.importantDate.update({
      where: { id: importantDateId, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { id: true, title: true, category: true, status: true, date: true },
    });
    await createAuditLog({
      entityType: "IMPORTANT_DATE",
      entityId: importantDate.id,
      action: "SOFT_DELETE",
      title: `Ã–nemli tarih silindi: ${importantDate.title}`,
      description: "KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±ndÄ±.",
      before: importantDate,
    });
  } catch {
    redirect(`/important-dates/${importantDateId}?error=delete`);
  }

  revalidatePath("/important-dates");
  redirect("/important-dates");
}

export async function markImportantDateDoneAction(importantDateId: string) {
  try {
    const importantDate = await prisma.importantDate.update({
      where: { id: importantDateId, deletedAt: null },
      data: { status: "DONE" },
      select: { id: true, title: true, status: true },
    });
    await createAuditLog({
      entityType: "IMPORTANT_DATE",
      entityId: importantDate.id,
      action: "STATUS_CHANGE",
      title: `Ã–nemli tarih tamamlandÄ±: ${importantDate.title}`,
      description: "HatÄ±rlatma durumu TamamlandÄ± olarak deÄŸiÅŸtirildi.",
      after: importantDate,
    });
  } catch {
    redirect(`/important-dates/${importantDateId}?error=status`);
  }

  revalidatePath("/important-dates");
  revalidatePath(`/important-dates/${importantDateId}`);
}

export async function markImportantDatePendingAction(importantDateId: string) {
  try {
    const importantDate = await prisma.importantDate.update({
      where: { id: importantDateId, deletedAt: null },
      data: { status: "PENDING" },
      select: { id: true, title: true, status: true },
    });
    await createAuditLog({
      entityType: "IMPORTANT_DATE",
      entityId: importantDate.id,
      action: "STATUS_CHANGE",
      title: `Ã–nemli tarih bekliyor yapÄ±ldÄ±: ${importantDate.title}`,
      description: "HatÄ±rlatma durumu Bekliyor olarak deÄŸiÅŸtirildi.",
      after: importantDate,
    });
  } catch {
    redirect(`/important-dates/${importantDateId}?error=status`);
  }

  revalidatePath("/important-dates");
  revalidatePath(`/important-dates/${importantDateId}`);
}
