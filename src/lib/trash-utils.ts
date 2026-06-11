import { accountTypeLabels } from "@/lib/account-utils";
import { companyTypeLabels, formatDate } from "@/lib/company-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { importantDateCategoryLabels } from "@/lib/important-date-utils";
import { formatMoney, invoiceStatusLabels, invoiceTypeLabels } from "@/lib/invoice-utils";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/payment-utils";
import { updateInvoicePaymentStatus } from "@/lib/payment-status";
import { prisma } from "@/lib/prisma";
import { formatDayOfMonth } from "@/lib/recurring-expense-utils";

export type TrashRecordType =
  | "companies"
  | "invoices"
  | "payments"
  | "accounts"
  | "expenses"
  | "recurring-expenses"
  | "important-dates"
  | "files"
  | "ai-extractions";

export type DeletedRecord = {
  id: string;
  type: TrashRecordType;
  typeLabel: string;
  title: string;
  deletedAt: Date | null;
  description: string;
  detailHref?: string;
  canRestore: boolean;
};

export const trashTabs: Array<{ type: TrashRecordType; label: string; supported: boolean }> = [
  { type: "companies", label: "Cariler", supported: true },
  { type: "invoices", label: "Faturalar", supported: true },
  { type: "payments", label: "Tahsilat / Ödeme", supported: true },
  { type: "accounts", label: "Finansal Hesaplar", supported: true },
  { type: "expenses", label: "Giderler", supported: true },
  { type: "recurring-expenses", label: "Sabit Giderler", supported: true },
  { type: "important-dates", label: "Önemli Tarihler", supported: true },
  { type: "files", label: "Dosyalar", supported: false },
  { type: "ai-extractions", label: "AI Analiz Kayıtları", supported: false },
];

const supportedTrashTypes = trashTabs
  .filter((tab) => tab.supported)
  .map((tab) => tab.type);

export function getTrashTypeLabel(type: TrashRecordType) {
  return trashTabs.find((tab) => tab.type === type)?.label ?? "Kayıt";
}

export function isSupportedTrashType(type: TrashRecordType) {
  return supportedTrashTypes.includes(type);
}

export function getTrashType(value?: string): TrashRecordType | undefined {
  return trashTabs.find((tab) => tab.type === value)?.type;
}

export async function getDeletedRecords(selectedType?: TrashRecordType) {
  const recordsByType = await getDeletedRecordsByType();
  const counts = trashTabs.reduce<Record<TrashRecordType, number>>((result, tab) => {
    result[tab.type] = recordsByType[tab.type]?.length ?? 0;
    return result;
  }, {} as Record<TrashRecordType, number>);

  const records: DeletedRecord[] = selectedType
    ? recordsByType[selectedType] ?? []
    : supportedTrashTypes.flatMap((type) => recordsByType[type] ?? []);

  return {
    counts,
    records: records.sort((first, second) => {
      const firstDate = first.deletedAt?.getTime() ?? 0;
      const secondDate = second.deletedAt?.getTime() ?? 0;
      return secondDate - firstDate;
    }),
  };
}

async function getDeletedRecordsByType(): Promise<Record<TrashRecordType, DeletedRecord[]>> {
  const [
    companies,
    invoices,
    payments,
    accounts,
    expenses,
    recurringExpenses,
    importantDates,
  ] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: {
        _count: {
          select: {
            invoices: true,
            payments: true,
            expenses: true,
            importantDates: true,
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { company: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: {
        company: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
        financialAccount: { select: { name: true } },
      },
    }),
    prisma.financialAccount.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: {
        category: { select: { name: true } },
        company: { select: { name: true } },
        financialAccount: { select: { name: true } },
      },
    }),
    prisma.recurringExpense.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { category: { select: { name: true } } },
    }),
    prisma.importantDate.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: {
        company: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
        expense: { select: { title: true } },
        financialAccount: { select: { name: true } },
      },
    }),
  ]);

  return {
    companies: companies.map((company) => ({
      id: company.id,
      type: "companies",
      typeLabel: "Cari",
      title: company.name,
      deletedAt: company.deletedAt,
      description: [
        companyTypeLabels[company.type],
        company.city,
        `${company._count.invoices} fatura`,
        `${company._count.payments} hareket`,
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      type: "invoices",
      typeLabel: "Fatura",
      title: invoice.invoiceNumber,
      deletedAt: invoice.deletedAt,
      description: [
        invoice.company?.name,
        invoiceTypeLabels[invoice.type],
        invoiceStatusLabels[invoice.status],
        formatMoney(invoice.totalAmount, invoice.currency),
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      type: "payments",
      typeLabel: "Tahsilat / Ödeme",
      title: payment.description || paymentTypeLabels[payment.type],
      deletedAt: payment.deletedAt,
      description: [
        payment.company?.name,
        payment.invoice?.invoiceNumber,
        payment.financialAccount?.name,
        paymentMethodLabels[payment.method],
        formatMoney(payment.amount, payment.currency),
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    accounts: accounts.map((account) => ({
      id: account.id,
      type: "accounts",
      typeLabel: "Finansal Hesap",
      title: account.name,
      deletedAt: account.deletedAt,
      description: [
        accountTypeLabels[account.type],
        account.bankName,
        account.currency,
        formatMoney(account.currentBalance, account.currency),
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      type: "expenses",
      typeLabel: "Gider",
      title: expense.title,
      deletedAt: expense.deletedAt,
      description: [
        expense.category?.name,
        expense.company?.name,
        expense.financialAccount?.name,
        expenseStatusLabels[expense.status],
        formatMoney(expense.amount, expense.currency),
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    "recurring-expenses": recurringExpenses.map((recurringExpense) => ({
      id: recurringExpense.id,
      type: "recurring-expenses",
      typeLabel: "Sabit Gider",
      title: recurringExpense.title,
      deletedAt: recurringExpense.deletedAt,
      description: [
        recurringExpense.category?.name,
        formatDayOfMonth(recurringExpense.dayOfMonth),
        formatMoney(recurringExpense.amount, recurringExpense.currency),
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    "important-dates": importantDates.map((importantDate) => ({
      id: importantDate.id,
      type: "important-dates",
      typeLabel: "Önemli Tarih",
      title: importantDate.title,
      deletedAt: importantDate.deletedAt,
      description: [
        importantDateCategoryLabels[importantDate.category],
        formatDate(importantDate.date),
        importantDate.company?.name,
        importantDate.invoice?.invoiceNumber,
        importantDate.expense?.title,
        importantDate.financialAccount?.name,
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    files: [],
    "ai-extractions": [],
  } satisfies Record<TrashRecordType, DeletedRecord[]>;
}

export async function restoreRecord(type: TrashRecordType, id: string) {
  switch (type) {
    case "companies":
      await prisma.company.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true },
      });
      return;
    case "invoices":
      await prisma.invoice.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true },
      });
      return;
    case "payments": {
      const payment = await prisma.payment.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true, invoiceId: true },
      });
      await updateInvoicePaymentStatus(payment.invoiceId);
      return;
    }
    case "accounts":
      await prisma.financialAccount.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
        select: { id: true },
      });
      return;
    case "expenses":
      await prisma.expense.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true },
      });
      return;
    case "recurring-expenses":
      await prisma.recurringExpense.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
        select: { id: true },
      });
      return;
    case "important-dates":
      await prisma.importantDate.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true },
      });
      return;
    default:
      throw new Error("Bu kayıt tipi çöp kutusundan geri yüklenemiyor.");
  }
}

export function formatDeletedDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDeletedRecord(record: DeletedRecord) {
  return {
    ...record,
    deletedAtLabel: formatDeletedDate(record.deletedAt),
  };
}
