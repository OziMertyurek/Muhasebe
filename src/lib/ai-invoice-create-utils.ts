import { InvoiceType, Prisma, type CompanyType } from "@prisma/client";
import type { CompanyMatchResult } from "@/lib/company-matcher";
import type { ParsedInvoiceData } from "@/lib/invoice-parser";

export type AiInvoiceCreateData = ParsedInvoiceData & {
  companyMatch?: CompanyMatchResult | null;
  createdInvoiceId?: string | null;
  selectedCompanyId?: string | null;
};

export type AiInvoiceCreateValidation =
  | "ok"
  | "missing-json"
  | "invalid-json"
  | "already-created"
  | "missing-confirmation"
  | "missing-company"
  | "missing-type"
  | "missing-invoice-number"
  | "missing-invoice-date"
  | "invalid-total";

export function parseAiInvoiceCreateData(extractedJson: string | null): AiInvoiceCreateData | null {
  if (!extractedJson?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(extractedJson) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    return {
      invoiceNumber: getNullableString(parsed, "invoiceNumber"),
      invoiceDate: getNullableString(parsed, "invoiceDate"),
      dueDate: getNullableString(parsed, "dueDate"),
      companyName: getNullableString(parsed, "companyName"),
      taxNumber: getNullableString(parsed, "taxNumber"),
      taxOffice: getNullableString(parsed, "taxOffice"),
      subtotal: getNullableNumber(parsed, "subtotal"),
      vatAmount: getNullableNumber(parsed, "vatAmount"),
      discountAmount: getNumber(parsed, "discountAmount") ?? 0,
      totalAmount: getNullableNumber(parsed, "totalAmount"),
      currency: getString(parsed, "currency") || "TRY",
      invoiceTypeSuggestion: getInvoiceTypeSuggestion(parsed),
      confidenceScore: getNumber(parsed, "confidenceScore") ?? 0,
      warnings: getStringArray(parsed, "warnings"),
      companyMatch: isRecord(parsed.companyMatch)
        ? normalizeCompanyMatch(parsed.companyMatch)
        : null,
      createdInvoiceId: getNullableString(parsed, "createdInvoiceId"),
      selectedCompanyId: getNullableString(parsed, "selectedCompanyId"),
    };
  } catch {
    return null;
  }
}

export function getAiInvoiceDefaultCompanyId(data: AiInvoiceCreateData | null) {
  return data?.selectedCompanyId || data?.companyMatch?.matchedCompany?.id || "";
}

export function getAiInvoiceCreatedInvoiceId(extractedJson: string | null) {
  return parseAiInvoiceCreateData(extractedJson)?.createdInvoiceId || null;
}

export function parseAiInvoiceDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function createDecimalFromNumber(value: number | null, fallback = 0) {
  const nextValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return new Prisma.Decimal(nextValue.toString());
}

export function validateAiInvoiceCreateInput(input: {
  data: AiInvoiceCreateData | null;
  confirmed: boolean;
  companyId: string;
  invoiceType: string;
}): AiInvoiceCreateValidation {
  if (!input.data) {
    return "missing-json" satisfies AiInvoiceCreateValidation;
  }

  if (input.data.createdInvoiceId) {
    return "already-created" satisfies AiInvoiceCreateValidation;
  }

  if (!input.confirmed) {
    return "missing-confirmation" satisfies AiInvoiceCreateValidation;
  }

  if (!input.companyId) {
    return "missing-company" satisfies AiInvoiceCreateValidation;
  }

  if (!Object.values(InvoiceType).includes(input.invoiceType as InvoiceType)) {
    return "missing-type" satisfies AiInvoiceCreateValidation;
  }

  if (!input.data.invoiceNumber) {
    return "missing-invoice-number" satisfies AiInvoiceCreateValidation;
  }

  if (!parseAiInvoiceDate(input.data.invoiceDate)) {
    return "missing-invoice-date" satisfies AiInvoiceCreateValidation;
  }

  if (!input.data.totalAmount || input.data.totalAmount <= 0) {
    return "invalid-total" satisfies AiInvoiceCreateValidation;
  }

  return "ok" satisfies AiInvoiceCreateValidation;
}

export function mergeAiInvoiceCreatedInvoiceId(
  extractedJson: string,
  createdInvoiceId: string,
  selectedCompanyId: string,
) {
  const parsed = JSON.parse(extractedJson) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("AI analiz JSON formatı okunamadı.");
  }

  return JSON.stringify(
    {
      ...parsed,
      selectedCompanyId,
      createdInvoiceId,
    },
    null,
    2,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function getNullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getNullableNumber(record: Record<string, unknown>, key: string) {
  return getNumber(record, key);
}

function getStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getInvoiceTypeSuggestion(record: Record<string, unknown>) {
  const value = record.invoiceTypeSuggestion;

  if (value === "SALES" || value === "PURCHASE" || value === "UNKNOWN") {
    return value;
  }

  return "UNKNOWN";
}

function normalizeCompanyMatch(value: Record<string, unknown>): CompanyMatchResult | null {
  const matchType = value.matchType;

  if (matchType !== "TAX_NUMBER" && matchType !== "NAME" && matchType !== "NONE") {
    return null;
  }

  return {
    matchType,
    confidence: getNumber(value, "confidence") ?? 0,
    extracted: {
      taxNumber: isRecord(value.extracted) ? getNullableString(value.extracted, "taxNumber") : null,
      companyName: isRecord(value.extracted)
        ? getNullableString(value.extracted, "companyName")
        : null,
    },
    matchedCompany: isRecord(value.matchedCompany)
      ? normalizeMatchedCompany(value.matchedCompany)
      : null,
    candidates: Array.isArray(value.candidates)
      ? value.candidates
          .filter(isRecord)
          .map(normalizeMatchedCompany)
          .filter((company): company is NonNullable<CompanyMatchResult["matchedCompany"]> =>
            Boolean(company),
          )
      : [],
    warnings: getStringArray(value, "warnings"),
  };
}

function normalizeMatchedCompany(value: Record<string, unknown>) {
  const id = getNullableString(value, "id");
  const name = getNullableString(value, "name");
  const type = getCompanyType(value.type);

  if (!id || !name || !type) {
    return null;
  }

  return {
    id,
    name,
    type,
    taxNumber: getNullableString(value, "taxNumber"),
    city: getNullableString(value, "city"),
    country: getNullableString(value, "country"),
    score: getNumber(value, "score") ?? 0,
  };
}

function getCompanyType(value: unknown): CompanyType | null {
  if (value === "CUSTOMER" || value === "SUPPLIER" || value === "BOTH") {
    return value;
  }

  return null;
}
