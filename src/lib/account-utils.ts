import type { FinancialAccountType } from "#prisma/client";

export const accountTypeLabels: Record<FinancialAccountType, string> = {
  CASH: "Nakit Kasa",
  BANK: "Banka HesabÄ±",
  CREDIT_CARD: "Kredi KartÄ±",
  POS: "POS HesabÄ±",
  FOREIGN_CURRENCY: "DÃ¶viz HesabÄ±",
  OTHER: "DiÄŸer",
};

export const accountTypeOptions: Array<{ value: FinancialAccountType; label: string }> = [
  { value: "CASH", label: accountTypeLabels.CASH },
  { value: "BANK", label: accountTypeLabels.BANK },
  { value: "CREDIT_CARD", label: accountTypeLabels.CREDIT_CARD },
  { value: "POS", label: accountTypeLabels.POS },
  { value: "FOREIGN_CURRENCY", label: accountTypeLabels.FOREIGN_CURRENCY },
  { value: "OTHER", label: accountTypeLabels.OTHER },
];
