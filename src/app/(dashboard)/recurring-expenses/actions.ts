"use server";

import { Prisma } from "#prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log-utils";
import { syncRecurringExpenseReminder } from "@/lib/auto-reminder-utils";
import { ensureDefaultExpenseCategories } from "@/lib/expense-categories";
import { prisma } from "@/lib/prisma";

export type RecurringExpenseFormState = {
  message?: string;
  errors?: Partial<Record<RecurringExpenseFormField, string>>;
};

type RecurringExpenseFormField =
  | "title"
  | "categoryId"
  | "amount"
  | "currency"
  | "dayOfMonth"
  | "startDate"
  | "endDate"
  | "isActive"
  | "description";

type RecurringExpenseFormErrors = NonNullable<RecurringExpenseFormState["errors"]>;

type RecurringExpensePayload = {
  title: string;
  categoryId: string | null;
  amount: Prisma.Decimal;
  currency: string;
  dayOfMonth: number;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  description: string | null;
};

function readText(formData: FormData, key: RecurringExpenseFormField) {
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

async function parseRecurringExpenseForm(formData: FormData): Promise<{
  data?: RecurringExpensePayload;
  errors: RecurringExpenseFormErrors;
}> {
  await ensureDefaultExpenseCategories();

  const errors: RecurringExpenseFormErrors = {};
  const title = readText(formData, "title");
  const categoryId = optionalText(readText(formData, "categoryId"));
  const amountValue = readText(formData, "amount").replace(",", ".");
  const currency = readText(formData, "currency").toUpperCase() || "TRY";
  const dayOfMonthValue = readText(formData, "dayOfMonth");
  const startDateValue = readText(formData, "startDate");
  const endDateValue = readText(formData, "endDate");

  if (!title) {
    errors.title = "Gider adÄ± boÅŸ olamaz.";
  }

  let amount: Prisma.Decimal | null = null;

  if (!amountValue) {
    errors.amount = "Tutar girilmeli.";
  } else {
    const numericAmount = Number(amountValue);

    if (Number.isNaN(numericAmount)) {
      errors.amount = "Tutar sayÄ± olmalÄ±.";
    } else if (numericAmount <= 0) {
      errors.amount = "Tutar 0'dan bÃ¼yÃ¼k olmalÄ±.";
    } else {
      amount = new Prisma.Decimal(amountValue);
    }
  }

  const dayOfMonth = Number(dayOfMonthValue);

  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    errors.dayOfMonth = "AyÄ±n gÃ¼nÃ¼ 1-31 arasÄ±nda olmalÄ±.";
  }

  const startDate = parseDate(startDateValue);

  if (!startDate) {
    errors.startDate = "BaÅŸlangÄ±Ã§ tarihi boÅŸ olamaz.";
  }

  const endDate = parseDate(endDateValue);

  if (endDateValue && !endDate) {
    errors.endDate = "GeÃ§erli bir bitiÅŸ tarihi girin.";
  }

  if (startDate && endDate && endDate < startDate) {
    errors.endDate = "BitiÅŸ tarihi baÅŸlangÄ±Ã§ tarihinden Ã¶nce olamaz.";
  }

  if (categoryId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true },
    });

    if (!category) {
      errors.categoryId = "GeÃ§erli bir kategori seÃ§in.";
    }
  }

  if (Object.keys(errors).length > 0 || !amount || !startDate) {
    return { errors };
  }

  return {
    data: {
      title,
      categoryId,
      amount,
      currency,
      dayOfMonth,
      startDate,
      endDate,
      isActive: formData.get("isActive") === "on",
      description: optionalText(readText(formData, "description")),
    },
    errors,
  };
}

export async function createRecurringExpenseAction(
  _previousState: RecurringExpenseFormState,
  formData: FormData,
): Promise<RecurringExpenseFormState> {
  const parsed = await parseRecurringExpenseForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  let recurringExpenseId: string;

  try {
    const recurringExpense = await prisma.recurringExpense.create({
      data: parsed.data,
      select: { id: true, title: true, dayOfMonth: true, isActive: true, deletedAt: true },
    });
    recurringExpenseId = recurringExpense.id;
    await createAuditLog({
      entityType: "RECURRING_EXPENSE",
      entityId: recurringExpenseId,
      action: "CREATE",
      title: `Sabit gider oluÅŸturuldu: ${parsed.data.title}`,
      description: `${parsed.data.amount.toString()} ${parsed.data.currency} tutarlÄ± sabit gider oluÅŸturuldu.`,
      after: parsed.data,
    });
    await syncRecurringExpenseReminder(recurringExpense);
  } catch {
    return { message: "Sabit gider kaydÄ± oluÅŸturulurken bir hata oluÅŸtu." };
  }

  revalidatePath("/recurring-expenses");
  revalidatePath("/important-dates");
  redirect(`/recurring-expenses/${recurringExpenseId}`);
}

export async function updateRecurringExpenseAction(
  recurringExpenseId: string,
  _previousState: RecurringExpenseFormState,
  formData: FormData,
): Promise<RecurringExpenseFormState> {
  const parsed = await parseRecurringExpenseForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  try {
    const before = await prisma.recurringExpense.findFirst({
      where: { id: recurringExpenseId, deletedAt: null },
    });

    const recurringExpense = await prisma.recurringExpense.update({
      where: { id: recurringExpenseId, deletedAt: null },
      data: parsed.data,
      select: { id: true, title: true, dayOfMonth: true, isActive: true, deletedAt: true },
    });
    await syncRecurringExpenseReminder(recurringExpense);
    await createAuditLog({
      entityType: "RECURRING_EXPENSE",
      entityId: recurringExpenseId,
      action: "UPDATE",
      title: `Sabit gider gÃ¼ncellendi: ${parsed.data.title}`,
      description: "Sabit gider bilgilerinde deÄŸiÅŸiklik yapÄ±ldÄ±.",
      before,
      after: parsed.data,
    });
  } catch {
    return { message: "Sabit gider kaydÄ± gÃ¼ncellenirken bir hata oluÅŸtu." };
  }

  revalidatePath("/recurring-expenses");
  revalidatePath(`/recurring-expenses/${recurringExpenseId}`);
  revalidatePath("/important-dates");
  redirect(`/recurring-expenses/${recurringExpenseId}`);
}

export async function deleteRecurringExpenseAction(recurringExpenseId: string) {
  try {
    const recurringExpense = await prisma.recurringExpense.update({
      where: { id: recurringExpenseId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        dayOfMonth: true,
        isActive: true,
        deletedAt: true,
      },
    });
    await syncRecurringExpenseReminder(recurringExpense);
    await createAuditLog({
      entityType: "RECURRING_EXPENSE",
      entityId: recurringExpense.id,
      action: "SOFT_DELETE",
      title: `Sabit gider silindi: ${recurringExpense.title}`,
      description: "KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±ndÄ±.",
      before: recurringExpense,
    });
  } catch {
    redirect(`/recurring-expenses/${recurringExpenseId}?error=delete`);
  }

  revalidatePath("/recurring-expenses");
  revalidatePath("/important-dates");
  redirect("/recurring-expenses");
}
