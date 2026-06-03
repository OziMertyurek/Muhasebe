import type { FileRelatedType } from "@prisma/client";

export const maxUploadSize = 10 * 1024 * 1024;

export const fileRelatedTypeLabels: Record<FileRelatedType, string> = {
  INVOICE: "Fatura",
  EXPENSE: "Gider",
  COMPANY: "Cari / Firma",
  PAYMENT: "Tahsilat / Ödeme",
  OTHER: "Diğer",
};

export const fileRelatedTypeOptions = Object.entries(fileRelatedTypeLabels).map(
  ([value, label]) => ({ value: value as FileRelatedType, label }),
);

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

export function isAllowedUploadType(fileName: string, mimeType: string) {
  const extension = getFileExtension(fileName);
  return allowedMimeTypes.has(mimeType) || allowedExtensions.has(extension);
}

export function getFileExtension(fileName: string) {
  const cleanName = fileName.toLowerCase();
  const dotIndex = cleanName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return cleanName.slice(dotIndex);
}

export function getSafeFileExtension(fileName: string, mimeType: string) {
  const extension = getFileExtension(fileName);

  if (allowedExtensions.has(extension)) {
    return extension;
  }

  if (mimeType === "application/pdf") {
    return ".pdf";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  return "";
}

export function formatFileSize(value: number | null | undefined) {
  if (!value) {
    return "-";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileKind(mimeType: string | null | undefined) {
  if (!mimeType) {
    return "Bilinmiyor";
  }

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType.startsWith("image/")) {
    return "Görsel";
  }

  if (mimeType.includes("word")) {
    return "Word";
  }

  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
    return "Excel";
  }

  return mimeType;
}

export function getRelatedRecordLabel(file: {
  invoice?: { invoiceNumber: string } | null;
  expense?: { title: string } | null;
  company?: { name: string } | null;
  payment?: { description: string | null; paymentDate: Date } | null;
}) {
  if (file.invoice) {
    return file.invoice.invoiceNumber;
  }

  if (file.expense) {
    return file.expense.title;
  }

  if (file.company) {
    return file.company.name;
  }

  if (file.payment) {
    return file.payment.description || "Tahsilat / Ödeme";
  }

  return "-";
}

export function getRelatedRecordHref(file: {
  invoiceId?: string | null;
  expenseId?: string | null;
  companyId?: string | null;
  paymentId?: string | null;
}) {
  if (file.invoiceId) {
    return `/invoices/${file.invoiceId}`;
  }

  if (file.expenseId) {
    return `/expenses/${file.expenseId}`;
  }

  if (file.companyId) {
    return `/companies/${file.companyId}`;
  }

  if (file.paymentId) {
    return `/payments/${file.paymentId}`;
  }

  return null;
}

export function getMimeFilterWhere(kind?: string) {
  if (kind === "pdf") {
    return { mimeType: "application/pdf" };
  }

  if (kind === "image") {
    return { mimeType: { startsWith: "image/" } };
  }

  if (kind === "document") {
    return {
      OR: [
        { mimeType: { contains: "word" } },
        { mimeType: "application/msword" },
      ],
    };
  }

  if (kind === "sheet") {
    return {
      OR: [
        { mimeType: { contains: "excel" } },
        { mimeType: { contains: "spreadsheet" } },
      ],
    };
  }

  return {};
}
