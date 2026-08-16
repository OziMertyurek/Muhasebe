import { InvoiceStatus, InvoiceType, PaymentType, Prisma } from "@prisma/client";

type InvoicePaymentRecord = {
  type: PaymentType;
  amount: Prisma.Decimal;
  currency?: string | null;
};

const zero = new Prisma.Decimal(0);

export class AccountingValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "AccountingValidationError";
    this.field = field;
  }
}

export function getExpectedPaymentType(invoiceType: InvoiceType) {
  return invoiceType === "SALES" ? "COLLECTION" : "PAYMENT";
}

export function getInvoicePaidTotal(
  invoice: { type: InvoiceType; currency: string },
  payments: InvoicePaymentRecord[],
) {
  const expectedPaymentType = getExpectedPaymentType(invoice.type);

  return payments
    .filter(
      (payment) =>
        payment.type === expectedPaymentType &&
        (!payment.currency || payment.currency === invoice.currency),
    )
    .reduce((total, payment) => total.plus(payment.amount), zero);
}

export function getInvoiceRemainingAmount(
  invoice: { type: InvoiceType; currency: string; totalAmount: Prisma.Decimal },
  payments: InvoicePaymentRecord[],
) {
  const remaining = invoice.totalAmount.minus(getInvoicePaidTotal(invoice, payments));
  return remaining.lessThan(0) ? zero : remaining;
}

export function deriveInvoiceStatus(
  invoice: {
    type: InvoiceType;
    currency: string;
    totalAmount: Prisma.Decimal;
    status?: InvoiceStatus;
  },
  payments: InvoicePaymentRecord[],
) {
  if (invoice.status === "CANCELLED") {
    return "CANCELLED" satisfies InvoiceStatus;
  }

  const paidTotal = getInvoicePaidTotal(invoice, payments);

  if (paidTotal.greaterThanOrEqualTo(invoice.totalAmount)) {
    return "PAID" satisfies InvoiceStatus;
  }

  if (paidTotal.greaterThan(0)) {
    return "PARTIAL" satisfies InvoiceStatus;
  }

  return "UNPAID" satisfies InvoiceStatus;
}

export function assertPaymentMatchesInvoice(
  payment: {
    type: PaymentType;
    companyId: string | null;
    currency: string;
    amount: Prisma.Decimal;
  },
  invoice: {
    id: string;
    companyId: string;
    type: InvoiceType;
    currency: string;
    totalAmount: Prisma.Decimal;
  },
  existingPayments: InvoicePaymentRecord[],
) {
  const expectedPaymentType = getExpectedPaymentType(invoice.type);

  if (payment.type !== expectedPaymentType) {
    throw new AccountingValidationError(
      "type",
      invoice.type === "SALES"
        ? "Satış faturası için işlem tipi Para aldım olmalı."
        : "Alış faturası için işlem tipi Para ödedim olmalı.",
    );
  }

  if (payment.companyId && payment.companyId !== invoice.companyId) {
    throw new AccountingValidationError(
      "invoiceId",
      "Seçilen fatura ile cari firma uyumlu olmalı.",
    );
  }

  if (payment.currency !== invoice.currency) {
    throw new AccountingValidationError(
      "currency",
      "Faturaya bağlı hareketin para birimi fatura para birimiyle aynı olmalı.",
    );
  }

  const paidBefore = getInvoicePaidTotal(invoice, existingPayments);
  const paidAfter = paidBefore.plus(payment.amount);

  if (paidAfter.greaterThan(invoice.totalAmount)) {
    throw new AccountingValidationError(
      "amount",
      "Fatura tutarını aşan tahsilat / ödeme kaydedilemez.",
    );
  }
}
