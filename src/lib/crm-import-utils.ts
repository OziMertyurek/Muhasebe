import { CrmCompanyStatus, CrmReplyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CrmImportResult = "create" | "duplicate_db" | "duplicate_file" | "error";

export type CrmImportRow = {
  rowNumber: number;
  companyName: string;
  country: string | null;
  email: string | null;
  website: string | null;
  contactPerson: string | null;
  phone: string | null;
  sector: string | null;
  source: string | null;
  status: CrmCompanyStatus;
  replyStatus: CrmReplyStatus;
  lastContactDate: string | null;
  followUpDate: string | null;
  tags: string[];
  notes: string | null;
  result: CrmImportResult;
  resultLabel: string;
  errors: string[];
  warnings: string[];
  duplicateReason?: string;
};

export type CrmImportPreview = {
  rows: CrmImportRow[];
  summary: {
    totalRows: number;
    toAdd: number;
    duplicates: number;
    invalidRows: number;
  };
};

type CsvRecord = Record<string, string>;

type ExistingCrmCompany = {
  companyName: string;
  country: string | null;
  email: string | null;
};

const headerAliases: Record<string, keyof CsvRecord> = {
  "firma adi": "companyName",
  firma: "companyName",
  sirket: "companyName",
  company: "companyName",
  "company name": "companyName",
  ulke: "country",
  country: "country",
  "e posta": "email",
  email: "email",
  mail: "email",
  "e mail": "email",
  "web sitesi": "website",
  website: "website",
  web: "website",
  "yetkili kisi": "contactPerson",
  yetkili: "contactPerson",
  contact: "contactPerson",
  "contact person": "contactPerson",
  telefon: "phone",
  "telefon no": "phone",
  phone: "phone",
  sektor: "sector",
  sector: "sector",
  kaynak: "source",
  source: "source",
  durum: "status",
  status: "status",
  "cevap durumu": "replyStatus",
  reply: "replyStatus",
  "reply status": "replyStatus",
  "son iletisim tarihi": "lastContactDate",
  "last contact date": "lastContactDate",
  "takip tarihi": "followUpDate",
  "follow up date": "followUpDate",
  etiketler: "tags",
  tags: "tags",
  notlar: "notes",
  not: "notes",
  notes: "notes",
  note: "notes",
};

const statusAliases: Record<string, CrmCompanyStatus> = {
  "yeni firma": "NEW",
  yeni: "NEW",
  new: "NEW",
  "mail atildi": "EMAIL_SENT",
  "email sent": "EMAIL_SENT",
  "cevap bekleniyor": "WAITING_REPLY",
  "waiting reply": "WAITING_REPLY",
  "olumlu donus": "POSITIVE_REPLY",
  "positive reply": "POSITIVE_REPLY",
  "numune istedi": "SAMPLE_REQUESTED",
  "sample requested": "SAMPLE_REQUESTED",
  "fiyat istedi": "PRICE_REQUESTED",
  "price requested": "PRICE_REQUESTED",
  olumsuz: "NEGATIVE",
  negative: "NEGATIVE",
  "tekrar ulasilacak": "FOLLOW_UP",
  "follow up": "FOLLOW_UP",
  "iletisim kurma": "DO_NOT_CONTACT",
  "do not contact": "DO_NOT_CONTACT",
};

const replyStatusAliases: Record<string, CrmReplyStatus> = {
  "": "NO_CONTACT",
  yok: "NO_CONTACT",
  "iletisim yok": "NO_CONTACT",
  "no contact": "NO_CONTACT",
  bekleniyor: "WAITING",
  waiting: "WAITING",
  "cevap geldi": "REPLIED",
  replied: "REPLIED",
  "cevap yok": "NO_REPLY",
  "no reply": "NO_REPLY",
};

const resultLabels: Record<CrmImportResult, string> = {
  create: "Eklenecek",
  duplicate_db: "Mevcut kayıt",
  duplicate_file: "Dosya içinde tekrar",
  error: "Hatalı satır",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function buildCrmImportPreview(csvText: string): Promise<CrmImportPreview> {
  const records = parseCsvToRecords(csvText);
  const existingCompanies = await prisma.crmCompany.findMany({
    where: { deletedAt: null },
    select: { companyName: true, country: true, email: true },
  });
  const existingKeys = buildExistingKeySet(existingCompanies);
  const seenFileKeys = new Set<string>();
  const rows = records.map(({ record, rowNumber }) =>
    normalizeRecord(record, rowNumber, existingKeys, seenFileKeys),
  );

  return {
    rows,
    summary: summarizeRows(rows),
  };
}

export function getImportableRows(preview: CrmImportPreview) {
  return preview.rows.filter((row) => row.result === "create");
}

export function sanitizeCrmImportRows(rows: unknown): CrmImportRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => sanitizeCrmImportRow(row))
    .filter((row): row is CrmImportRow => Boolean(row));
}

export async function filterRowsAgainstCurrentDatabase(rows: CrmImportRow[]) {
  const existingCompanies = await prisma.crmCompany.findMany({
    where: { deletedAt: null },
    select: { companyName: true, country: true, email: true },
  });
  const existingKeys = buildExistingKeySet(existingCompanies);
  const seenFileKeys = new Set<string>();

  return rows.filter((row) => {
    const key = buildDuplicateKey(row.companyName, row.country, row.email);
    if (!key) {
      return false;
    }

    if (existingKeys.has(key) || seenFileKeys.has(key)) {
      return false;
    }

    seenFileKeys.add(key);
    return true;
  });
}

export function rowToCreateData(row: CrmImportRow) {
  return {
    companyName: row.companyName,
    country: row.country,
    email: row.email,
    website: normalizeWebsite(row.website),
    contactPerson: row.contactPerson,
    phone: row.phone,
    sector: row.sector,
    source: row.source,
    status: row.status,
    replyStatus: row.replyStatus,
    lastContactDate: parseIsoDate(row.lastContactDate),
    followUpDate: parseIsoDate(row.followUpDate),
    notes: row.notes,
    tagsJson: row.tags.length > 0 ? JSON.stringify(Array.from(new Set(row.tags))) : null,
  };
}

function parseCsvToRecords(csvText: string) {
  const cleanText = csvText.replace(/^\uFEFF/, "");
  const rows = parseCsvRows(cleanText);
  const headerRow = rows.find((row) => row.some((cell) => cell.trim()));

  if (!headerRow) {
    return [];
  }

  const headerIndex = rows.indexOf(headerRow);
  const headers = headerRow.map((header) => headerAliases[normalizeText(header)] ?? "");

  return rows
    .slice(headerIndex + 1)
    .map((row, index) => ({ row, rowNumber: headerIndex + index + 2 }))
    .filter(({ row }) => row.some((cell) => cell.trim()))
    .map(({ row, rowNumber }) => {
      const record: CsvRecord = {};
      headers.forEach((field, index) => {
        if (field) {
          record[field] = row[index]?.trim() ?? "";
        }
      });
      return { record, rowNumber };
    });
}

function parseCsvRows(csvText: string) {
  const delimiter = detectDelimiter(csvText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows.filter((row) => row.some((cell) => cell.trim()));
}

function detectDelimiter(csvText: string) {
  const headerLine = csvText.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const candidates = [";", ",", "\t"];
  return candidates
    .map((candidate) => ({
      delimiter: candidate,
      count: headerLine.split(candidate).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

function normalizeRecord(
  record: CsvRecord,
  rowNumber: number,
  existingKeys: Set<string>,
  seenFileKeys: Set<string>,
): CrmImportRow {
  const warnings: string[] = [];
  const errors: string[] = [];
  const companyName = readText(record.companyName);
  const country = optionalText(record.country);
  const rawEmail = readText(record.email);
  const email = normalizeEmail(rawEmail);
  const status = parseStatus(record.status, warnings);
  const replyStatus = parseReplyStatus(record.replyStatus, warnings);
  const lastContactDate = parseImportDate(record.lastContactDate, "Son iletişim tarihi", warnings);
  const followUpDate = parseImportDate(record.followUpDate, "Takip tarihi", warnings);

  if (!companyName) {
    errors.push("Firma Adı zorunludur.");
  }

  if (rawEmail && !email) {
    warnings.push("E-posta formatı geçersiz olduğu için boş bırakıldı.");
  }

  const key = buildDuplicateKey(companyName, country, email);
  let result: CrmImportResult = errors.length > 0 ? "error" : "create";
  let duplicateReason: string | undefined;

  if (result !== "error" && key) {
    if (existingKeys.has(key)) {
      result = "duplicate_db";
      duplicateReason = "Mevcut kayıt";
    } else if (seenFileKeys.has(key)) {
      result = "duplicate_file";
      duplicateReason = "Dosya içinde tekrar";
    } else {
      seenFileKeys.add(key);
    }
  }

  return {
    rowNumber,
    companyName,
    country,
    email,
    website: optionalText(record.website),
    contactPerson: optionalText(record.contactPerson),
    phone: optionalText(record.phone),
    sector: optionalText(record.sector),
    source: optionalText(record.source),
    status,
    replyStatus,
    lastContactDate,
    followUpDate,
    tags: parseImportTags(record.tags),
    notes: optionalText(record.notes),
    result,
    resultLabel: resultLabels[result],
    errors,
    warnings,
    duplicateReason,
  };
}

function parseStatus(value: string | undefined, warnings: string[]): CrmCompanyStatus {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "NEW";
  }

  const status = statusAliases[normalized];
  if (status) {
    return status;
  }

  if (Object.values(CrmCompanyStatus).includes(value as CrmCompanyStatus)) {
    return value as CrmCompanyStatus;
  }

  warnings.push("Bilinmeyen durum NEW olarak alındı.");
  return "NEW";
}

function parseReplyStatus(value: string | undefined, warnings: string[]): CrmReplyStatus {
  const normalized = normalizeText(value);
  const replyStatus = replyStatusAliases[normalized];

  if (replyStatus) {
    return replyStatus;
  }

  if (Object.values(CrmReplyStatus).includes(value as CrmReplyStatus)) {
    return value as CrmReplyStatus;
  }

  warnings.push("Bilinmeyen cevap durumu NO_CONTACT olarak alındı.");
  return "NO_CONTACT";
}

function parseImportDate(value: string | undefined, label: string, warnings: string[]) {
  const text = readText(value);
  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dottedMatch = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  const parts = isoMatch
    ? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
    : dottedMatch
      ? { year: Number(dottedMatch[3]), month: Number(dottedMatch[2]), day: Number(dottedMatch[1]) }
      : null;

  if (!parts) {
    warnings.push(`${label} geçersiz olduğu için boş bırakıldı.`);
    return null;
  }

  const date = new Date(parts.year, parts.month - 1, parts.day);
  if (
    date.getFullYear() !== parts.year ||
    date.getMonth() !== parts.month - 1 ||
    date.getDate() !== parts.day
  ) {
    warnings.push(`${label} geçersiz olduğu için boş bırakıldı.`);
    return null;
  }

  return date.toISOString();
}

function parseImportTags(value: string | undefined) {
  return readText(value)
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildExistingKeySet(existingCompanies: ExistingCrmCompany[]) {
  return new Set(
    existingCompanies
      .map((company) => buildDuplicateKey(company.companyName, company.country, company.email))
      .filter((key): key is string => Boolean(key)),
  );
}

function buildDuplicateKey(companyName: string, country: string | null, email: string | null) {
  const normalizedEmail = normalizeEmail(email ?? "");
  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  const normalizedName = normalizeText(companyName);
  if (!normalizedName) {
    return null;
  }

  return `name-country:${normalizedName}|${normalizeText(country ?? "")}`;
}

function sanitizeCrmImportRow(row: unknown): CrmImportRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const input = row as Partial<CrmImportRow>;
  const companyName = readText(input.companyName);
  if (!companyName) {
    return null;
  }

  return {
    rowNumber: Number(input.rowNumber) || 0,
    companyName,
    country: optionalText(input.country),
    email: normalizeEmail(input.email ?? ""),
    website: optionalText(input.website),
    contactPerson: optionalText(input.contactPerson),
    phone: optionalText(input.phone),
    sector: optionalText(input.sector),
    source: optionalText(input.source),
    status: Object.values(CrmCompanyStatus).includes(input.status as CrmCompanyStatus)
      ? (input.status as CrmCompanyStatus)
      : "NEW",
    replyStatus: Object.values(CrmReplyStatus).includes(input.replyStatus as CrmReplyStatus)
      ? (input.replyStatus as CrmReplyStatus)
      : "NO_CONTACT",
    lastContactDate: input.lastContactDate ?? null,
    followUpDate: input.followUpDate ?? null,
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()))
      : [],
    notes: optionalText(input.notes),
    result: "create",
    resultLabel: resultLabels.create,
    errors: [],
    warnings: [],
  };
}

function summarizeRows(rows: CrmImportRow[]) {
  return {
    totalRows: rows.length,
    toAdd: rows.filter((row) => row.result === "create").length,
    duplicates: rows.filter((row) => row.result === "duplicate_db" || row.result === "duplicate_file")
      .length,
    invalidRows: rows.filter((row) => row.result === "error").length,
  };
}

function normalizeText(value?: string | null) {
  return readText(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(value: string) {
  const email = readText(value).toLocaleLowerCase("tr-TR");
  return email && emailPattern.test(email) ? email : null;
}

function normalizeWebsite(value: string | null) {
  if (!value) {
    return null;
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function parseIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalText(value?: string | null) {
  const text = readText(value);
  return text.length > 0 ? text : null;
}

function readText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}
