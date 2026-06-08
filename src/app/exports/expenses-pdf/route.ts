import { ExpenseStatus } from "@prisma/client";
import {
  formatTodayForFileName,
  getDateToExclusive,
  parseExportDate,
} from "@/lib/export-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import {
  createPdfDocument,
  createPdfResponse,
  drawSectionTitle,
  drawTable,
  formatPdfDate,
  formatPdfMoney,
} from "@/lib/pdf-utils";
import { prisma } from "@/lib/prisma";

function getExpenseStatus(value?: string | null) {
  if (value && Object.values(ExpenseStatus).includes(value as ExpenseStatus)) {
    return value as ExpenseStatus;
  }

  return undefined;
}

export async function GET(request: Request) {
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
    },
    orderBy: { expenseDate: "desc" },
  });
  const buffer = await createPdfDocument(
    "Gider Raporu",
    "Sistemde kayıtlı aktif gider listesi.",
    (doc) => {
      drawSectionTitle(doc, "Giderler");
      drawTable(
        doc,
        [
          { header: "Gider tarihi", width: 66, value: (row) => formatPdfDate(row.expenseDate) },
          { header: "Başlık", width: 125, value: (row) => row.title },
          { header: "Kategori", width: 88, value: (row) => row.category?.name ?? "-" },
          { header: "Cari firma", width: 105, value: (row) => row.company?.name ?? "-" },
          {
            header: "Tutar",
            width: 78,
            value: (row) => formatPdfMoney(row.amount, row.currency),
            align: "right",
          },
          { header: "PB", width: 34, value: (row) => row.currency },
          { header: "Durum", width: 62, value: (row) => expenseStatusLabels[row.status] },
          { header: "Ödeme", width: 56, value: (row) => formatPdfDate(row.paymentDate) },
        ],
        expenses,
      );
    },
  );

  return createPdfResponse(buffer, `giderler-${formatTodayForFileName()}.pdf`);
}
