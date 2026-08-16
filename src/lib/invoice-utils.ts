import type { InvoiceStatus, InvoiceType } from "#prisma/client";

export const invoiceTypeLabels: Record<InvoiceType, string> = {
  SALES: "Ben fatura kestim",
  PURCHASE: "Bana fatura kesildi",
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  UNPAID: "Ã–denmedi",
  PARTIAL: "KÄ±smi Ã¶dendi",
  PAID: "Ã–dendi",
  CANCELLED: "Ä°ptal",
};

export const invoiceTypeOptions: Array<{ value: InvoiceType; label: string }> = [
  { value: "SALES", label: invoiceTypeLabels.SALES },
  { value: "PURCHASE", label: invoiceTypeLabels.PURCHASE },
];

export const invoiceStatusOptions: Array<{ value: InvoiceStatus; label: string }> = [
  { value: "UNPAID", label: invoiceStatusLabels.UNPAID },
  { value: "PARTIAL", label: invoiceStatusLabels.PARTIAL },
  { value: "PAID", label: invoiceStatusLabels.PAID },
  { value: "CANCELLED", label: invoiceStatusLabels.CANCELLED },
];

export function formatMoney(value: { toNumber: () => number }, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Payment records will later be able to drive this status automatically.
// For now, invoice status remains user-selectable in the form.
export function getManualInvoiceStatus(status: InvoiceStatus) {
  return status;
}
