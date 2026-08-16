import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeExtractedInvoiceDraft,
  type CanonicalExtractedInvoiceDraft,
} from "../src/lib/ai-invoice-extraction-core.ts";
import {
  AiPostingValidationError,
  normalizeDraftFromForm,
  prepareAiDraftForPosting,
  readProductSelections,
} from "../src/lib/ai-posting-utils.ts";

function reviewedDraft(overrides?: Partial<CanonicalExtractedInvoiceDraft>): CanonicalExtractedInvoiceDraft {
  const draft = normalizeExtractedInvoiceDraft({
    companyName: "Oz Mert Teknoloji",
    taxNumber: "1234567890",
    invoiceNumber: "AI-100",
    invoiceDate: "16.08.2026",
    currency: "TRY",
    subtotal: "100",
    vatAmount: "20",
    discountAmount: "0",
    totalAmount: "120",
    lineItems: [
      {
        description: "Nitril Eldiven",
        sku: "ELD-NIT-M",
        barcode: "869000000001",
        quantity: "1",
        unit: "ADET",
        unitPrice: "100",
        discountAmount: "0",
        vatRate: "20",
        lineTotal: "120",
      },
    ],
  });

  return {
    ...draft,
    ...overrides,
    document: { ...draft.document, ...overrides?.document },
    lineItems: overrides?.lineItems ?? draft.lineItems,
    review: {
      ...draft.review,
      status: "REVIEWED",
      selectedCompanyId: "company-1",
      invoiceType: "PURCHASE",
      reviewedAt: "2026-08-16T00:00:00.000Z",
      ...overrides?.review,
    },
  };
}

function formFromDraft(draft = reviewedDraft()) {
  const formData = new FormData();
  formData.set("companyId", draft.review.selectedCompanyId ?? "company-1");
  formData.set("invoiceType", draft.review.invoiceType);
  formData.set("companyName", draft.document.companyName ?? "");
  formData.set("taxNumber", draft.document.taxNumber ?? "");
  formData.set("taxOffice", draft.document.taxOffice ?? "");
  formData.set("invoiceNumber", draft.document.invoiceNumber ?? "");
  formData.set("invoiceDate", draft.document.invoiceDate ?? "");
  formData.set("dueDate", draft.document.dueDate ?? "");
  formData.set("currency", draft.document.currency ?? "TRY");
  formData.set("subtotal", draft.document.subtotal ?? "");
  formData.set("vatAmount", draft.document.vatAmount ?? "");
  formData.set("discountAmount", draft.document.discountAmount ?? "0");
  formData.set("totalAmount", draft.document.totalAmount ?? "");
  formData.set("lineCount", String(draft.lineItems.length));

  draft.lineItems.forEach((line, index) => {
    formData.set(`line-${index}-productId`, "product-1");
    formData.set(`line-${index}-description`, line.description ?? "");
    formData.set(`line-${index}-sku`, line.sku ?? "");
    formData.set(`line-${index}-barcode`, line.barcode ?? "");
    formData.set(`line-${index}-quantity`, line.quantity ?? "");
    formData.set(`line-${index}-unit`, line.unit ?? "ADET");
    formData.set(`line-${index}-unitPrice`, line.unitPrice ?? "");
    formData.set(`line-${index}-discountAmount`, line.discountAmount ?? "0");
    formData.set(`line-${index}-vatRate`, line.vatRate ?? "");
    formData.set(`line-${index}-lineTotal`, line.lineTotal ?? "");
  });

  return formData;
}

function prepare(input?: {
  draft?: CanonicalExtractedInvoiceDraft;
  companyId?: string;
  invoiceType?: string;
  productId?: string | null;
  createNew?: boolean;
}) {
  const draft = input?.draft ?? reviewedDraft();

  return prepareAiDraftForPosting({
    draft,
    companyId: input?.companyId ?? "company-1",
    invoiceType: input?.invoiceType ?? "PURCHASE",
    productSelections: draft.lineItems.map(() => ({
      productId: input?.productId === undefined ? "product-1" : input.productId,
      createNew: input?.createNew ?? false,
      sku: "ELD-NIT-M",
      barcode: "869000000001",
    })),
  });
}

test("reviewed purchase draft prepares invoice totals without creating accounting or stock rows", () => {
  const prepared = prepare();

  assert.equal(prepared.invoiceType, "PURCHASE");
  assert.equal(prepared.companyId, "company-1");
  assert.equal(prepared.totals.totalAmount.toString(), "120");
  assert.equal("invoiceId" in prepared, false);
  assert.equal("stockMovementId" in prepared, false);
});

test("reviewed sales draft prepares stock-sensitive sale inputs", () => {
  const prepared = prepare({ invoiceType: "SALES" });

  assert.equal(prepared.invoiceType, "SALES");
  assert.equal(prepared.lineInputs[0]?.quantity, "1");
  assert.equal(prepared.productSelections[0]?.productId, "product-1");
});

test("draft must be explicitly reviewed before posting", () => {
  const draft = reviewedDraft({ review: { ...reviewedDraft().review, status: "DRAFT" } });

  assert.throws(() => prepare({ draft }), AiPostingValidationError);
});

test("missing company selection is preserved for route-level rejection", () => {
  const prepared = prepare({ companyId: "" });

  assert.equal(prepared.companyId, null);
  assert.equal(prepared.createNewCompany, false);
});

test("new company marker is explicit and does not invent an id", () => {
  const prepared = prepare({ companyId: "__NEW__" });

  assert.equal(prepared.companyId, null);
  assert.equal(prepared.createNewCompany, true);
});

test("free-text product line remains product-unresolved", () => {
  const prepared = prepare({ productId: null });

  assert.equal(prepared.productSelections[0]?.productId, null);
  assert.equal(prepared.productSelections[0]?.createNew, false);
});

test("new product marker carries user-confirmed SKU and barcode only", () => {
  const prepared = prepare({ productId: null, createNew: true });

  assert.equal(prepared.productSelections[0]?.createNew, true);
  assert.equal(prepared.productSelections[0]?.sku, "ELD-NIT-M");
  assert.equal(prepared.productSelections[0]?.barcode, "869000000001");
});

test("header total discrepancy blocks posting", () => {
  const draft = reviewedDraft({
    document: { ...reviewedDraft().document, totalAmount: "999" },
    validation: {
      status: "WARNING",
      tolerance: "0.02",
      warnings: ["Genel toplam hesaplanan toplamla uyusmuyor."],
    },
  });

  assert.throws(() => prepare({ draft }), AiPostingValidationError);
});

test("line total discrepancy blocks posting", () => {
  const draft = reviewedDraft({
    lineItems: [{ ...reviewedDraft().lineItems[0]!, lineTotal: "999" }],
    validation: {
      status: "WARNING",
      tolerance: "0.02",
      warnings: ["1. satir toplami hesapla uyusmuyor."],
    },
  });

  assert.throws(() => prepare({ draft }), AiPostingValidationError);
});

test("product selection count must match line count", () => {
  const draft = reviewedDraft();

  assert.throws(
    () =>
      prepareAiDraftForPosting({
        draft,
        companyId: "company-1",
        invoiceType: "PURCHASE",
        productSelections: [],
      }),
    AiPostingValidationError,
  );
});

test("invalid line quantities are rejected before posting", () => {
  const draft = reviewedDraft({
    lineItems: [{ ...reviewedDraft().lineItems[0]!, quantity: "0" }],
  });

  assert.throws(() => prepare({ draft }), AiPostingValidationError);
});

test("form normalization keeps user edits and recalculates review validation", () => {
  const draft = reviewedDraft();
  const formData = formFromDraft(draft);
  formData.set("invoiceNumber", " AI 200 ");
  formData.set("taxNumber", "123 456 7890");

  const normalized = normalizeDraftFromForm(draft, formData);

  assert.equal(normalized.document.invoiceNumber, "AI 200");
  assert.equal(normalized.document.taxNumber, "1234567890");
  assert.equal(normalized.review.status, "REVIEWED");
  assert.equal(normalized.validation.status, "OK");
});

test("form product selections read existing, new and free-text states", () => {
  const formData = formFromDraft(reviewedDraft());
  formData.set("lineCount", "3");
  formData.set("line-0-productId", "product-1");
  formData.set("line-1-productId", "__NEW__");
  formData.set("line-1-sku", "NEW-1");
  formData.set("line-2-productId", "");

  const selections = readProductSelections(formData);

  assert.deepEqual(selections.map((selection) => selection.productId), ["product-1", null, null]);
  assert.deepEqual(selections.map((selection) => selection.createNew), [false, true, false]);
  assert.equal(selections[1]?.sku, "NEW-1");
});
