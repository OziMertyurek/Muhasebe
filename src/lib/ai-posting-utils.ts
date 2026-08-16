import { InvoiceType, Prisma, type ProductUnit } from "#prisma/client";
import {
  type CanonicalExtractedInvoiceDraft,
  type CanonicalExtractedInvoiceLine,
  normalizeCurrencyCode,
  normalizeDateText,
  normalizeDecimalText,
  normalizeInvoiceNumber,
  normalizeProductUnit,
  normalizeTaxIdentity,
  validateExtractedInvoiceTotals,
} from "./ai-invoice-extraction-core.ts";
import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  validateInvoiceLines,
  type InvoiceLineCalculationInput,
  type InvoiceLineCalculationResult,
} from "./invoice-line-item-utils.ts";

export type AiPostingProductSelection = {
  productId: string | null;
  createNew: boolean;
  sku: string | null;
  barcode: string | null;
};

export type AiPostingPreparedDraft = {
  draft: CanonicalExtractedInvoiceDraft;
  companyId: string | null;
  createNewCompany: boolean;
  invoiceType: InvoiceType;
  invoiceDate: Date;
  dueDate: Date | null;
  lineInputs: InvoiceLineCalculationInput[];
  calculatedLines: InvoiceLineCalculationResult[];
  productSelections: AiPostingProductSelection[];
  units: ProductUnit[];
  totals: ReturnType<typeof calculateInvoiceTotals>;
};

export class AiPostingValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AiPostingValidationError";
    this.code = code;
  }
}

export function prepareAiDraftForPosting(input: {
  draft: CanonicalExtractedInvoiceDraft;
  companyId: string;
  invoiceType: string;
  productSelections: AiPostingProductSelection[];
}): AiPostingPreparedDraft {
  if (input.draft.review.status !== "REVIEWED") {
    throw new AiPostingValidationError("draft-not-reviewed", "Taslak once incelenmeli.");
  }

  if (!Object.values(InvoiceType).includes(input.invoiceType as InvoiceType)) {
    throw new AiPostingValidationError("invoice-type", "Fatura tipi secilmeli.");
  }

  if (!input.draft.document.invoiceNumber) {
    throw new AiPostingValidationError("invoice-number", "Fatura no zorunlu.");
  }

  const invoiceDate = parseDateForPosting(input.draft.document.invoiceDate);
  if (!invoiceDate) {
    throw new AiPostingValidationError("invoice-date", "Fatura tarihi gecersiz.");
  }

  const dueDate = parseDateForPosting(input.draft.document.dueDate);
  const invoiceType = input.invoiceType as InvoiceType;
  const lineInputs = input.draft.lineItems.map(toInvoiceLineInput);
  const validationErrors = validateInvoiceLines(lineInputs);

  if (validationErrors.length > 0) {
    throw new AiPostingValidationError(
      "line-validation",
      validationErrors.map((error) => error.message).join(" "),
    );
  }

  if (input.productSelections.length !== lineInputs.length) {
    throw new AiPostingValidationError("product-selection", "Urun secimleri satirlarla uyumlu degil.");
  }

  const calculatedLines = lineInputs.map(calculateInvoiceLine);
  const totals = calculateInvoiceTotals(lineInputs);

  if (input.draft.validation.status !== "OK") {
    throw new AiPostingValidationError("totals", "Fatura toplamlarinda kontrol gereken fark var.");
  }

  const reconciliation = validateExtractedInvoiceTotals({
    document: {
      subtotal: totals.subtotal.toString(),
      vatAmount: totals.vatAmount.toString(),
      discountAmount: totals.discountAmount.toString(),
      totalAmount: totals.totalAmount.toString(),
    },
    lineItems: input.draft.lineItems,
  });

  if (reconciliation.status !== "OK") {
    throw new AiPostingValidationError("totals", "Fatura toplamlarinda kontrol gereken fark var.");
  }

  return {
    draft: input.draft,
    companyId: input.companyId === "__NEW__" ? null : input.companyId || null,
    createNewCompany: input.companyId === "__NEW__",
    invoiceType,
    invoiceDate,
    dueDate,
    lineInputs,
    calculatedLines,
    productSelections: input.productSelections,
    units: input.draft.lineItems.map((line) => line.unit ?? "ADET"),
    totals,
  };
}

export function normalizeDraftFromForm(
  draft: CanonicalExtractedInvoiceDraft,
  formData: FormData,
): CanonicalExtractedInvoiceDraft {
  const lineItems = readLineItems(formData);
  const document = {
    companyName: optionalFormText(formData, "companyName"),
    taxNumber: normalizeTaxIdentity(readFormText(formData, "taxNumber")),
    taxOffice: optionalFormText(formData, "taxOffice"),
    invoiceNumber: normalizeInvoiceNumber(readFormText(formData, "invoiceNumber")),
    invoiceDate: normalizeDateText(readFormText(formData, "invoiceDate")),
    dueDate: normalizeDateText(readFormText(formData, "dueDate")),
    currency: normalizeCurrencyCode(readFormText(formData, "currency")) ?? "TRY",
    subtotal: normalizeDecimalText(readFormText(formData, "subtotal")),
    vatAmount: normalizeDecimalText(readFormText(formData, "vatAmount")),
    discountAmount: normalizeDecimalText(readFormText(formData, "discountAmount")) ?? "0",
    totalAmount: normalizeDecimalText(readFormText(formData, "totalAmount")),
    notes: draft.document.notes,
  };

  return {
    ...draft,
    document,
    lineItems,
    validation: validateExtractedInvoiceTotals({ document, lineItems }),
    review: {
      ...draft.review,
      status: "REVIEWED" as const,
      selectedCompanyId: readFormText(formData, "companyId") || null,
      invoiceType: getInvoiceType(readFormText(formData, "invoiceType")),
      reviewedAt: new Date().toISOString(),
    },
  };
}

export function readProductSelections(formData: FormData): AiPostingProductSelection[] {
  const lineCount = readLineCount(formData);

  return Array.from({ length: lineCount }, (_, index) => {
    const productId = readFormText(formData, `line-${index}-productId`);

    return {
      productId: productId && productId !== "__NEW__" ? productId : null,
      createNew: productId === "__NEW__",
      sku: optionalFormText(formData, `line-${index}-sku`),
      barcode: optionalFormText(formData, `line-${index}-barcode`),
    };
  });
}

export function readFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalFormText(formData: FormData, key: string) {
  const value = readFormText(formData, key);
  return value || null;
}

function readLineItems(formData: FormData): CanonicalExtractedInvoiceLine[] {
  const lineCount = readLineCount(formData);

  return Array.from({ length: lineCount }, (_, index) => ({
    description: optionalFormText(formData, `line-${index}-description`),
    sku: optionalFormText(formData, `line-${index}-sku`),
    barcode: optionalFormText(formData, `line-${index}-barcode`),
    quantity: normalizeDecimalText(readFormText(formData, `line-${index}-quantity`)),
    unit: normalizeProductUnit(readFormText(formData, `line-${index}-unit`)),
    unitPrice: normalizeDecimalText(readFormText(formData, `line-${index}-unitPrice`)),
    discountAmount: normalizeDecimalText(readFormText(formData, `line-${index}-discountAmount`)) ?? "0",
    vatRate: normalizeDecimalText(readFormText(formData, `line-${index}-vatRate`)),
    lineTotal: normalizeDecimalText(readFormText(formData, `line-${index}-lineTotal`)),
    warnings: [],
  }));
}

function toInvoiceLineInput(line: CanonicalExtractedInvoiceLine): InvoiceLineCalculationInput {
  return {
    description: line.description ?? "",
    quantity: line.quantity ?? "",
    unitPrice: line.unitPrice ?? "",
    vatRate: line.vatRate ?? "",
    discountAmount: line.discountAmount ?? "0",
  };
}

function readLineCount(formData: FormData) {
  const value = Number(readFormText(formData, "lineCount"));
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function getInvoiceType(value: string) {
  return value === "SALES" || value === "PURCHASE" ? value : "UNKNOWN" as const;
}

function parseDateForPosting(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}
