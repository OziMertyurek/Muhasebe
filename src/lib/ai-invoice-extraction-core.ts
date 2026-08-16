import { Prisma, type ProductUnit } from "#prisma/client";

export type AiMatchStatus = "EXACT" | "HIGH_CONFIDENCE" | "AMBIGUOUS" | "NOT_FOUND";
export type AiTotalValidationStatus = "OK" | "WARNING" | "UNKNOWN";

export type CanonicalExtractedInvoiceLine = {
  description: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: string | null;
  unit: ProductUnit | null;
  unitPrice: string | null;
  discountAmount: string | null;
  vatRate: string | null;
  lineTotal: string | null;
  warnings: string[];
};

export type CanonicalExtractedInvoiceDraft = {
  schemaVersion: 1;
  document: {
    companyName: string | null;
    taxNumber: string | null;
    taxOffice: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    dueDate: string | null;
    currency: string | null;
    subtotal: string | null;
    vatAmount: string | null;
    discountAmount: string | null;
    totalAmount: string | null;
    notes: string | null;
  };
  lineItems: CanonicalExtractedInvoiceLine[];
  validation: {
    status: AiTotalValidationStatus;
    tolerance: string;
    warnings: string[];
  };
  matches: {
    company: unknown | null;
    products: unknown[];
  };
  review: {
    status: "DRAFT" | "REVIEWED";
    selectedCompanyId: string | null;
    invoiceType: "SALES" | "PURCHASE" | "UNKNOWN";
    reviewedAt: string | null;
  };
  confidence: {
    score: number | null;
    warnings: string[];
  };
  raw: {
    parser: "LOCAL_RULES" | "MANUAL" | "EXTERNAL_AI";
    source: unknown;
  };
};

export class AiExtractionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiExtractionValidationError";
  }
}

const totalTolerance = new Prisma.Decimal("0.02");
const productUnits: ProductUnit[] = ["ADET", "KUTU", "PAKET", "KOLI", "KG", "GR", "LT", "ML", "METRE", "M2"];

export function emptyToNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeTaxIdentity(value: unknown) {
  const text = emptyToNull(value);
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? digits : null;
}

export function normalizeInvoiceNumber(value: unknown) {
  const text = emptyToNull(value);
  return text ? text.replace(/\s+/g, " ").trim() : null;
}

export function normalizeDecimalText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Prisma.Decimal(value.toString()).toString();
  }

  const text = emptyToNull(value);
  if (!text) return null;

  const cleaned = text
    .replace(/[â‚ºâ‚¬$]/g, "")
    .replace(/\b(TL|TRY|USD|EUR)\b/giu, "")
    .replace(/[^\d.,+\-\s]/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!cleaned || !/\d/u.test(cleaned)) return null;

  const sign = cleaned.startsWith("-") ? "-" : "";
  const unsigned = cleaned.replace(/^[+-]/u, "");
  const comma = unsigned.lastIndexOf(",");
  const dot = unsigned.lastIndexOf(".");
  let normalized = unsigned;

  if (comma > -1 && dot > -1) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = unsigned
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (comma > -1) {
    normalized = normalizeSingleSeparatorDecimal(unsigned, ",");
  } else if (dot > -1) {
    normalized = normalizeSingleSeparatorDecimal(unsigned, ".");
  }

  try {
    return new Prisma.Decimal(`${sign}${normalized}`).toString();
  } catch {
    return null;
  }
}

export function normalizeDateText(value: unknown) {
  const text = emptyToNull(value);
  if (!text) return null;

  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/u);
  const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/u);
  const year = Number(iso?.[1] ?? local?.[3]);
  const month = Number(iso?.[2] ?? local?.[2]);
  const day = Number(iso?.[3] ?? local?.[1]);

  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeCurrencyCode(value: unknown) {
  const text = emptyToNull(value)?.toUpperCase();
  if (!text) return null;
  if (text.includes("â‚º") || text === "TL") return "TRY";
  if (text.includes("$")) return "USD";
  if (text.includes("â‚¬")) return "EUR";
  return /^[A-Z]{3}$/u.test(text) ? text : null;
}

export function normalizeProductUnit(value: unknown): ProductUnit | null {
  const text = emptyToNull(value)?.toLocaleUpperCase("tr-TR").replace(/\./g, "");
  if (!text) return null;

  const aliases = new Map<string, ProductUnit>([
    ["AD", "ADET"],
    ["ADET", "ADET"],
    ["PCS", "ADET"],
    ["KUTU", "KUTU"],
    ["PAKET", "PAKET"],
    ["KOLI", "KOLI"],
    ["KG", "KG"],
    ["KILOGRAM", "KG"],
    ["GR", "GR"],
    ["GRAM", "GR"],
    ["LT", "LT"],
    ["LITRE", "LT"],
    ["ML", "ML"],
    ["METRE", "METRE"],
    ["M", "METRE"],
    ["M2", "M2"],
  ]);

  return aliases.get(text) ?? (productUnits.includes(text as ProductUnit) ? text as ProductUnit : null);
}

export function parseCanonicalDraftJson(value: string | null): CanonicalExtractedInvoiceDraft {
  if (!value?.trim()) {
    throw new AiExtractionValidationError("AI analiz JSON bos.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new AiExtractionValidationError("AI analiz JSON formatinda degil.");
  }

  if (!isRecord(parsed)) {
    throw new AiExtractionValidationError("AI analiz JSON nesnesi bekleniyor.");
  }

  if (parsed.schemaVersion === 1 && isRecord(parsed.document)) {
    return normalizeExtractedInvoiceDraft(parsed);
  }

  return normalizeExtractedInvoiceDraft(parsed);
}

export function normalizeExtractedInvoiceDraft(raw: Record<string, unknown>): CanonicalExtractedInvoiceDraft {
  const rawDocument = isRecord(raw.document) ? raw.document : raw;
  const rawLines = Array.isArray(raw.lineItems) ? raw.lineItems.filter(isRecord) : [];
  const document = {
    companyName: emptyToNull(rawDocument.companyName),
    taxNumber: normalizeTaxIdentity(rawDocument.taxNumber),
    taxOffice: emptyToNull(rawDocument.taxOffice),
    invoiceNumber: normalizeInvoiceNumber(rawDocument.invoiceNumber),
    invoiceDate: normalizeDateText(rawDocument.invoiceDate),
    dueDate: normalizeDateText(rawDocument.dueDate),
    currency: normalizeCurrencyCode(rawDocument.currency) ?? "TRY",
    subtotal: normalizeDecimalText(rawDocument.subtotal),
    vatAmount: normalizeDecimalText(rawDocument.vatAmount),
    discountAmount: normalizeDecimalText(rawDocument.discountAmount) ?? "0",
    totalAmount: normalizeDecimalText(rawDocument.totalAmount),
    notes: emptyToNull(rawDocument.notes ?? rawDocument.reference),
  };
  const lineItems = rawLines.map(normalizeLine);
  const confidenceWarnings = Array.isArray(raw.warnings)
    ? raw.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
  const validation = validateExtractedInvoiceTotals({ document, lineItems });
  const review = isRecord(raw.review) ? raw.review : {};

  return {
    schemaVersion: 1,
    document,
    lineItems,
    validation,
    matches: {
      company: isRecord(raw.matches) && "company" in raw.matches ? raw.matches.company : raw.companyMatch ?? null,
      products: isRecord(raw.matches) && Array.isArray(raw.matches.products) ? raw.matches.products : [],
    },
    review: {
      status: review.status === "REVIEWED" ? "REVIEWED" : "DRAFT",
      selectedCompanyId: emptyToNull(review.selectedCompanyId ?? raw.selectedCompanyId),
      invoiceType: rawDocument.invoiceTypeSuggestion === "SALES" || rawDocument.invoiceTypeSuggestion === "PURCHASE"
        ? rawDocument.invoiceTypeSuggestion
        : "UNKNOWN",
      reviewedAt: emptyToNull(review.reviewedAt),
    },
    confidence: {
      score: typeof raw.confidenceScore === "number" ? raw.confidenceScore : null,
      warnings: confidenceWarnings,
    },
    raw: {
      parser: raw.raw && isRecord(raw.raw) && raw.raw.parser === "EXTERNAL_AI" ? "EXTERNAL_AI" : "LOCAL_RULES",
      source: raw,
    },
  };
}

export function validateExtractedInvoiceTotals(input: {
  document: Pick<CanonicalExtractedInvoiceDraft["document"], "subtotal" | "vatAmount" | "discountAmount" | "totalAmount">;
  lineItems: CanonicalExtractedInvoiceLine[];
}) {
  const warnings: string[] = [];
  const calculatedLines = input.lineItems.map((line, index) => validateLineTotal(line, index));
  warnings.push(...calculatedLines.flatMap((result) => result.warnings));

  if (input.lineItems.length === 0) {
    return {
      status: "UNKNOWN" as AiTotalValidationStatus,
      tolerance: totalTolerance.toString(),
      warnings: ["Kalem bulunamadi; toplam dogrulamasi manuel kontrol gerektirir."],
    };
  }

  const subtotal = sum(calculatedLines.map((result) => result.subtotal));
  const vat = sum(calculatedLines.map((result) => result.vat));
  const discount = sum(calculatedLines.map((result) => result.discount));
  const total = sum(input.lineItems.map((line) => decimalOrNull(line.lineTotal)).filter(isDecimal));

  compareMoney("Ara toplam", input.document.subtotal, subtotal, warnings);
  compareMoney("KDV toplami", input.document.vatAmount, vat, warnings);
  compareMoney("Iskonto toplami", input.document.discountAmount, discount, warnings);
  compareMoney("Genel toplam", input.document.totalAmount, total, warnings);

  return {
    status: warnings.length > 0 ? "WARNING" as AiTotalValidationStatus : "OK" as AiTotalValidationStatus,
    tolerance: totalTolerance.toString(),
    warnings,
  };
}

function normalizeLine(line: Record<string, unknown>): CanonicalExtractedInvoiceLine {
  const normalized = {
    description: emptyToNull(line.description),
    sku: emptyToNull(line.sku ?? line.code),
    barcode: emptyToNull(line.barcode),
    quantity: normalizeDecimalText(line.quantity),
    unit: normalizeProductUnit(line.unit),
    unitPrice: normalizeDecimalText(line.unitPrice),
    discountAmount: normalizeDecimalText(line.discount ?? line.discountAmount) ?? "0",
    vatRate: normalizeDecimalText(line.vatRate),
    lineTotal: normalizeDecimalText(line.lineTotal),
    warnings: [] as string[],
  };

  if (!normalized.description) normalized.warnings.push("Satir aciklamasi bulunamadi.");
  if (!normalized.quantity) normalized.warnings.push("Satir miktari bulunamadi.");
  if (!normalized.unitPrice) normalized.warnings.push("Satir birim fiyati bulunamadi.");

  return normalized;
}

function validateLineTotal(line: CanonicalExtractedInvoiceLine, index: number) {
  const quantity = decimalOrNull(line.quantity);
  const unitPrice = decimalOrNull(line.unitPrice);
  const discount = decimalOrNull(line.discountAmount) ?? new Prisma.Decimal(0);
  const vatRate = decimalOrNull(line.vatRate) ?? new Prisma.Decimal(0);
  const warnings = [...line.warnings];

  if (!quantity || !unitPrice) {
    return { subtotal: new Prisma.Decimal(0), vat: new Prisma.Decimal(0), discount, warnings };
  }

  const gross = quantity.mul(unitPrice);
  const taxable = Prisma.Decimal.max(new Prisma.Decimal(0), gross.minus(discount));
  const vat = taxable.mul(vatRate).div(100);
  const expectedTotal = taxable.plus(vat);
  const extractedTotal = decimalOrNull(line.lineTotal);

  if (extractedTotal && !withinTolerance(extractedTotal, expectedTotal)) {
    warnings.push(`${index + 1}. satir toplami hesapla uyusmuyor.`);
  }

  return { subtotal: gross, vat, discount, warnings };
}

function compareMoney(label: string, extracted: string | null, calculated: Prisma.Decimal, warnings: string[]) {
  const decimal = decimalOrNull(extracted);
  if (!decimal) return;

  if (!withinTolerance(decimal, calculated)) {
    warnings.push(`${label} hesaplanan toplamla uyusmuyor.`);
  }
}

function decimalOrNull(value: string | null) {
  if (!value) return null;
  try {
    return new Prisma.Decimal(value);
  } catch {
    return null;
  }
}

function isDecimal(value: Prisma.Decimal | null): value is Prisma.Decimal {
  return Boolean(value);
}

function sum(values: Prisma.Decimal[]) {
  return values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));
}

function withinTolerance(left: Prisma.Decimal, right: Prisma.Decimal) {
  return left.minus(right).abs().lessThanOrEqualTo(totalTolerance);
}

function normalizeSingleSeparatorDecimal(value: string, separator: "," | ".") {
  const parts = value.split(separator);
  const last = parts.at(-1) ?? "";
  if (parts.length > 2) return parts.join("");
  if (last.length === 3 && (parts[0]?.length ?? 0) <= 3) return parts.join("");
  return value.replace(separator, ".");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
