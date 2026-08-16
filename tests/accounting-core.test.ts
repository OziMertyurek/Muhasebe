import assert from "node:assert/strict";
import test from "node:test";
import { InvoiceType, PaymentType, Prisma } from "@prisma/client";
import {
  AccountingValidationError,
  assertInvoiceCanBeDeleted,
  assertInvoiceIdentityEditableWithPayments,
  assertPaymentMatchesInvoice,
  deriveInvoiceStatus,
  getExpectedPaymentType,
  getInvoicePaidTotal,
  getInvoiceRemainingAmount,
} from "../src/lib/accounting-core.ts";
import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  validateInvoiceLines,
} from "../src/lib/invoice-line-item-utils.ts";

function money(value: string | number) {
  return new Prisma.Decimal(value);
}

function invoice(type: InvoiceType, totalAmount: string | number) {
  return {
    id: "invoice-1",
    companyId: "company-1",
    type,
    currency: "TRY",
    totalAmount: money(totalAmount),
  };
}

test("sales invoice expects collection and collection reduces remaining receivable", () => {
  const salesInvoice = invoice("SALES", "1200");

  assert.equal(getExpectedPaymentType("SALES"), "COLLECTION");
  assert.equal(
    getInvoicePaidTotal(salesInvoice, [
      { type: "COLLECTION", amount: money("400"), currency: "TRY" },
    ]).toString(),
    "400",
  );
  assert.equal(
    getInvoiceRemainingAmount(salesInvoice, [
      { type: "COLLECTION", amount: money("400"), currency: "TRY" },
    ]).toString(),
    "800",
  );
});

test("partial and full collections derive invoice payment status", () => {
  const salesInvoice = invoice("SALES", "1200");

  assert.equal(
    deriveInvoiceStatus(salesInvoice, [{ type: "COLLECTION", amount: money("400"), currency: "TRY" }]),
    "PARTIAL",
  );
  assert.equal(
    deriveInvoiceStatus(salesInvoice, [{ type: "COLLECTION", amount: money("1200"), currency: "TRY" }]),
    "PAID",
  );
});

test("purchase invoice expects supplier payment", () => {
  const purchaseInvoice = invoice("PURCHASE", "900");

  assert.equal(getExpectedPaymentType("PURCHASE"), "PAYMENT");
  assert.equal(
    deriveInvoiceStatus(purchaseInvoice, [{ type: "PAYMENT", amount: money("900"), currency: "TRY" }]),
    "PAID",
  );
});

test("wrong linked payment direction is rejected", () => {
  assert.throws(
    () =>
      assertPaymentMatchesInvoice(
        { type: "PAYMENT", companyId: "company-1", currency: "TRY", amount: money("100") },
        invoice("SALES", "500"),
        [],
      ),
    AccountingValidationError,
  );
});

test("overpayment is rejected", () => {
  assert.throws(
    () =>
      assertPaymentMatchesInvoice(
        { type: "COLLECTION", companyId: "company-1", currency: "TRY", amount: money("301") },
        invoice("SALES", "500"),
        [{ type: "COLLECTION", amount: money("200"), currency: "TRY" }],
      ),
    AccountingValidationError,
  );
});

test("multiple line items calculate VAT, discount, and grand total with HALF_UP rounding", () => {
  const lines = [
    calculateInvoiceLine({
      description: "Danismanlik",
      quantity: "2",
      unitPrice: "100.005",
      vatRate: "20",
      discountAmount: "10",
    }),
    calculateInvoiceLine({
      description: "Servis",
      quantity: "1",
      unitPrice: "50",
      vatRate: "10",
      discountAmount: "0",
    }),
  ];
  const totals = calculateInvoiceTotals(lines);

  assert.equal(totals.subtotal.toString(), "250.02");
  assert.equal(totals.discountAmount.toString(), "10");
  assert.equal(totals.vatAmount.toString(), "43");
  assert.equal(totals.totalAmount.toString(), "283.02");
});

test("invalid line inputs are rejected", () => {
  const errors = validateInvoiceLines([
    {
      description: "",
      quantity: "0",
      unitPrice: "-1",
      vatRate: "-20",
      discountAmount: "-1",
    },
  ]);

  assert.deepEqual(
    errors.map((error) => error.code),
    [
      "DESCRIPTION_REQUIRED",
      "QUANTITY_POSITIVE",
      "UNIT_PRICE_NON_NEGATIVE",
      "VAT_RATE_NON_NEGATIVE",
      "DISCOUNT_NON_NEGATIVE",
    ],
  );
});

test("editing or deleting financial records recalculates derived status from remaining payments", () => {
  const salesInvoice = invoice("SALES", "1000");
  const fullPayments = [
    { type: "COLLECTION" as PaymentType, amount: money("400"), currency: "TRY" },
    { type: "COLLECTION" as PaymentType, amount: money("600"), currency: "TRY" },
  ];
  const afterDelete = [fullPayments[0]];
  const afterEdit = [
    { type: "COLLECTION" as PaymentType, amount: money("400"), currency: "TRY" },
    { type: "COLLECTION" as PaymentType, amount: money("500"), currency: "TRY" },
  ];

  assert.equal(deriveInvoiceStatus(salesInvoice, fullPayments), "PAID");
  assert.equal(deriveInvoiceStatus(salesInvoice, afterDelete), "PARTIAL");
  assert.equal(getInvoiceRemainingAmount(salesInvoice, afterEdit).toString(), "100");
});

test("paid invoice identity fields cannot be changed while payments exist", () => {
  const current = {
    companyId: "company-1",
    type: "SALES" as InvoiceType,
    currency: "TRY",
    status: "PARTIAL" as const,
  };

  assert.throws(
    () =>
      assertInvoiceIdentityEditableWithPayments(
        current,
        { ...current, companyId: "company-2" },
        1,
      ),
    AccountingValidationError,
  );
  assert.throws(
    () =>
      assertInvoiceIdentityEditableWithPayments(
        current,
        { ...current, type: "PURCHASE" },
        1,
      ),
    AccountingValidationError,
  );
  assert.throws(
    () =>
      assertInvoiceIdentityEditableWithPayments(
        current,
        { ...current, currency: "USD" },
        1,
      ),
    AccountingValidationError,
  );
  assert.throws(
    () =>
      assertInvoiceIdentityEditableWithPayments(
        current,
        { ...current, status: "CANCELLED" },
        1,
      ),
    AccountingValidationError,
  );
});

test("invoice with active payments cannot be deleted", () => {
  assert.doesNotThrow(() => assertInvoiceCanBeDeleted(0));
  assert.throws(() => assertInvoiceCanBeDeleted(1), AccountingValidationError);
});
