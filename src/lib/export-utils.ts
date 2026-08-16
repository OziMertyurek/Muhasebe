import { Prisma } from "#prisma/client";

type CsvValue = string | number | boolean | Date | Prisma.Decimal | null | undefined;

const csvBom = "\uFEFF";

export function formatCsvDate(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatCsvDateTime(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${formatCsvDate(date)} ${hours}:${minutes}`;
}

export function formatCsvNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  return Number.isFinite(value) ? value.toFixed(2) : "";
}

export function formatTodayForFileName(date = new Date()) {
  return formatCsvDate(date);
}

export function parseExportDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getDateToExclusive(value?: string | null) {
  const date = parseExportDate(value);

  if (!date) {
    return undefined;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function parseExportMonth(value?: string | null) {
  const fallback = new Date();

  if (!value) {
    return { month: fallback.getMonth() + 1, year: fallback.getFullYear() };
  }

  const match = value.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return { month: fallback.getMonth() + 1, year: fallback.getFullYear() };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { month: fallback.getMonth() + 1, year: fallback.getFullYear() };
  }

  return { month, year };
}

export function formatMonthForFileName(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function slugifyFileNamePart(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ä±/g, "i")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/ÅŸ/g, "s")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function stringifyCsvValue(value: CsvValue) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return formatCsvDate(value);
  }

  if (value instanceof Prisma.Decimal) {
    return formatCsvNumber(value);
  }

  return String(value);
}

function escapeCsvValue(value: CsvValue) {
  const text = stringifyCsvValue(value);
  const escaped = text.replace(/"/g, '""');

  if (/[",\r\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function createCsv(headers: string[], rows: CsvValue[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(","));

  return `${csvBom}${lines.join("\r\n")}`;
}

export function createCsvResponse(csv: string, fileName: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function buildExportHref(basePath: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `${basePath}?${query}` : basePath;
}
