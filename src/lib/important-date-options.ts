import { accountTypeLabels } from "@/lib/account-utils";
import { formatDate } from "@/lib/company-utils";
import { prisma } from "@/lib/prisma";

export async function getImportantDateFormOptions() {
  const [companies, invoices, expenses, financialAccounts] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { invoiceDate: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        company: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { expenseDate: "desc" },
      select: { id: true, title: true, expenseDate: true },
    }),
    prisma.financialAccount.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return {
    companies: companies.map((company) => ({
      id: company.id,
      label: company.name,
    })),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      label: `${invoice.invoiceNumber} - ${invoice.company.name}`,
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      label: `${expense.title} - ${formatDate(expense.expenseDate)}`,
    })),
    financialAccounts: financialAccounts.map((account) => ({
      id: account.id,
      label: `${account.name} - ${accountTypeLabels[account.type]}`,
    })),
  };
}
