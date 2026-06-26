import { CrmCompanyStatus, CrmReplyStatus, Prisma } from "@prisma/client";

export const crmCompanyStatusLabels: Record<CrmCompanyStatus, string> = {
  NEW: "Yeni Firma",
  EMAIL_SENT: "Mail Atıldı",
  WAITING_REPLY: "Cevap Bekleniyor",
  POSITIVE_REPLY: "Olumlu Dönüş",
  SAMPLE_REQUESTED: "Numune İstedi",
  PRICE_REQUESTED: "Fiyat İstedi",
  NEGATIVE: "Olumsuz",
  FOLLOW_UP: "Tekrar Ulaşılacak",
  DO_NOT_CONTACT: "İletişim Kurma",
};

export const crmReplyStatusLabels: Record<CrmReplyStatus, string> = {
  NO_CONTACT: "İletişim Yok",
  WAITING: "Bekleniyor",
  REPLIED: "Cevap Geldi",
  NO_REPLY: "Cevap Yok",
};

export const crmCompanyStatusOptions = Object.values(CrmCompanyStatus).map((value) => ({
  value,
  label: crmCompanyStatusLabels[value],
}));

export const crmReplyStatusOptions = Object.values(CrmReplyStatus).map((value) => ({
  value,
  label: crmReplyStatusLabels[value],
}));

export function getCrmCompanyStatus(value?: string | null) {
  if (value && Object.values(CrmCompanyStatus).includes(value as CrmCompanyStatus)) {
    return value as CrmCompanyStatus;
  }

  return undefined;
}

export function getCrmReplyStatus(value?: string | null) {
  if (value && Object.values(CrmReplyStatus).includes(value as CrmReplyStatus)) {
    return value as CrmReplyStatus;
  }

  return undefined;
}

export function parseCrmDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCrmDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(date);
}

export function formatCrmDateInput(date?: Date | null) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseCrmTags(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function stringifyCrmTags(value: string) {
  const tags = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return tags.length > 0 ? JSON.stringify(Array.from(new Set(tags))) : null;
}

export function formatCrmTags(value?: string | null) {
  return parseCrmTags(value).join(", ");
}

export function formatCrmValue(value?: string | null) {
  return value?.trim() ? value : "-";
}

export function getCrmStatusTone(status: CrmCompanyStatus) {
  if (status === "POSITIVE_REPLY" || status === "SAMPLE_REQUESTED" || status === "PRICE_REQUESTED") {
    return "positive" as const;
  }

  if (status === "WAITING_REPLY" || status === "FOLLOW_UP" || status === "EMAIL_SENT") {
    return "warning" as const;
  }

  if (status === "NEGATIVE" || status === "DO_NOT_CONTACT") {
    return "danger" as const;
  }

  return "neutral" as const;
}

export function getCrmReplyTone(status: CrmReplyStatus) {
  if (status === "REPLIED") {
    return "positive" as const;
  }

  if (status === "WAITING") {
    return "warning" as const;
  }

  if (status === "NO_REPLY") {
    return "danger" as const;
  }

  return "neutral" as const;
}

export type CrmCompanyFilters = {
  q?: string;
  country?: string;
  status?: CrmCompanyStatus;
  replyStatus?: CrmReplyStatus;
  followUpFrom?: Date | null;
  followUpTo?: Date | null;
  source?: string;
};

export function buildCrmCompanyWhere(filters: CrmCompanyFilters): Prisma.CrmCompanyWhereInput {
  const query = filters.q?.trim();

  return {
    deletedAt: null,
    ...(query
      ? {
          OR: [
            { companyName: { contains: query } },
            { email: { contains: query } },
            { contactPerson: { contains: query } },
            { website: { contains: query } },
          ],
        }
      : {}),
    ...(filters.country ? { country: { contains: filters.country.trim() } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.replyStatus ? { replyStatus: filters.replyStatus } : {}),
    ...(filters.source ? { source: { contains: filters.source.trim() } } : {}),
    ...(filters.followUpFrom || filters.followUpTo
      ? {
          followUpDate: {
            ...(filters.followUpFrom ? { gte: filters.followUpFrom } : {}),
            ...(filters.followUpTo ? { lt: addOneDay(filters.followUpTo) } : {}),
          },
        }
      : {}),
  };
}

function addOneDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}
