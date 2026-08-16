import type { AuditLog, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditEntityType =
  | "COMPANY"
  | "INVOICE"
  | "PAYMENT"
  | "FINANCIAL_ACCOUNT"
  | "EXPENSE"
  | "RECURRING_EXPENSE"
  | "IMPORTANT_DATE"
  | "FILE_ATTACHMENT"
  | "AI_EXTRACTION"
  | "BACKUP"
  | "RESTORE"
  | "SETTINGS";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "SOFT_DELETE"
  | "RESTORE"
  | "EXPORT"
  | "BACKUP_DOWNLOAD"
  | "FULL_BACKUP_DOWNLOAD"
  | "BACKUP_RESTORE"
  | "BACKUP_VALIDATE"
  | "STATUS_CHANGE";

export type AuditLogInput = {
  entityType: AuditEntityType;
  entityId?: string | null;
  action: AuditAction;
  title: string;
  description?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

export type AuditLogFilters = {
  query?: string;
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const auditEntityTypeLabels: Record<AuditEntityType, string> = {
  COMPANY: "Cari",
  INVOICE: "Fatura",
  PAYMENT: "Tahsilat / Ödeme",
  FINANCIAL_ACCOUNT: "Finansal Hesap",
  EXPENSE: "Gider",
  RECURRING_EXPENSE: "Sabit Gider",
  IMPORTANT_DATE: "Önemli Tarih",
  FILE_ATTACHMENT: "Dosya",
  AI_EXTRACTION: "AI Analiz",
  BACKUP: "Yedekleme",
  RESTORE: "Geri Yükleme",
  SETTINGS: "Ayarlar",
};

export const auditActionLabels: Record<AuditAction, string> = {
  CREATE: "Oluşturma",
  UPDATE: "Güncelleme",
  SOFT_DELETE: "Çöp kutusuna taşıma",
  RESTORE: "Geri yükleme",
  EXPORT: "Dışa aktarma",
  BACKUP_DOWNLOAD: "Veritabanı yedeği indirme",
  FULL_BACKUP_DOWNLOAD: "Tam yedek indirme",
  BACKUP_RESTORE: "Yedek geri yükleme",
  BACKUP_VALIDATE: "Yedek doğrulama",
  STATUS_CHANGE: "Durum değişikliği",
};

export const auditEntityTypeOptions = Object.entries(auditEntityTypeLabels).map(
  ([value, label]) => ({ value, label }),
);

export const auditActionOptions = Object.entries(auditActionLabels).map(([value, label]) => ({
  value,
  label,
}));

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export async function createAuditLog(input: AuditLogInput, client: PrismaClientLike = prisma) {
  try {
    await client.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId || null,
        action: input.action,
        title: input.title,
        description: input.description || null,
        beforeJson: stringifyAuditJson(input.before),
        afterJson: stringifyAuditJson(input.after),
        metadataJson: stringifyAuditJson(input.metadata),
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("Audit log yazılamadı", error);
  }
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const where = buildAuditWhere(filters);

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
  });
}

export function formatAuditAction(action: string) {
  return auditActionLabels[action as AuditAction] ?? action;
}

export function formatAuditEntityType(entityType: string) {
  return auditEntityTypeLabels[entityType as AuditEntityType] ?? entityType;
}

export function formatAuditDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAuditJson(value: string | null) {
  if (!value) {
    return "Kayıt yok";
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function getAuditEntityHref(log: Pick<AuditLog, "entityType" | "entityId">) {
  if (!log.entityId) {
    return null;
  }

  switch (log.entityType) {
    case "COMPANY":
      return `/companies/${log.entityId}`;
    case "INVOICE":
      return `/invoices/${log.entityId}`;
    case "PAYMENT":
      return `/payments/${log.entityId}`;
    case "FINANCIAL_ACCOUNT":
      return `/accounts/${log.entityId}`;
    case "EXPENSE":
      return `/expenses/${log.entityId}`;
    case "RECURRING_EXPENSE":
      return `/recurring-expenses/${log.entityId}`;
    case "IMPORTANT_DATE":
      return `/important-dates/${log.entityId}`;
    case "FILE_ATTACHMENT":
      return `/files/${log.entityId}`;
    case "AI_EXTRACTION":
      return `/ai-extraction/${log.entityId}`;
    default:
      return null;
  }
}

function buildAuditWhere(filters: AuditLogFilters) {
  const conditions: Array<Record<string, unknown>> = [];
  const query = filters.query?.trim();

  if (query) {
    conditions.push({
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { entityId: { contains: query } },
      ],
    });
  }

  if (filters.entityType) {
    conditions.push({ entityType: filters.entityType });
  }

  if (filters.action) {
    conditions.push({ action: filters.action });
  }

  const dateRange: { gte?: Date; lte?: Date } = {};

  if (filters.dateFrom) {
    dateRange.gte = new Date(`${filters.dateFrom}T00:00:00`);
  }

  if (filters.dateTo) {
    dateRange.lte = new Date(`${filters.dateTo}T23:59:59`);
  }

  if (dateRange.gte || dateRange.lte) {
    conditions.push({ createdAt: dateRange });
  }

  return conditions.length ? { AND: conditions } : {};
}

function stringifyAuditJson(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  try {
    const json = JSON.stringify(value, auditReplacer);
    if (!json) {
      return null;
    }

    return json.length > 12000 ? `${json.slice(0, 12000)}...` : json;
  } catch {
    return null;
  }
}

function auditReplacer(_key: string, value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return value;
}
