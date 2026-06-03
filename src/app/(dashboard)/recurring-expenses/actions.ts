"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    errors.title = "Gider adı boş olamaz.";
  }

  let amount: Prisma.Decimal | null = null;

  if (!amountValue) {
    errors.amount = "Tutar girilmeli.";
  } else {
    const numericAmount = Number(amountValue);

    if (Number.isNaN(numericAmount)) {
      errors.amount = "Tutar sayı olmalı.";
    } else if (numericAmount <= 0) {
      errors.amount = "Tutar 0'dan büyük olmalı.";
    } else {
      amount = new Prisma.Decimal(amountValue);
    }
  }

  const dayOfMonth = Number(dayOfMonthValue);

  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    errors.dayOfMonth = "Ayın günü 1-31 arasında olmalı.";
  }

  const startDate = parseDate(startDateValue);

  if (!startDate) {
    errors.startDate = "Başlangıç tarihi boş olamaz.";
  }

  const endDate = parseDate(endDateValue);

  if (endDateValue && !endDate) {
    errors.endDate = "Geçerli bir bitiş tarihi girin.";
  }

  if (startDate && endDate && endDate < startDate) {
    errors.endDate = "Bitiş tarihi başlangıç tarihinden önce olamaz.";
  }

  if (categoryId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true },
    });

    if (!category) {
      errors.categoryId = "Geçerli bir kategori seçin.";
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
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let recurringExpenseId: string;

  try {
    const recurringExpense = await prisma.recurringExpense.create({
      data: parsed.data,
      select: { id: true },
    });
    recurringExpenseId = recurringExpense.id;
  } catch {
    return { message: "Sabit gider kaydı oluşturulurken bir hata oluştu." };
  }

  revalidatePath("/recurring-expenses");
  redirect(`/recurring-expenses/${recurringExpenseId}`);
}

export async function updateRecurringExpenseAction(
  recurringExpenseId: string,
  _previousState: RecurringExpenseFormState,
  formData: FormData,
): Promise<RecurringExpenseFormState> {
  const parsed = await parseRecurringExpenseForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  try {
    await prisma.recurringExpense.update({
      where: { id: recurringExpenseId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });
  } catch {
    return { message: "Sabit gider kaydı güncellenirken bir hata oluştu." };
  }

  revalidatePath("/recurring-expenses");
  revalidatePath(`/recurring-expenses/${recurringExpenseId}`);
  redirect(`/recurring-expenses/${recurringExpenseId}`);
}

export async function deleteRecurringExpenseAction(recurringExpenseId: string) {
  try {
    await prisma.recurringExpense.update({
      where: { id: recurringExpenseId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true },
    });
  } catch {
    redirect(`/recurring-expenses/${recurringExpenseId}?error=delete`);
  }

  revalidatePath("/recurring-expenses");
  redirect("/recurring-expenses");
}
