import type { CompanyType } from "#prisma/client";

export const companyTypeLabels: Record<CompanyType, string> = {
  CUSTOMER: "MÃ¼ÅŸteri",
  SUPPLIER: "TedarikÃ§i",
  BOTH: "MÃ¼ÅŸteri & TedarikÃ§i",
};

export const companyTypeOptions: Array<{ value: CompanyType; label: string }> = [
  { value: "CUSTOMER", label: companyTypeLabels.CUSTOMER },
  { value: "SUPPLIER", label: companyTypeLabels.SUPPLIER },
  { value: "BOTH", label: companyTypeLabels.BOTH },
];

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatOptionalCurrency(value: { toNumber: () => number } | null, currency: string) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}

export function formatPlainValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}
