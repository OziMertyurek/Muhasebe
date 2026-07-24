import { accountTypeLabels } from "@/lib/account-utils";
import { createAuditLog } from "@/lib/audit-log-utils";
import {
  aiExtractionStatusLabels,
  formatConfidence,
} from "@/lib/ai-extraction-utils";
import {
  syncCreditCardReminders,
  syncInvoiceDueReminder,
  syncRecurringExpenseReminder,
} from "@/lib/auto-reminder-utils";
import { companyTypeLabels, formatDate } from "@/lib/company-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { fileRelatedTypeLabels, formatFileSize } from "@/lib/file-utils";
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
  { type: "files", label: "Dosyalar", supported: true },
  { type: "ai-extractions", label: "AI Analiz Kayıtları", supported: true },
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
    files,
    aiExtractionJobs,
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
    prisma.fileAttachment.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: {
        invoice: { select: { invoiceNumber: true } },
        expense: { select: { title: true } },
        company: { select: { name: true } },
        payment: { select: { description: true } },
        _count: { select: { aiExtractionJobs: true } },
      },
    }),
    prisma.aiExtractionJob.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: {
        fileAttachment: {
          select: {
            originalFileName: true,
            relatedType: true,
            deletedAt: true,
          },
        },
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
    files: files.map((file) => ({
      id: file.id,
      type: "files",
      typeLabel: "Dosya",
      title: file.originalFileName,
      deletedAt: file.deletedAt,
      description: [
        fileRelatedTypeLabels[file.relatedType],
        file.mimeType,
        formatFileSize(file.fileSize),
        file.invoice?.invoiceNumber,
        file.expense?.title,
        file.company?.name,
        file.payment?.description,
        `${file._count.aiExtractionJobs} AI analiz`,
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
    "ai-extractions": aiExtractionJobs.map((job) => ({
      id: job.id,
      type: "ai-extractions",
      typeLabel: "AI Analiz",
      title: job.fileAttachment.originalFileName,
      deletedAt: job.deletedAt,
      description: [
        aiExtractionStatusLabels[job.status],
        formatConfidence(job.confidence),
        fileRelatedTypeLabels[job.fileAttachment.relatedType],
        job.fileAttachment.deletedAt ? "Dosya arşivde" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      canRestore: true,
    })),
  } satisfies Record<TrashRecordType, DeletedRecord[]>;
}

export async function restoreRecord(type: TrashRecordType, id: string) {
  switch (type) {
    case "companies":
      const company = await prisma.company.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true, name: true, type: true },
      });
      await createAuditLog({
        entityType: "COMPANY",
        entityId: company.id,
        action: "RESTORE",
        title: `Kayıt geri yüklendi: ${company.name}`,
        description: "Cari çöp kutusundan geri yüklendi.",
        after: company,
      });
      return;
    case "invoices":
      const invoice = await prisma.invoice.update({
        where: { id },
        data: { deletedAt: null },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          dueDate: true,
          status: true,
          companyId: true,
          deletedAt: true,
        },
      });
      await syncInvoiceDueReminder(invoice);
      await createAuditLog({
        entityType: "INVOICE",
        entityId: invoice.id,
        action: "RESTORE",
        title: `Kayıt geri yüklendi: ${invoice.invoiceNumber}`,
        description: "Fatura çöp kutusundan geri yüklendi.",
        after: invoice,
      });
      return;
    case "payments": {
      const payment = await prisma.payment.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true, invoiceId: true, amount: true, currency: true, type: true },
      });
      await createAuditLog({
        entityType: "PAYMENT",
        entityId: payment.id,
        action: "RESTORE",
        title: `Kayıt geri yüklendi: ${payment.amount.toString()} ${payment.currency}`,
        description: "Tahsilat / ödeme hareketi çöp kutusundan geri yüklendi.",
        after: payment,
      });
      await updateInvoicePaymentStatus(payment.invoiceId);
      return;
    }
    case "accounts":
      const account = await prisma.financialAccount.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
        select: { id: true, name: true, type: true, statementDay: true, dueDay: true },
      });
      await syncCreditCardReminders(account);
      await createAuditLog({
        entityType: "FINANCIAL_ACCOUNT",
        entityId: account.id,
        action: "RESTORE",
        title: `Kayıt geri yüklendi: ${account.name}`,
        description: "Finansal hesap çöp kutusundan geri yüklendi.",
        after: account,
      });
      return;
    case "expenses":
      const expense = await prisma.expense.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true, title: true, amount: true, currency: true },
      });
      await createAuditLog({
        entityType: "EXPENSE",
        entityId: expense.id,
        action: "RESTORE",
        title: `Kayıt geri yüklendi: ${expense.title}`,
        description: "Gider çöp kutusundan geri yüklendi.",
        after: expense,
      });
      return;
    case "recurring-expenses":
      const recurringExpense = await prisma.recurringExpense.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
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
        action: "RESTORE",
        title: `Kayıt geri yüklendi: ${recurringExpense.title}`,
        description: "Sabit gider çöp kutusundan geri yüklendi.",
        after: recurringExpense,
      });
      return;
    case "important-dates":
      const importantDate = await prisma.importantDate.update({
        where: { id },
        data: { deletedAt: null },
        select: { id: true, title: true, status: true },
      });
      await createAuditLog({
        entityType: "IMPORTANT_DATE",
        entityId: importantDate.id,
        action: "RESTORE",
        title: `Kayıt geri yüklendi: ${importantDate.title}`,
        description: "Önemli tarih çöp kutusundan geri yüklendi.",
        after: importantDate,
      });
      return;
    case "files": {
      const file = await prisma.fileAttachment.findUnique({
        where: { id },
        select: {
          id: true,
          originalFileName: true,
          storedFileName: true,
          filePath: true,
          relatedType: true,
          deletedAt: true,
        },
      });

      if (!file?.deletedAt) {
        throw new Error("Dosya arşivde değil veya bulunamadı.");
      }

      const restoredFile = await prisma.fileAttachment.update({
        where: { id },
        data: { deletedAt: null },
        select: {
          id: true,
          originalFileName: true,
          storedFileName: true,
          filePath: true,
          relatedType: true,
        },
      });
      await createAuditLog({
        entityType: "FILE_ATTACHMENT",
        entityId: restoredFile.id,
        action: "RESTORE",
        title: `Dosya geri yüklendi: ${restoredFile.originalFileName}`,
        description:
          "Dosya kaydı arşivden geri yüklendi. Fiziksel dosya taşınmadı veya yeniden oluşturulmadı.",
        before: file,
        after: restoredFile,
      });
      return;
    }
    case "ai-extractions": {
      const job = await prisma.aiExtractionJob.findUnique({
        where: { id },
        select: {
          id: true,
          fileAttachmentId: true,
          status: true,
          confidence: true,
          errorMessage: true,
          deletedAt: true,
          fileAttachment: { select: { originalFileName: true } },
        },
      });

      if (!job?.deletedAt) {
        throw new Error("AI analiz kaydı arşivde değil veya bulunamadı.");
      }

      const restoredJob = await prisma.aiExtractionJob.update({
        where: { id },
        data: { deletedAt: null },
        select: {
          id: true,
          fileAttachmentId: true,
          status: true,
          confidence: true,
          errorMessage: true,
        },
      });
      await createAuditLog({
        entityType: "AI_EXTRACTION",
        entityId: restoredJob.id,
        action: "RESTORE",
        title: "AI analiz kaydı geri yüklendi",
        description:
          "AI analiz kaydı arşivden geri yüklendi. Bağlı dosya, fatura ve iş kayıtları değiştirilmedi.",
        before: {
          id: job.id,
          fileAttachmentId: job.fileAttachmentId,
          status: job.status,
          confidence: job.confidence,
          errorMessage: job.errorMessage,
          deletedAt: job.deletedAt,
          fileName: job.fileAttachment.originalFileName,
        },
        after: restoredJob,
      });
      return;
    }
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
