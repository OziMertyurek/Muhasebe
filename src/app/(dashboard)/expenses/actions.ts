"use server";

import { ExpenseStatus, Prisma } from "#prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log-utils";
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
    errors.title = "Gider baÅŸlÄ±ÄŸÄ± boÅŸ olamaz.";
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

  const expenseDate = parseDate(expenseDateValue);

  if (!expenseDate) {
    errors.expenseDate = "Gider tarihi boÅŸ olamaz.";
  }

  if (!Object.values(ExpenseStatus).includes(statusValue as ExpenseStatus)) {
    errors.status = "GeÃ§erli bir gider durumu seÃ§in.";
  }

  const paymentDate = parseDate(paymentDateValue);

  if (paymentDateValue && !paymentDate) {
    errors.paymentDate = "GeÃ§erli bir Ã¶deme tarihi girin.";
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

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      errors.companyId = "SilinmiÅŸ veya geÃ§ersiz cari seÃ§ilemez.";
    }
  }

  if (financialAccountId) {
    const financialAccount = await prisma.financialAccount.findFirst({
      where: { id: financialAccountId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!financialAccount) {
      errors.financialAccountId = "SilinmiÅŸ veya geÃ§ersiz finansal hesap seÃ§ilemez.";
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
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  let expenseId: string;

  try {
    const expense = await prisma.expense.create({
      data: parsed.data,
      select: { id: true },
    });
    expenseId = expense.id;
    await createAuditLog({
      entityType: "EXPENSE",
      entityId: expenseId,
      action: "CREATE",
      title: `Gider oluÅŸturuldu: ${parsed.data.title}`,
      description: `${parsed.data.amount.toString()} ${parsed.data.currency} tutarlÄ± gider oluÅŸturuldu.`,
      after: parsed.data,
    });
  } catch {
    return { message: "Gider kaydÄ± oluÅŸturulurken bir hata oluÅŸtu." };
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
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  let previousFinancialAccountId: string | null = null;

  try {
    const existingExpense = await prisma.expense.findFirst({
      where: { id: expenseId, deletedAt: null },
    });

    if (!existingExpense) {
      return { message: "DÃ¼zenlenecek gider bulunamadÄ±." };
    }

    previousFinancialAccountId = existingExpense.financialAccountId;

    await prisma.expense.update({
      where: { id: expenseId, deletedAt: null },
      data: parsed.data,
      select: { id: true },
    });
    await createAuditLog({
      entityType: "EXPENSE",
      entityId: expenseId,
      action: "UPDATE",
      title: `Gider gÃ¼ncellendi: ${parsed.data.title}`,
      description: "Gider bilgilerinde deÄŸiÅŸiklik yapÄ±ldÄ±.",
      before: existingExpense,
      after: parsed.data,
    });
  } catch {
    return { message: "Gider kaydÄ± gÃ¼ncellenirken bir hata oluÅŸtu." };
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
      select: {
        id: true,
        title: true,
        financialAccountId: true,
        amount: true,
        currency: true,
        status: true,
      },
    });
    financialAccountId = expense.financialAccountId;
    await createAuditLog({
      entityType: "EXPENSE",
      entityId: expense.id,
      action: "SOFT_DELETE",
      title: `Gider silindi: ${expense.title}`,
      description: "KayÄ±t Ã§Ã¶p kutusuna taÅŸÄ±ndÄ±.",
      before: expense,
    });
  } catch {
    redirect(`/expenses/${expenseId}?error=delete`);
  }

  revalidatePath("/expenses");
  if (financialAccountId) {
    revalidatePath(`/accounts/${financialAccountId}`);
  }
  redirect("/expenses");
}
