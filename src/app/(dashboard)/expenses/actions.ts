"use server";

import { ExpenseStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDefaultExpenseCategories } from "@/lib/expense-categories";
import { prisma } from "@/lib/prisma";

export type ExpenseFormState = {
  message?: string;
  errors?: Partial<Record<ExpenseFormField, string>>;
};

type ExpenseFormField =
  | "title"
  | "categoryId"
  | "companyId"
  | "financialAccountId"
  | "amount"
  | "currency"
  | "expenseDate"
  | "status"
  | "paymentDate"
  | "description";

type ExpenseFormErrors = NonNullable<ExpenseFormState["errors"]>;

type ExpensePayload = {
  title: string;
  categoryId: string | null;
  companyId: string | null;
  financialAccountId: string | null;
  amount: Prisma.Decimal;
  currency: string;
  expenseDate: Date;
  status: ExpenseStatus;
  paymentDate: Date | null;
  description: string | null;
};

function readText(formData: FormData, key: ExpenseFormField) {
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

async function parseExpenseForm(formData: FormData): Promise<{
  data?: ExpensePayload;
  errors: ExpenseFormErrors;
}> {
  await ensureDefaultExpenseCategories();

  const errors: ExpenseFormErrors = {};
  const title = readText(formData, "title");
  const categoryId = optionalText(readText(formData, "categoryId"));
  const companyId = optionalText(readText(formData, "companyId"));
  const financialAccountId = optionalText(readText(formData, "financialAccountId"));
  const amountValue = readText(formData, "amount").replace(",", ".");
  const currency = readText(formData, "currency").toUpperCase() || "TRY";
  const expenseDateValue = readText(formData, "expenseDate");
  const statusValue = readText(formData, "status") || "UNPAID";
  const paymentDateValue = readText(formData, "paymentDate");

  if (!title) {
    errors.title = "Gider başlığı boş olamaz.";
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

  const expenseDate = parseDate(expenseDateValue);

  if (!expenseDate) {
    errors.expenseDate = "Gider tarihi boş olamaz.";
  }

  if (!Object.values(ExpenseStatus).includes(statusValue as ExpenseStatus)) {
    errors.status = "Geçerli bir gider durumu seçin.";
  }

  const paymentDate = parseDate(paymentDateValue);

  if (paymentDateValue && !paymentDate) {
    errors.paymentDate = "Geçerli bir ödeme tarihi girin.";
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

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      errors.companyId = "Silinmiş veya geçersiz cari seçilemez.";
    }
  }

  if (financialAccountId) {
    const financialAccount = await prisma.financialAccount.findFirst({
      where: { id: financialAccountId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!financialAccount) {
      errors.financialAccountId = "Silinmiş veya geçersiz finansal hesap seçilemez.";
    }
  }

  if (Object.keys(errors).length > 0 || !amount || !expenseDate) {
    return { errors };
  }

  return {
    data: {
      title,
      categoryId,
      companyId,
      financialAccountId,
      amount,
      currency,
      expenseDate,
      status: statusValue as ExpenseStatus,
      paymentDate,
      description: optionalText(readText(formData, "description")),
    },
    errors,
  };
}

export async function createExpenseAction(
  _previousState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const parsed = await parseExpenseForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let expenseId: string;

  try {
    const expense = await prisma.expense.create({
      data: parsed.data,
      select: { id: true },
    });
    expenseId = expense.id;
  } catch {
    return { message: "Gider kaydı oluşturulurken bir hata oluştu." };
  }

  revalidatePath("/expenses");
  if (parsed.data.financialAccountId) {
    revalidatePath(`/accounts/${parsed.data.financialAccountId}`);
  }
  redirect(`/expenses/${expenseId}`);
}

export async function updateExpenseAction(
  expenseId: string,
  _previousState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const parsed = await parseExpenseForm(formData);

  if (!parsed.data) {
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let previousFinancialAccountId: string | null = null;

  try {
    const existingExpense = await prisma.expense.findFirst({
      where: { id: expenseId, deletedAt: null },
      select: { financialAccountId: true },
    });

    if (!existingExpense) {
      return { message: "Düzenlenecek gider bulunamadı." };
    }

    previousFinancialAccountId = existingExpense.financialAccountId;

    await prisma.expense.update({
      where: { id: expenseId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });
  } catch {
    return { message: "Gider kaydı güncellenirken bir hata oluştu." };
  }

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  if (previousFinancialAccountId) {
    revalidatePath(`/accounts/${previousFinancialAccountId}`);
  }
  if (parsed.data.financialAccountId) {
    revalidatePath(`/accounts/${parsed.data.financialAccountId}`);
  }
  redirect(`/expenses/${expenseId}`);
}

export async function deleteExpenseAction(expenseId: string) {
  let financialAccountId: string | null = null;

  try {
    const expense = await prisma.expense.update({
      where: { id: expenseId, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { financialAccountId: true },
    });
    financialAccountId = expense.financialAccountId;
  } catch {
    redirect(`/expenses/${expenseId}?error=delete`);
  }

  revalidatePath("/expenses");
  if (financialAccountId) {
    revalidatePath(`/accounts/${financialAccountId}`);
  }
  redirect("/expenses");
}
