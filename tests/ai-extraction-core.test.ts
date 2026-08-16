import assert from "node:assert/strict";
import test from "node:test";
import {
  AiExtractionValidationError,
  normalizeDateText,
  normalizeDecimalText,
  normalizeExtractedInvoiceDraft,
  parseCanonicalDraftJson,
  validateExtractedInvoiceTotals,
} from "../src/lib/ai-invoice-extraction-core.ts";
import {
  matchCompanyDeterministic,
  matchProductDeterministic,
} from "../src/lib/ai-matching-core.ts";
import {
  mappingMatchesSource,
  normalizeMappingSource,
  validateConfirmedMapping,
} from "../src/lib/ai-confirmed-mapping-utils.ts";

const companies = [
  { id: "c1", name: "Oz Mert Teknoloji Ltd Sti", type: "BOTH" as const, taxNumber: "1234567890" },
  { id: "c2", name: "Ada Gida Limited", type: "SUPPLIER" as const, taxNumber: "2222222222" },
  { id: "c3", name: "Ada Gida Ltd", type: "SUPPLIER" as const, taxNumber: "3333333333" },
];

const products = [
  { id: "p1", name: "Nitril Eldiven M", sku: "ELD-NIT-M", barcode: "869000000001" },
  { id: "p2", name: "Nitril Eldiven L", sku: "ELD-NIT-L", barcode: "869000000002" },
  { id: "p3", name: "Karton Bardak", sku: "BRD-KRT", barcode: null },
];

test("Turkish decimal normalization handles thousands and comma decimals", () => {
  assert.equal(normalizeDecimalText("1.234,56 TL"), "1234.56");
  assert.equal(normalizeDecimalText("2 345,10"), "2345.1");
});

test("date normalization handles Turkish local and ISO forms", () => {
  assert.equal(normalizeDateText("16.08.2026"), "2026-08-16");
  assert.equal(normalizeDateText("2026-08-16"), "2026-08-16");
});

test("tax number exact cari match wins deterministically", () => {
  const match = matchCompanyDeterministic({ taxNumber: "123 456 7890", companyName: "Noisy" }, companies);

  assert.equal(match.status, "EXACT");
  assert.equal(match.matchedId, "c1");
  assert.equal(match.reason, "EXACT_TAX_NUMBER");
});

test("exact normalized company name matches deterministically", () => {
  const match = matchCompanyDeterministic({ taxNumber: null, companyName: "oz mert teknoloji" }, companies);

  assert.equal(match.status, "EXACT");
  assert.equal(match.matchedId, "c1");
});

test("ambiguous cari match does not auto-select", () => {
  const match = matchCompanyDeterministic({ taxNumber: null, companyName: "Ada Gida" }, companies);

  assert.equal(match.status, "AMBIGUOUS");
  assert.equal(match.matchedId, null);
});

test("exact barcode product match wins", () => {
  const match = matchProductDeterministic({ barcode: "869000000001", sku: null, description: null }, products);

  assert.equal(match.status, "EXACT");
  assert.equal(match.matchedId, "p1");
  assert.equal(match.reason, "EXACT_BARCODE");
});

test("exact SKU product match is used after barcode", () => {
  const match = matchProductDeterministic({ barcode: null, sku: "eld-nit-l", description: null }, products);

  assert.equal(match.status, "EXACT");
  assert.equal(match.matchedId, "p2");
});

test("fuzzy product ambiguity does not bind silently", () => {
  const match = matchProductDeterministic({ barcode: null, sku: null, description: "Nitril Eldiven" }, products);

  assert.equal(match.status, "AMBIGUOUS");
  assert.equal(match.matchedId, null);
});

test("unmatched product remains unresolved and free-text capable", () => {
  const match = matchProductDeterministic({ barcode: null, sku: null, description: "Bilinmeyen hizmet" }, products);

  assert.equal(match.status, "NOT_FOUND");
  assert.equal(match.matchedId, null);
  assert.equal(match.originalDescription, "Bilinmeyen hizmet");
});

test("invoice total reconciliation succeeds within tolerance", () => {
  const draft = normalizeExtractedInvoiceDraft({
    invoiceNumber: "A-1",
    invoiceDate: "16.08.2026",
    currency: "TRY",
    subtotal: "100,00",
    vatAmount: "20,00",
    discountAmount: "0",
    totalAmount: "120,00",
    lineItems: [
      {
        description: "Urun",
        quantity: "1",
        unit: "ADET",
        unitPrice: "100",
        vatRate: "20",
        discountAmount: "0",
        lineTotal: "120",
      },
    ],
  });

  assert.equal(draft.validation.status, "OK");
});

test("total discrepancy warning is preserved for review", () => {
  const validation = validateExtractedInvoiceTotals({
    document: { subtotal: "100", vatAmount: "20", discountAmount: "0", totalAmount: "999" },
    lineItems: [
      {
        description: "Urun",
        sku: null,
        barcode: null,
        quantity: "1",
        unit: "ADET",
        unitPrice: "100",
        discountAmount: "0",
        vatRate: "20",
        lineTotal: "120",
        warnings: [],
      },
    ],
  });

  assert.equal(validation.status, "WARNING");
  assert.ok(validation.warnings.some((warning) => warning.includes("Genel toplam")));
});

test("malformed extraction JSON is rejected safely", () => {
  assert.throws(() => parseCanonicalDraftJson("{bad-json"), AiExtractionValidationError);
});

test("AI draft shape creates no stock movement reference", () => {
  const draft = normalizeExtractedInvoiceDraft({ invoiceNumber: "DRAFT-1", lineItems: [] });

  assert.equal("stockMovement" in draft, false);
  assert.equal(draft.review.status, "DRAFT");
});

test("AI draft shape creates no accounting balance or payment reference", () => {
  const draft = normalizeExtractedInvoiceDraft({ invoiceNumber: "DRAFT-1", totalAmount: "100" });

  assert.equal("paymentId" in draft, false);
  assert.equal("financialAccountId" in draft, false);
});

test("user-confirmed mapping normalizes reusable sources", () => {
  const mapping = normalizeMappingSource({ sourceKey: "company_name", sourceValue: "Öz Mert Teknoloji Ltd. Şti." });

  assert.equal(mapping.sourceKey, "COMPANY_NAME");
  assert.equal(mapping.sourceValue, "oz mert teknoloji");
});

test("confirmed mapping validation requires explicit target", () => {
  const invalid = validateConfirmedMapping({
    type: "PRODUCT",
    sourceKey: "SKU",
    sourceValue: "ELD-NIT-M",
  });
  const valid = validateConfirmedMapping({
    type: "PRODUCT",
    sourceKey: "SKU",
    sourceValue: "ELD-NIT-M",
    productId: "p1",
  });

  assert.equal(invalid.ok, false);
  assert.equal(valid.ok, true);
});

test("confirmed mapping can be reused only for the same normalized source", () => {
  assert.equal(
    mappingMatchesSource(
      { sourceKey: "SKU", sourceValue: " eld nit m " },
      { sourceKey: "sku", sourceValue: "ELDNITM" },
    ),
    true,
  );
});
