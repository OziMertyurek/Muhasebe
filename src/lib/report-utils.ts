import {
  CompanyType,
  FinancialAccountType,
  InvoiceType,
  Prisma,
} from "#prisma/client";
import { getExpectedPaymentType } from "@/lib/accounting-core";
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

export function toMoneyItems(map: MoneyMap) {
  return Array.from(map.entries())
    .filter(([, amount]) => !amount.equals(0))
    .sort(([firstCurrency], [secondCurrency]) => firstCurrency.localeCompare(secondCurrency))
    .map(([currency, amount]) => ({ currency, amount }));
}

export function formatReportMoney(value: { toNumber: () => number }, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}

export function formatReportSignedMoney(
  value: { toNumber: () => number },
  currency: string,
) {
  const amount = value.toNumber();
  const formatted = formatReportMoney({ toNumber: () => Math.abs(amount) }, currency);

  if (amount > 0) {
    return `+${formatted}`;
  }

  if (amount < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export function getMonthRange(month?: string, year?: string) {
  const now = new Date();
  const parsedMonth = Number(month);
  const parsedYear = Number(year);
  const safeMonth = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth
    : now.getMonth() + 1;
  const safeYear = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
    ? parsedYear
    : now.getFullYear();

  return {
    month: safeMonth,
    year: safeYear,
    start: new Date(safeYear, safeMonth - 1, 1),
    end: new Date(safeYear, safeMonth, 1),
  };
}

export function getReportMonths() {
  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(
      new Date(2026, index, 1),
    ),
  }));
}

export function getReportYears() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
}

function sumByCurrency<T extends { currency: string; amount: Prisma.Decimal }>(items: T[]) {
  const totals = new Map<string, Prisma.Decimal>();

  for (const item of items) {
    addMoney(totals, item.currency, item.amount);
  }

  return totals;
}

function sumInvoicesByCurrency<T extends { currency: string; totalAmount: Prisma.Decimal }>(
  invoices: T[],
) {
  const totals = new Map<string, Prisma.Decimal>();

  for (const invoice of invoices) {
    addMoney(totals, invoice.currency, invoice.totalAmount);
  }

  return totals;
}

export async function getMonthlySummaryReport(month?: string, year?: string) {
  const range = getMonthRange(month, year);
  const [salesInvoices, purchaseInvoices, payments, expenses, paidExpenses] =
    await Promise.all([
      prisma.invoice.findMany({
        where: {
          deletedAt: null,
          status: { not: "CANCELLED" },
          type: "SALES",
          invoiceDate: { gte: range.start, lt: range.end },
        },
        include: { company: { select: { name: true } } },
        orderBy: { invoiceDate: "desc" },
      }),
      prisma.invoice.findMany({
        where: {
          deletedAt: null,
          status: { not: "CANCELLED" },
          type: "PURCHASE",
          invoiceDate: { gte: range.start, lt: range.end },
        },
        include: { company: { select: { name: true } } },
        orderBy: { invoiceDate: "desc" },
      }),
      prisma.payment.findMany({
        where: {
          deletedAt: null,
          paymentDate: { gte: range.start, lt: range.end },
        },
        include: {
          company: { select: { name: true } },
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { paymentDate: "desc" },
      }),
      prisma.expense.findMany({
        where: {
          deletedAt: null,
          status: { not: "CANCELLED" },
          expenseDate: { gte: range.start, lt: range.end },
        },
        include: {
          category: { select: { name: true } },
          company: { select: { name: true } },
        },
        orderBy: { expenseDate: "desc" },
      }),
      prisma.expense.findMany({
        where: {
          deletedAt: null,
          status: "PAID",
          paymentDate: { gte: range.start, lt: range.end },
        },
        select: { currency: true, amount: true },
      }),
    ]);

  const collectionPayments = payments.filter((payment) => payment.type === "COLLECTION");
  const outgoingPayments = payments.filter((payment) => payment.type === "PAYMENT");
  const net = new Map<string, Prisma.Decimal>();

  for (const invoice of salesInvoices) {
    addMoney(net, invoice.currency, invoice.totalAmount);
  }
  for (const invoice of purchaseInvoices) {
    subtractMoney(net, invoice.currency, invoice.totalAmount);
  }
  for (const expense of expenses) {
    subtractMoney(net, expense.currency, expense.amount);
  }

  return {
    range,
    totals: {
      salesInvoices: toMoneyItems(sumInvoicesByCurrency(salesInvoices)),
      purchaseInvoices: toMoneyItems(sumInvoicesByCurrency(purchaseInvoices)),
      collections: toMoneyItems(sumByCurrency(collectionPayments)),
      payments: toMoneyItems(sumByCurrency(outgoingPayments)),
      expenses: toMoneyItems(sumByCurrency(expenses)),
      paidExpenses: toMoneyItems(sumByCurrency(paidExpenses)),
      net: toMoneyItems(net),
    },
    lists: {
      salesInvoices: salesInvoices.slice(0, 10),
      purchaseInvoices: purchaseInvoices.slice(0, 10),
      payments: payments.slice(0, 10),
      expenses: expenses.slice(0, 10),
    },
  };
}

export function getCompanyTypeFilter(value?: string) {
  if (value && Object.values(CompanyType).includes(value as CompanyType)) {
    return value as CompanyType;
  }

  return undefined;
}

export async function getReceivablesPayablesReport(filters: {
  q?: string;
  type?: string;
  currency?: string;
  balanceOnly?: string;
}) {
  const companyType = getCompanyTypeFilter(filters.type);
  const query = filters.q?.trim() ?? "";
  const currencyFilter = filters.currency?.trim() || undefined;
  const balanceOnly = filters.balanceOnly === "on";
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(query ? { name: { contains: query } } : {}),
      ...(companyType ? { type: companyType } : {}),
    },
    include: {
      invoices: {
        where: { deletedAt: null, status: { not: "CANCELLED" } },
        select: { type: true, currency: true, totalAmount: true },
      },
      payments: {
        where: { deletedAt: null },
        select: { type: true, currency: true, amount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = companies.flatMap((company) => {
    const currencies = new Set<string>([
      ...company.invoices.map((invoice) => invoice.currency),
      ...company.payments.map((payment) => payment.currency),
    ]);

    return Array.from(currencies)
      .filter((currency) => !currencyFilter || currency === currencyFilter)
      .map((currency) => {
        const salesTotal = company.invoices
          .filter((invoice) => invoice.currency === currency && invoice.type === "SALES")
          .reduce((total, invoice) => total.plus(invoice.totalAmount), zero());
        const purchaseTotal = company.invoices
          .filter((invoice) => invoice.currency === currency && invoice.type === "PURCHASE")
          .reduce((total, invoice) => total.plus(invoice.totalAmount), zero());
        const collectionTotal = company.payments
          .filter((payment) => payment.currency === currency && payment.type === "COLLECTION")
          .reduce((total, payment) => total.plus(payment.amount), zero());
        const paymentTotal = company.payments
          .filter((payment) => payment.currency === currency && payment.type === "PAYMENT")
          .reduce((total, payment) => total.plus(payment.amount), zero());
        const remainingReceivable = clampPositive(salesTotal.minus(collectionTotal));
        const remainingPayable = clampPositive(purchaseTotal.minus(paymentTotal));
        const netBalance = salesTotal.minus(collectionTotal).minus(purchaseTotal).plus(paymentTotal);

        return {
          companyId: company.id,
          companyName: company.name,
          companyType: company.type,
          currency,
          salesTotal,
          purchaseTotal,
          collectionTotal,
          paymentTotal,
          remainingReceivable,
          remainingPayable,
          netBalance,
        };
      })
      .filter((row) => !balanceOnly || !row.netBalance.equals(0));
  });

  const currencies = Array.from(
    new Set(rows.map((row) => row.currency)),
  ).sort((first, second) => first.localeCompare(second));

  return { rows, currencies };
}

export function getInvoiceTypeFilter(value?: string) {
  if (value && Object.values(InvoiceType).includes(value as InvoiceType)) {
    return value as InvoiceType;
  }

  return undefined;
}

export async function getDueInvoicesReport(filters: {
  view?: string;
  invoiceType?: string;
  currency?: string;
  q?: string;
}) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sevenDays = new Date(todayStart);
  sevenDays.setDate(todayStart.getDate() + 8);
  const thirtyDays = new Date(todayStart);
  thirtyDays.setDate(todayStart.getDate() + 31);
  const invoiceType = getInvoiceTypeFilter(filters.invoiceType);
  const currency = filters.currency?.trim() || undefined;
  const query = filters.q?.trim() ?? "";
  const dueDateWhere =
    filters.view === "past"
      ? { lt: todayStart }
      : filters.view === "7"
        ? { gte: todayStart, lt: sevenDays }
        : filters.view === "30"
          ? { gte: todayStart, lt: thirtyDays }
          : {};

  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      status: { in: ["UNPAID", "PARTIAL"] },
      dueDate: { not: null, ...dueDateWhere },
      ...(invoiceType ? { type: invoiceType } : {}),
      ...(currency ? { currency } : {}),
      ...(query ? { OR: [{ invoiceNumber: { contains: query } }, { company: { name: { contains: query } } }] } : {}),
    },
    include: {
      company: { select: { name: true } },
      payments: { where: { deletedAt: null }, select: { type: true, amount: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const rows = invoices.map((invoice) => {
    const expectedPaymentType = getExpectedPaymentType(invoice.type);
    const paidTotal = invoice.payments
      .filter((payment) => payment.type === expectedPaymentType)
      .reduce((total, payment) => total.plus(payment.amount), zero());
    const remainingAmount = clampPositive(invoice.totalAmount.minus(paidTotal));
    const dueDate = invoice.dueDate ?? todayStart;
    const dayDiff = Math.ceil(
      (dueDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: invoice.id,
      dueDate,
      invoiceNumber: invoice.invoiceNumber,
      companyName: invoice.company.name,
      type: invoice.type,
      totalAmount: invoice.totalAmount,
      paidTotal,
      remainingAmount,
      currency: invoice.currency,
      status: invoice.status,
      dayDiff,
    };
  });

  const currencies = Array.from(new Set(rows.map((row) => row.currency))).sort((a, b) =>
    a.localeCompare(b),
  );

  return { rows, currencies, today: todayStart };
}

export async function getExpenseCategoryReport(month?: string, year?: string) {
  const range = getMonthRange(month, year);
  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      status: { not: "CANCELLED" },
      expenseDate: { gte: range.start, lt: range.end },
    },
    include: { category: { select: { name: true } } },
    orderBy: { expenseDate: "desc" },
  });

  const rowsMap = new Map<
    string,
    {
      category: string;
      currency: string;
      count: number;
      totalAmount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      unpaidAmount: Prisma.Decimal;
    }
  >();

  for (const expense of expenses) {
    const category = expense.category?.name ?? "Kategorisiz";
    const key = `${category}:${expense.currency}`;
    const row = rowsMap.get(key) ?? {
      category,
      currency: expense.currency,
      count: 0,
      totalAmount: zero(),
      paidAmount: zero(),
      unpaidAmount: zero(),
    };
    row.count += 1;
    row.totalAmount = row.totalAmount.plus(expense.amount);

    if (expense.status === "PAID") {
      row.paidAmount = row.paidAmount.plus(expense.amount);
    } else {
      row.unpaidAmount = row.unpaidAmount.plus(expense.amount);
    }

    rowsMap.set(key, row);
  }

  const rows = Array.from(rowsMap.values()).sort((first, second) =>
    second.totalAmount.comparedTo(first.totalAmount),
  );
  const totalByCurrency = sumByCurrency(
    rows.map((row) => ({ currency: row.currency, amount: row.totalAmount })),
  );
  const maxByCurrency = new Map<string, Prisma.Decimal>();

  for (const row of rows) {
    const current = maxByCurrency.get(row.currency) ?? zero();
    if (row.totalAmount.greaterThan(current)) {
      maxByCurrency.set(row.currency, row.totalAmount);
    }
  }

  return {
    range,
    rows,
    totalByCurrency: toMoneyItems(totalByCurrency),
    topCategory: rows[0] ?? null,
    maxByCurrency,
  };
}

export function getAccountTypeFilter(value?: string) {
  if (value && Object.values(FinancialAccountType).includes(value as FinancialAccountType)) {
    return value as FinancialAccountType;
  }

  return undefined;
}

export function getActiveFilter(value?: string) {
  if (value === "active") {
    return true;
  }

  if (value === "passive") {
    return false;
  }

  return undefined;
}

export async function getAccountsSummaryReport(filters: {
  type?: string;
  active?: string;
  currency?: string;
}) {
  const accountType = getAccountTypeFilter(filters.type);
  const active = getActiveFilter(filters.active);
  const currency = filters.currency?.trim() || undefined;
  const accounts = await prisma.financialAccount.findMany({
    where: {
      deletedAt: null,
      ...(accountType ? { type: accountType } : {}),
      ...(active !== undefined ? { isActive: active } : {}),
      ...(currency ? { currency } : {}),
    },
    include: {
      payments: {
        where: { deletedAt: null },
        select: { type: true, amount: true },
      },
      expenses: {
        where: { deletedAt: null, status: "PAID" },
        select: { amount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = accounts.map((account) => {
    const collectionTotal = account.payments
      .filter((payment) => payment.type === "COLLECTION")
      .reduce((total, payment) => total.plus(payment.amount), zero());
    const paymentTotal = account.payments
      .filter((payment) => payment.type === "PAYMENT")
      .reduce((total, payment) => total.plus(payment.amount), zero());
    const expenseTotal = account.expenses.reduce(
      (total, expense) => total.plus(expense.amount),
      zero(),
    );
    const estimatedBalance = account.openingBalance
      .plus(collectionTotal)
      .minus(paymentTotal)
      .minus(expenseTotal);

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      bankName: account.bankName,
      currency: account.currency,
      isActive: account.isActive,
      openingBalance: account.openingBalance,
      collectionTotal,
      paymentTotal,
      expenseTotal,
      estimatedBalance,
    };
  });

  const currencies = Array.from(new Set(rows.map((row) => row.currency))).sort((a, b) =>
    a.localeCompare(b),
  );

  return { rows, currencies };
}
