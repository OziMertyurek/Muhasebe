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

const invoiceFileMimeByExtension = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".html", "text/html"],
  [".htm", "text/html"],
]);

const archiveFileMimeByExtension = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xls", "application/vnd.ms-excel"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
]);

const blockedExtensions = new Set([
  ".js",
  ".exe",
  ".bat",
  ".cmd",
  ".ps1",
  ".sh",
  ".php",
  ".svg",
]);

export function isAllowedUploadType(
  fileName: string,
  mimeType: string,
  relatedType?: FileRelatedType,
) {
  const extension = getFileExtension(fileName);

  if (!mimeType || blockedExtensions.has(extension)) {
    return false;
  }

  const allowedMap = relatedType === "INVOICE"
    ? invoiceFileMimeByExtension
    : archiveFileMimeByExtension;

  return allowedMap.get(extension) === mimeType;
}

export function getFileExtension(fileName: string) {
  const cleanName = fileName.toLowerCase();
  const dotIndex = cleanName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return cleanName.slice(dotIndex);
}

export function getSafeFileExtension(
  fileName: string,
  mimeType: string,
  relatedType?: FileRelatedType,
) {
  const extension = getFileExtension(fileName);
  const allowedMap = relatedType === "INVOICE"
    ? invoiceFileMimeByExtension
    : archiveFileMimeByExtension;

  if (allowedMap.get(extension) === mimeType) {
    return extension;
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
