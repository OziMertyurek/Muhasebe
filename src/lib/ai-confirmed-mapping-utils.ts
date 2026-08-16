import type { AiConfirmedMappingType } from "@prisma/client";
import { normalizeCode, normalizeSearchName } from "./ai-matching-core.ts";
import { normalizeTaxIdentity } from "./ai-invoice-extraction-core.ts";

export type ConfirmedMappingInput = {
  type: AiConfirmedMappingType;
  sourceKey: string;
  sourceValue: string;
  companyId?: string | null;
  productId?: string | null;
  supplierCompanyId?: string | null;
};

export function normalizeMappingSource(input: Pick<ConfirmedMappingInput, "sourceKey" | "sourceValue">) {
  const key = input.sourceKey.trim().toLocaleUpperCase("tr-TR");
  const value = input.sourceValue.trim();

  if (key === "TAX_NUMBER" || key === "VKN" || key === "TCKN") {
    return { sourceKey: "TAX_NUMBER", sourceValue: normalizeTaxIdentity(value) ?? "" };
  }

  if (key === "COMPANY_NAME" || key === "PRODUCT_NAME" || key === "DESCRIPTION") {
    return { sourceKey: key, sourceValue: normalizeSearchName(value) };
  }

  if (key === "SKU" || key === "BARCODE") {
    return { sourceKey: key, sourceValue: normalizeCode(value) };
  }

  return { sourceKey: key, sourceValue: value };
}

export function validateConfirmedMapping(input: ConfirmedMappingInput) {
  const normalized = normalizeMappingSource(input);
  const errors: string[] = [];

  if (!normalized.sourceValue) {
    errors.push("Kaynak deger bos olamaz.");
  }

  if (input.type === "COMPANY" && !input.companyId) {
    errors.push("Cari eslestirmesi icin companyId gerekir.");
  }

  if (input.type === "PRODUCT" && !input.productId) {
    errors.push("Urun eslestirmesi icin productId gerekir.");
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized,
  };
}

export function mappingMatchesSource(
  mapping: Pick<ConfirmedMappingInput, "sourceKey" | "sourceValue">,
  source: Pick<ConfirmedMappingInput, "sourceKey" | "sourceValue">,
) {
  const left = normalizeMappingSource(mapping);
  const right = normalizeMappingSource(source);

  return left.sourceKey === right.sourceKey && left.sourceValue === right.sourceValue;
}
