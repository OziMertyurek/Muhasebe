import { formatDate } from "@/lib/company-utils";
import { formatMoney } from "@/lib/invoice-utils";
import { paymentTypeLabels } from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";

export async function getFileFormOptions() {
  const [invoices, expenses, companies, payments] = await Promise.all([
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
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.payment.findMany({
      where: { deletedAt: null },
      orderBy: { paymentDate: "desc" },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        paymentDate: true,
        company: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    }),
  ]);

  return {
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      label: `${invoice.invoiceNumber} - ${invoice.company.name}`,
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      label: `${expense.title} - ${formatDate(expense.expenseDate)}`,
    })),
    companies: companies.map((company) => ({
      id: company.id,
      label: company.name,
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      label: `${paymentTypeLabels[payment.type]} - ${
        payment.company?.name ?? payment.invoice?.invoiceNumber ?? "Genel hareket"
      } - ${formatMoney(payment.amount, payment.currency)}`,
    })),
  };
}
