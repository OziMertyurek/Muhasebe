import type { PaymentMethod, PaymentType } from "@prisma/client";

export const paymentTypeLabels: Record<PaymentType, string> = {
  COLLECTION: "Para aldım",
  PAYMENT: "Para ödedim",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Havale / EFT",
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  POS: "POS",
  OTHER: "Diğer",
};

export const paymentTypeOptions: Array<{ value: PaymentType; label: string }> = [
  { value: "COLLECTION", label: paymentTypeLabels.COLLECTION },
  { value: "PAYMENT", label: paymentTypeLabels.PAYMENT },
];

export const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "BANK_TRANSFER", label: paymentMethodLabels.BANK_TRANSFER },
  { value: "CASH", label: paymentMethodLabels.CASH },
  { value: "CREDIT_CARD", label: paymentMethodLabels.CREDIT_CARD },
  { value: "POS", label: paymentMethodLabels.POS },
  { value: "OTHER", label: paymentMethodLabels.OTHER },
];

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
