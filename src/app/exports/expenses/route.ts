import { ExpenseStatus } from "#prisma/client";
import {
  createCsv,
  createCsvResponse,
  formatCsvDate,
  formatCsvNumber,
  formatTodayForFileName,
  getDateToExclusive,
  parseExportDate,
} from "@/lib/export-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

function getExpenseStatus(value?: string | null) {
  if (value && Object.values(ExpenseStatus).includes(value as ExpenseStatus)) {
    return value as ExpenseStatus;
  }

  return undefined;
}

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const categoryId = searchParams.get("categoryId")?.trim() || undefined;
  const status = getExpenseStatus(searchParams.get("status"));
  const dateFrom = parseExportDate(searchParams.get("dateFrom"));
  const dateToExclusive = getDateToExclusive(searchParams.get("dateTo"));
  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              { company: { name: { contains: query } } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      ...(dateFrom || dateToExclusive
        ? {
            expenseDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateToExclusive ? { lt: dateToExclusive } : {}),
            },
          }
        : {}),
    },
    include: {
      category: { select: { name: true } },
      company: { select: { name: true } },
      financialAccount: { select: { name: true } },
    },
    orderBy: { expenseDate: "desc" },
  });
  const csv = createCsv(
    [
      "Gider tarihi",
      "BaÅŸlÄ±k",
      "Kategori",
      "Cari firma",
      "Finansal hesap",
      "Tutar",
      "Para birimi",
      "Durum",
      "Ã–deme tarihi",
      "AÃ§Ä±klama",
    ],
    expenses.map((expense) => [
      formatCsvDate(expense.expenseDate),
      expense.title,
      expense.category?.name,
      expense.company?.name,
      expense.financialAccount?.name,
      formatCsvNumber(expense.amount),
      expense.currency,
      expenseStatusLabels[expense.status],
      formatCsvDate(expense.paymentDate),
      expense.description,
    ]),
  );

  return createCsvResponse(csv, `giderler-${formatTodayForFileName()}.csv`);
}
