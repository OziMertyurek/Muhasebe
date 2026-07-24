import { FinancialAccountType, Prisma } from "@prisma/client";
import { addDays, getLocalDateRange } from "@/lib/important-date-utils";
import { prisma } from "@/lib/prisma";

type MoneyMap = Map<string, Prisma.Decimal>;

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

function getInvoiceExpectedPaymentType(invoiceType: "SALES" | "PURCHASE") {
  return invoiceType === "SALES" ? "COLLECTION" : "PAYMENT";
}

const liquidFinancialAccountTypes: FinancialAccountType[] = ["CASH", "BANK", "FOREIGN_CURRENCY"];

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
    recentInvoices,
    recentPayments,
    recentExpenses,
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
    prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        company: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { deletedAt: null },
      orderBy: { paymentDate: "desc" },
      take: 5,
      include: {
        company: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { expenseDate: "desc" },
      take: 5,
      include: {
        category: { select: { name: true } },
        company: { select: { name: true } },
      },
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
    const expectedPaymentType = getInvoiceExpectedPaymentType(invoice.type);
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
    const expectedPaymentType = getInvoiceExpectedPaymentType(invoice.type);
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
      companyBreakdown,
    },
    lists: {
      recentInvoices,
      recentPayments,
      recentExpenses,
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
