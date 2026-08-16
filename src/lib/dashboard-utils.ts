import { FinancialAccountType, Prisma } from "@prisma/client";
import { getExpectedPaymentType } from "@/lib/accounting-core";
import { getAuditEntityHref } from "@/lib/audit-log-utils";
import { addDays, getLocalDateRange } from "@/lib/important-date-utils";
import { prisma } from "@/lib/prisma";

type MoneyMap = Map<string, Prisma.Decimal>;

type AuditJson = Record<string, unknown>;

function zero() {
  return new Prisma.Decimal(0);
}

function addMoney(map: MoneyMap, currency: string, amount: Prisma.Decimal) {
  map.set(currency, (map.get(currency) ?? zero()).plus(amount));
}

function subtractMoney(map: MoneyMap, currency: string, amount: Prisma.Decimal) {
  map.set(currency, (map.get(currency) ?? zero()).minus(amount));
}

function clampPositive(amount: Prisma.Decimal) {
  return amount.lessThan(0) ? zero() : amount;
}

function toMoneyItems(map: MoneyMap) {
  return Array.from(map.entries())
    .filter(([, amount]) => !amount.equals(0))
    .sort(([firstCurrency], [secondCurrency]) => firstCurrency.localeCompare(secondCurrency))
    .map(([currency, amount]) => ({ currency, amount }));
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

const liquidFinancialAccountTypes: FinancialAccountType[] = ["CASH", "BANK", "FOREIGN_CURRENCY"];

function parseAuditJson(value: string | null): AuditJson | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as AuditJson
      : null;
  } catch {
    return null;
  }
}

function getAuditStatus(log: {
  beforeJson: string | null;
  afterJson: string | null;
  metadataJson: string | null;
}) {
  const after = parseAuditJson(log.afterJson);
  const before = parseAuditJson(log.beforeJson);
  const metadata = parseAuditJson(log.metadataJson);

  return [after?.status, before?.status, metadata?.status]
    .find((value): value is string => typeof value === "string");
}

function getTimelineTitle(log: {
  entityType: string;
  action: string;
  title: string;
  beforeJson: string | null;
  afterJson: string | null;
  metadataJson: string | null;
}) {
  const status = getAuditStatus(log);
  const after = parseAuditJson(log.afterJson);
  const before = parseAuditJson(log.beforeJson);
  const paymentType = [after?.type, before?.type]
    .find((value): value is string => typeof value === "string");

  if (log.entityType === "INVOICE") {
    if (log.action === "CREATE") return "Yeni Fatura";
    if (log.action === "UPDATE") return "Fatura Güncellendi";
    if (log.action === "SOFT_DELETE") return "Fatura Arşivlendi";
    if (log.action === "RESTORE") return "Fatura Geri Yüklendi";
    if (log.action === "STATUS_CHANGE") return "Fatura Durumu Değişti";
  }

  if (log.entityType === "PAYMENT") {
    if (log.action === "CREATE") {
      if (paymentType === "COLLECTION") return "Tahsilat Alındı";
      if (paymentType === "PAYMENT") return "Ödeme Yapıldı";
      return "Para Hareketi Eklendi";
    }
    if (log.action === "UPDATE") return "Para Hareketi Güncellendi";
    if (log.action === "SOFT_DELETE") return "Para Hareketi Arşivlendi";
    if (log.action === "RESTORE") return "Para Hareketi Geri Yüklendi";
  }

  if (log.entityType === "PRODUCT") {
    if (log.action === "CREATE") return "Urun Olusturuldu";
    if (log.action === "UPDATE") return "Urun Guncellendi";
    if (log.action === "SOFT_DELETE") return "Urun Arsivlendi";
    if (log.action === "RESTORE") return "Urun Geri Yuklendi";
  }

  if (log.entityType === "STOCK_MOVEMENT") {
    if (log.action === "CREATE") return "Stok Hareketi Eklendi";
    return "Stok Hareketi";
  }

  if (log.entityType === "EXPENSE") {
    if (log.action === "CREATE") return "Gider Kaydedildi";
    if (log.action === "UPDATE") return "Gider Güncellendi";
    if (log.action === "SOFT_DELETE") return "Gider Arşivlendi";
    if (log.action === "RESTORE") return "Gider Geri Yüklendi";
  }

  if (log.entityType === "COMPANY") {
    if (log.action === "CREATE") return "Yeni Firma";
    if (log.action === "UPDATE") return "Firma Güncellendi";
    if (log.action === "SOFT_DELETE") return "Firma Arşivlendi";
    if (log.action === "RESTORE") return "Firma Geri Yüklendi";
  }

  if (log.entityType === "IMPORTANT_DATE") {
    if (log.action === "CREATE") return "Hatırlatma Oluşturuldu";
    if (log.action === "UPDATE") return "Hatırlatma Güncellendi";
    if (log.action === "SOFT_DELETE") return "Hatırlatma Arşivlendi";
    if (log.action === "RESTORE") return "Hatırlatma Geri Yüklendi";
    if (log.action === "STATUS_CHANGE") return "Hatırlatma Durumu Değişti";
  }

  if (log.entityType === "FILE_ATTACHMENT") {
    if (log.action === "CREATE") return "Dosya Yüklendi";
    if (log.action === "SOFT_DELETE") return "Dosya Arşivlendi";
    if (log.action === "RESTORE") return "Dosya Geri Yüklendi";
    if (log.action === "UPDATE") return "Dosya Güncellendi";
  }

  if (log.entityType === "AI_EXTRACTION") {
    if (log.action === "CREATE") return "AI Analizi Başlatıldı";
    if (status === "FAILED" || log.title.toLocaleLowerCase("tr-TR").includes("hata")) {
      return "AI Analizi Başarısız";
    }
    if (status === "COMPLETED" || status === "REVIEWED") return "AI Analizi Tamamlandı";
    if (log.action === "SOFT_DELETE") return "AI Analizi Arşivlendi";
    if (log.action === "RESTORE") return "AI Analizi Geri Yüklendi";
    if (log.action === "STATUS_CHANGE") return "AI Analizi Güncellendi";
    if (log.action === "UPDATE") return "AI Analizi Güncellendi";
  }

  if (log.entityType === "BACKUP") {
    return "Backup Oluşturuldu";
  }

  if (log.entityType === "RESTORE") {
    if (log.action === "BACKUP_VALIDATE") return "Backup Kontrol Edildi";
    return "Backup Geri Yüklendi";
  }

  if (log.entityType === "SETTINGS") {
    return "Ayarlar Güncellendi";
  }

  if (log.entityType === "FINANCIAL_ACCOUNT") {
    if (log.action === "CREATE") return "Finansal Hesap Oluşturuldu";
    if (log.action === "UPDATE") return "Finansal Hesap Güncellendi";
    if (log.action === "SOFT_DELETE") return "Finansal Hesap Arşivlendi";
    if (log.action === "RESTORE") return "Finansal Hesap Geri Yüklendi";
  }

  if (log.entityType === "RECURRING_EXPENSE") {
    if (log.action === "CREATE") return "Sabit Gider Oluşturuldu";
    if (log.action === "UPDATE") return "Sabit Gider Güncellendi";
    if (log.action === "SOFT_DELETE") return "Sabit Gider Arşivlendi";
    if (log.action === "RESTORE") return "Sabit Gider Geri Yüklendi";
  }

  return log.title;
}

function getTimelineIcon(entityType: string) {
  const icons: Record<string, string> = {
    INVOICE: "📄",
    PAYMENT: "💰",
    EXPENSE: "💸",
    COMPANY: "🏢",
    FINANCIAL_ACCOUNT: "💰",
    RECURRING_EXPENSE: "💸",
    IMPORTANT_DATE: "📅",
    FILE_ATTACHMENT: "📎",
    AI_EXTRACTION: "🤖",
    BACKUP: "💾",
    RESTORE: "♻️",
    SETTINGS: "⚙️",
  };

  return icons[entityType] ?? "📄";
}

export function formatDashboardMoney(value: { toNumber: () => number }, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}

export function formatDashboardSignedMoney(
  value: { toNumber: () => number },
  currency: string,
) {
  const amount = value.toNumber();
  const formatted = formatDashboardMoney({ toNumber: () => Math.abs(amount) }, currency);

  if (amount > 0) {
    return `+${formatted}`;
  }

  if (amount < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export async function getDashboardData() {
  const { start: today, end: tomorrow } = getLocalDateRange();
  const weekEnd = addDays(today, 8);
  const { start: monthStart, end: monthEnd } = getMonthRange();

  const [
    activeInvoices,
    monthlyExpenses,
    monthlyPaidExpenses,
    activeRecurringExpenses,
    upcomingImportantDates,
    overdueImportantDateCount,
    todayImportantDateCount,
    overdueSalesInvoiceCount,
    overduePurchaseInvoiceCount,
    todayInvoiceCount,
    failedAiExtractionCount,
    recentAuditLogs,
    dueInvoicesThisWeek,
    liquidFinancialAccounts,
    companyCounts,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        deletedAt: null,
        status: { not: "CANCELLED" },
      },
      include: {
        payments: {
          where: { deletedAt: null },
          select: { type: true, amount: true },
        },
      },
    }),
    prisma.expense.findMany({
      where: {
        deletedAt: null,
        status: { not: "CANCELLED" },
        expenseDate: { gte: monthStart, lt: monthEnd },
      },
      select: { amount: true, currency: true },
    }),
    prisma.expense.findMany({
      where: {
        deletedAt: null,
        status: "PAID",
        paymentDate: { gte: monthStart, lt: monthEnd },
      },
      select: { amount: true, currency: true },
    }),
    prisma.recurringExpense.findMany({
      where: { deletedAt: null, isActive: true },
      select: { amount: true, currency: true },
    }),
    prisma.importantDate.findMany({
      where: {
        deletedAt: null,
        status: "PENDING",
        date: { gte: today, lt: weekEnd },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }, { title: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        date: true,
        time: true,
        priority: true,
      },
    }),
    prisma.importantDate.count({
      where: {
        deletedAt: null,
        status: "PENDING",
        date: { lt: today },
      },
    }),
    prisma.importantDate.count({
      where: {
        deletedAt: null,
        status: "PENDING",
        date: { gte: today, lt: tomorrow },
      },
    }),
    prisma.invoice.count({
      where: {
        deletedAt: null,
        type: "SALES",
        status: { in: ["UNPAID", "PARTIAL"] },
        dueDate: { lt: today },
      },
    }),
    prisma.invoice.count({
      where: {
        deletedAt: null,
        type: "PURCHASE",
        status: { in: ["UNPAID", "PARTIAL"] },
        dueDate: { lt: today },
      },
    }),
    prisma.invoice.count({
      where: {
        deletedAt: null,
        status: { in: ["UNPAID", "PARTIAL"] },
        dueDate: { gte: today, lt: tomorrow },
      },
    }),
    prisma.aiExtractionJob.count({
      where: {
        deletedAt: null,
        status: "FAILED",
        fileAttachment: { deletedAt: null },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.invoice.findMany({
      where: {
        deletedAt: null,
        status: { in: ["UNPAID", "PARTIAL"] },
        dueDate: { gte: today, lt: weekEnd },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        company: { select: { name: true } },
        payments: {
          where: { deletedAt: null },
          select: { type: true, amount: true },
        },
      },
    }),
    prisma.financialAccount.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        type: { in: liquidFinancialAccountTypes },
      },
      select: {
        currency: true,
        openingBalance: true,
        payments: {
          where: { deletedAt: null },
          select: { type: true, amount: true },
        },
        expenses: {
          where: { deletedAt: null, status: "PAID" },
          select: { amount: true },
        },
      },
    }),
    prisma.company.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const receivables = new Map<string, Prisma.Decimal>();
  const payables = new Map<string, Prisma.Decimal>();
  const unpaidInvoiceRemaining = new Map<string, Prisma.Decimal>();

  for (const invoice of activeInvoices) {
    const expectedPaymentType = getExpectedPaymentType(invoice.type);
    const paidTotal = invoice.payments
      .filter((payment) => payment.type === expectedPaymentType)
      .reduce((total, payment) => total.plus(payment.amount), zero());
    const remaining = clampPositive(invoice.totalAmount.minus(paidTotal));

    if (invoice.type === "SALES") {
      addMoney(receivables, invoice.currency, remaining);
    } else {
      addMoney(payables, invoice.currency, remaining);
    }

    if (invoice.status === "UNPAID" || invoice.status === "PARTIAL") {
      addMoney(unpaidInvoiceRemaining, invoice.currency, remaining);
    }
  }

  const net = new Map<string, Prisma.Decimal>();
  for (const { currency, amount } of toMoneyItems(receivables)) {
    addMoney(net, currency, amount);
  }
  for (const { currency, amount } of toMoneyItems(payables)) {
    subtractMoney(net, currency, amount);
  }

  const monthlyExpenseTotals = new Map<string, Prisma.Decimal>();
  for (const expense of monthlyExpenses) {
    addMoney(monthlyExpenseTotals, expense.currency, expense.amount);
  }

  const monthlyPaidExpenseTotals = new Map<string, Prisma.Decimal>();
  for (const expense of monthlyPaidExpenses) {
    addMoney(monthlyPaidExpenseTotals, expense.currency, expense.amount);
  }

  const recurringExpenseTotals = new Map<string, Prisma.Decimal>();
  for (const recurringExpense of activeRecurringExpenses) {
    addMoney(recurringExpenseTotals, recurringExpense.currency, recurringExpense.amount);
  }

  const liquidAccountTotals = new Map<string, Prisma.Decimal>();
  for (const account of liquidFinancialAccounts) {
    const collectionTotal = account.payments
      .filter((payment) => payment.type === "COLLECTION")
      .reduce((total, payment) => total.plus(payment.amount), zero());
    const paymentTotal = account.payments
      .filter((payment) => payment.type === "PAYMENT")
      .reduce((total, payment) => total.plus(payment.amount), zero());
    const paidExpenseTotal = account.expenses.reduce(
      (total, expense) => total.plus(expense.amount),
      zero(),
    );
    const estimatedBalance = account.openingBalance
      .plus(collectionTotal)
      .minus(paymentTotal)
      .minus(paidExpenseTotal);

    addMoney(liquidAccountTotals, account.currency, estimatedBalance);
  }

  const companyBreakdown = {
    total: 0,
    CUSTOMER: 0,
    SUPPLIER: 0,
    BOTH: 0,
  };
  for (const item of companyCounts) {
    companyBreakdown[item.type] = item._count._all;
    companyBreakdown.total += item._count._all;
  }

  const dueInvoiceRows = dueInvoicesThisWeek.map((invoice) => {
    const expectedPaymentType = getExpectedPaymentType(invoice.type);
    const paidTotal = invoice.payments
      .filter((payment) => payment.type === expectedPaymentType)
      .reduce((total, payment) => total.plus(payment.amount), zero());

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      companyName: invoice.company.name,
      dueDate: invoice.dueDate,
      remainingAmount: clampPositive(invoice.totalAmount.minus(paidTotal)),
      currency: invoice.currency,
    };
  });

  const timeline = recentAuditLogs.map((log) => ({
    id: log.id,
    icon: getTimelineIcon(log.entityType),
    title: getTimelineTitle(log),
    subtitle: log.description ?? log.title,
    createdAt: log.createdAt,
    href: log.action === "SOFT_DELETE" ? null : getAuditEntityHref(log),
  }));

  return {
    cards: {
      receivables: toMoneyItems(receivables),
      payables: toMoneyItems(payables),
      net: toMoneyItems(net),
      liquidAccountEstimate: toMoneyItems(liquidAccountTotals),
      monthlyExpenses: toMoneyItems(monthlyExpenseTotals),
      monthlyPaidExpenses: toMoneyItems(monthlyPaidExpenseTotals),
      activeRecurringExpenseCount: activeRecurringExpenses.length,
      activeRecurringExpenseTotals: toMoneyItems(recurringExpenseTotals),
      unpaidInvoiceCount: activeInvoices.filter(
        (invoice) => invoice.status === "UNPAID" || invoice.status === "PARTIAL",
      ).length,
      unpaidInvoiceRemaining: toMoneyItems(unpaidInvoiceRemaining),
      upcomingImportantDateCount: upcomingImportantDates.length,
      overdueImportantDateCount,
      todayImportantDateCount,
      overdueSalesInvoiceCount,
      overduePurchaseInvoiceCount,
      todayInvoiceCount,
      failedAiExtractionCount,
      companyBreakdown,
    },
    lists: {
      timeline,
      upcomingImportantDates,
      dueInvoicesThisWeek: dueInvoiceRows,
    },
    ranges: {
      today,
      tomorrow,
      weekEnd,
      monthStart,
      monthEnd,
    },
  };
}
