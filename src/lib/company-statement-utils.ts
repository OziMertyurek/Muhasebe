import { Prisma } from "#prisma/client";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { prisma } from "@/lib/prisma";

export type StatementMovementType = "invoices" | "payments" | "expenses";

export type StatementFilters = {
  dateFrom?: Date;
  dateToExclusive?: Date;
  type?: StatementMovementType;
  currency?: string;
};

export type CompanyStatementMovement = {
  id: string;
  sourceId: string;
  date: Date;
  createdAt: Date;
  type: StatementMovementType;
  label: string;
  reference: string;
  description: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balance: Prisma.Decimal;
  currency: string;
  href: string;
};

type MoneyMap = Map<string, Prisma.Decimal>;

function zero() {
  return new Prisma.Decimal(0);
}

function getInvoiceLabel(type: "SALES" | "PURCHASE") {
  return type === "SALES" ? "Ben fatura kestim" : "Bana fatura kesildi";
}

function getPaymentLabel(type: "COLLECTION" | "PAYMENT") {
  return type === "COLLECTION" ? "Para aldÄ±m" : "Para Ã¶dedim";
}

function addMoney(map: MoneyMap, currency: string, amount: Prisma.Decimal) {
  map.set(currency, (map.get(currency) ?? zero()).plus(amount));
}

function subtractMoney(map: MoneyMap, currency: string, amount: Prisma.Decimal) {
  map.set(currency, (map.get(currency) ?? zero()).minus(amount));
}

function toMoneyItems(map: MoneyMap) {
  return Array.from(map.entries())
    .filter(([, amount]) => !amount.equals(0))
    .sort(([firstCurrency], [secondCurrency]) => firstCurrency.localeCompare(secondCurrency))
    .map(([currency, amount]) => ({ currency, amount }));
}

function clampPositive(amount: Prisma.Decimal) {
  return amount.lessThan(0) ? zero() : amount;
}

function inDateRange(date: Date, filters: StatementFilters) {
  if (filters.dateFrom && date < filters.dateFrom) {
    return false;
  }

  if (filters.dateToExclusive && date >= filters.dateToExclusive) {
    return false;
  }

  return true;
}

function typeMatches(type: StatementMovementType, filters: StatementFilters) {
  return !filters.type || filters.type === type;
}

function currencyMatches(currency: string, filters: StatementFilters) {
  return !filters.currency || filters.currency === currency;
}

export function parseStatementDateFilter(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getStatementDateToExclusive(value?: string) {
  const date = parseStatementDateFilter(value);

  if (!date) {
    return undefined;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function getStatementType(value?: string) {
  if (value === "invoices" || value === "payments" || value === "expenses") {
    return value;
  }

  return undefined;
}

export function formatStatementMoney(value: { toNumber: () => number }, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}

export function formatStatementSignedMoney(
  value: { toNumber: () => number },
  currency: string,
) {
  const amount = value.toNumber();
  const formatted = formatStatementMoney({ toNumber: () => Math.abs(amount) }, currency);

  if (amount > 0) {
    return `+${formatted}`;
  }

  if (amount < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export async function getCompanyStatement(companyId: string, filters: StatementFilters = {}) {
  const [company, invoices, payments, expenses] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    }),
    prisma.invoice.findMany({
      where: { companyId, deletedAt: null, status: { not: "CANCELLED" } },
      orderBy: { invoiceDate: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        type: true,
        totalAmount: true,
        currency: true,
        notes: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { paymentDate: "asc" },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        paymentDate: true,
        description: true,
        createdAt: true,
        invoice: { select: { invoiceNumber: true } },
      },
    }),
    prisma.expense.findMany({
      where: { companyId, deletedAt: null, status: { not: "CANCELLED" } },
      orderBy: { expenseDate: "asc" },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        expenseDate: true,
        status: true,
        description: true,
        createdAt: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const rawMovements: Array<Omit<CompanyStatementMovement, "balance">> = [];
  const summaryMaps = {
    totalSales: new Map<string, Prisma.Decimal>(),
    totalPurchases: new Map<string, Prisma.Decimal>(),
    totalCollections: new Map<string, Prisma.Decimal>(),
    totalPayments: new Map<string, Prisma.Decimal>(),
    totalExpenses: new Map<string, Prisma.Decimal>(),
    remainingReceivable: new Map<string, Prisma.Decimal>(),
    remainingPayable: new Map<string, Prisma.Decimal>(),
    netBalance: new Map<string, Prisma.Decimal>(),
  };

  for (const invoice of invoices) {
    if (
      !typeMatches("invoices", filters) ||
      !currencyMatches(invoice.currency, filters) ||
      !inDateRange(invoice.invoiceDate, filters)
    ) {
      continue;
    }

    const isSales = invoice.type === "SALES";
    const debit = isSales ? zero() : invoice.totalAmount;
    const credit = isSales ? invoice.totalAmount : zero();

    rawMovements.push({
      id: `invoice-${invoice.id}`,
      sourceId: invoice.id,
      date: invoice.invoiceDate,
      createdAt: invoice.createdAt,
      type: "invoices",
      label: getInvoiceLabel(invoice.type),
      reference: invoice.invoiceNumber,
      description: invoice.notes || "Fatura kaydÄ±",
      debit,
      credit,
      currency: invoice.currency,
      href: `/invoices/${invoice.id}`,
    });
  }

  for (const payment of payments) {
    if (
      !typeMatches("payments", filters) ||
      !currencyMatches(payment.currency, filters) ||
      !inDateRange(payment.paymentDate, filters)
    ) {
      continue;
    }

    const isCollection = payment.type === "COLLECTION";
    const debit = isCollection ? payment.amount : zero();
    const credit = isCollection ? zero() : payment.amount;

    rawMovements.push({
      id: `payment-${payment.id}`,
      sourceId: payment.id,
      date: payment.paymentDate,
      createdAt: payment.createdAt,
      type: "payments",
      label: getPaymentLabel(payment.type),
      reference: payment.invoice?.invoiceNumber ?? "-",
      description: payment.description || "Tahsilat / Ã¶deme hareketi",
      debit,
      credit,
      currency: payment.currency,
      href: `/payments/${payment.id}`,
    });
  }

  for (const expense of expenses) {
    if (
      !typeMatches("expenses", filters) ||
      !currencyMatches(expense.currency, filters) ||
      !inDateRange(expense.expenseDate, filters)
    ) {
      continue;
    }

    rawMovements.push({
      id: `expense-${expense.id}`,
      sourceId: expense.id,
      date: expense.expenseDate,
      createdAt: expense.createdAt,
      type: "expenses",
      label: "Gider",
      reference: expense.title,
      description:
        expense.description ||
        `${expense.category?.name ?? "Kategori yok"} Â· ${expenseStatusLabels[expense.status]}`,
      debit: expense.amount,
      credit: zero(),
      currency: expense.currency,
      href: `/expenses/${expense.id}`,
    });
  }

  for (const invoice of invoices) {
    if (invoice.type === "SALES") {
      addMoney(summaryMaps.totalSales, invoice.currency, invoice.totalAmount);
      addMoney(summaryMaps.remainingReceivable, invoice.currency, invoice.totalAmount);
      addMoney(summaryMaps.netBalance, invoice.currency, invoice.totalAmount);
    } else {
      addMoney(summaryMaps.totalPurchases, invoice.currency, invoice.totalAmount);
      addMoney(summaryMaps.remainingPayable, invoice.currency, invoice.totalAmount);
      subtractMoney(summaryMaps.netBalance, invoice.currency, invoice.totalAmount);
    }
  }

  for (const payment of payments) {
    if (payment.type === "COLLECTION") {
      addMoney(summaryMaps.totalCollections, payment.currency, payment.amount);
      subtractMoney(summaryMaps.remainingReceivable, payment.currency, payment.amount);
      subtractMoney(summaryMaps.netBalance, payment.currency, payment.amount);
    } else {
      addMoney(summaryMaps.totalPayments, payment.currency, payment.amount);
      subtractMoney(summaryMaps.remainingPayable, payment.currency, payment.amount);
      addMoney(summaryMaps.netBalance, payment.currency, payment.amount);
    }
  }

  for (const expense of expenses) {
    addMoney(summaryMaps.totalExpenses, expense.currency, expense.amount);
    addMoney(summaryMaps.remainingPayable, expense.currency, expense.amount);
    subtractMoney(summaryMaps.netBalance, expense.currency, expense.amount);
  }

  const balances = new Map<string, Prisma.Decimal>();
  const movements = rawMovements
    .sort((first, second) => {
      const dateDiff = first.date.getTime() - second.date.getTime();

      if (dateDiff !== 0) {
        return dateDiff;
      }

      return first.createdAt.getTime() - second.createdAt.getTime();
    })
    .map((movement) => {
      const currentBalance = (balances.get(movement.currency) ?? zero())
        .plus(movement.credit)
        .minus(movement.debit);
      balances.set(movement.currency, currentBalance);

      return {
        ...movement,
        balance: currentBalance,
      };
    });

  const currencies = Array.from(
    new Set([
      ...invoices.map((invoice) => invoice.currency),
      ...payments.map((payment) => payment.currency),
      ...expenses.map((expense) => expense.currency),
    ]),
  ).sort((firstCurrency, secondCurrency) => firstCurrency.localeCompare(secondCurrency));

  return {
    company,
    movements,
    recentInvoices: invoices
      .slice()
      .sort((first, second) => second.invoiceDate.getTime() - first.invoiceDate.getTime())
      .slice(0, 5),
    recentPayments: payments
      .slice()
      .sort((first, second) => second.paymentDate.getTime() - first.paymentDate.getTime())
      .slice(0, 5),
    recentExpenses: expenses
      .slice()
      .sort((first, second) => second.expenseDate.getTime() - first.expenseDate.getTime())
      .slice(0, 5),
    currencies,
    summary: {
      totalSales: toMoneyItems(summaryMaps.totalSales),
      totalPurchases: toMoneyItems(summaryMaps.totalPurchases),
      totalCollections: toMoneyItems(summaryMaps.totalCollections),
      totalPayments: toMoneyItems(summaryMaps.totalPayments),
      totalExpenses: toMoneyItems(summaryMaps.totalExpenses),
      remainingReceivable: toMoneyItems(
        new Map(
          Array.from(summaryMaps.remainingReceivable.entries()).map(([currency, amount]) => [
            currency,
            clampPositive(amount),
          ]),
        ),
      ),
      remainingPayable: toMoneyItems(
        new Map(
          Array.from(summaryMaps.remainingPayable.entries()).map(([currency, amount]) => [
            currency,
            clampPositive(amount),
          ]),
        ),
      ),
      netBalance: toMoneyItems(summaryMaps.netBalance),
    },
  };
}
