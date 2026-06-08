import type { AiExtractionStatus, FileRelatedType } from "@prisma/client";

export const aiExtractionStatusLabels: Record<AiExtractionStatus, string> = {
  PENDING: "Bekliyor",
  PROCESSING: "İşleniyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Hata",
  REVIEWED: "İncelendi",
};

export const aiExtractionStatusOptions = Object.entries(aiExtractionStatusLabels).map(
  ([value, label]) => ({ value: value as AiExtractionStatus, label }),
);

export const aiExtractionRelatedTypeLabels: Record<FileRelatedType, string> = {
  INVOICE: "Fatura",
  EXPENSE: "Gider",
  COMPANY: "Cari / Firma",
  PAYMENT: "Tahsilat / Ödeme",
  OTHER: "Diğer",
};

export const aiExtractionRelatedTypeOptions = [
  { value: "INVOICE" as const, label: aiExtractionRelatedTypeLabels.INVOICE },
  { value: "OTHER" as const, label: aiExtractionRelatedTypeLabels.OTHER },
];

export function formatConfidence(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

export function hasExtractionError(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function validateJsonText(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
