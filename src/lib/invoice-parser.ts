export type InvoiceTypeSuggestion = "SALES" | "PURCHASE" | "UNKNOWN";

export type ParsedInvoiceData = {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  companyName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  subtotal: number | null;
  vatAmount: number | null;
  discountAmount: number;
  totalAmount: number | null;
  currency: string;
  invoiceTypeSuggestion: InvoiceTypeSuggestion;
  confidenceScore: number;
  warnings: string[];
};

type ParsedFieldsForConfidence = {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  companyName: string | null;
  taxNumber: string | null;
  subtotal: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
};

const maxRawTextLength = 200_000;

const invoiceNumberAliases = [
  "e arsiv fatura no",
  "e arşiv fatura no",
  "e arsiv no",
  "e arşiv no",
  "e fatura no",
  "e-fatura no",
  "fatura numarasi",
  "fatura numarası",
  "fatura no",
  "fatura nosu",
  "belge numarasi",
  "belge numarası",
  "belge no",
  "belge nosu",
];

const invoiceDateAliases = [
  "fatura tarihi",
  "fatura tarih",
  "duzenleme tarihi",
  "düzenleme tarihi",
  "duzenleme tarih",
  "düzenleme tarih",
  "belge tarihi",
  "belge tarih",
  "tarih",
];

const dueDateAliases = [
  "vade tarihi",
  "vade tarih",
  "son odeme tarihi",
  "son ödeme tarihi",
  "son odeme tarih",
  "son ödeme tarih",
  "odeme tarihi",
  "ödeme tarihi",
  "odeme tarih",
  "ödeme tarih",
];

const companyAliases = [
  "ticaret unvani",
  "ticaret ünvanı",
  "ticaret unvanı",
  "firma unvani",
  "firma ünvanı",
  "firma adi",
  "firma adı",
  "firma ad",
  "firma",
  "unvani",
  "ünvanı",
  "unvan",
  "ünvan",
  "alici unvani",
  "alıcı ünvanı",
  "alici unvan",
  "alıcı ünvan",
  "alici",
  "alıcı",
  "satici unvani",
  "satıcı ünvanı",
  "satici unvan",
  "satıcı ünvan",
  "satici",
  "satıcı",
  "musteri",
  "müşteri",
  "cari",
];

const taxNumberAliases = [
  "vergi kimlik numarasi",
  "vergi kimlik numarası",
  "vergi kimlik no",
  "vergi numarasi",
  "vergi numarası",
  "vergi no",
  "vergi nosu",
  "vkn tckn",
  "vkn",
  "tckn",
  "tc kimlik no",
];

const taxOfficeAliases = ["vergi dairesi", "vergi daires", "vergi daire", "vd"];

const subtotalAliases = [
  "mal hizmet toplami",
  "mal hizmet toplamı",
  "mal hizmet toplam",
  "mal/hizmet toplami",
  "mal/hizmet toplamı",
  "mal/hizmet toplam",
  "mal hizmet bedeli",
  "ara toplam",
  "aratoplam",
  "matrah",
];

const vatAmountAliases = [
  "hesaplanan kdv",
  "kdv tutari",
  "kdv tutarı",
  "kdv toplami",
  "kdv toplamı",
  "kdv toplam",
  "vergiler toplami",
  "vergiler toplamı",
  "vergiler toplam",
  "vergi toplami",
  "vergi toplamı",
  "vergi toplam",
  "kdv",
];

const discountAmountAliases = ["iskonto tutari", "iskonto tutarı", "iskonto", "indirim tutari", "indirim tutarı", "indirim"];

const totalAmountAliases = [
  "genel toplam",
  "odenecek tutar",
  "ödenecek tutar",
  "fatura toplami",
  "fatura toplamı",
  "fatura toplam",
  "fatura toplam tutari",
  "fatura toplam tutarı",
  "toplam tutar",
  "odenecek",
  "ödenecek",
];

const scenarioAliases = ["senaryo no", "senaryo", "ettn", "uuid"];
const allKnownAliases = [
  ...invoiceNumberAliases,
  ...invoiceDateAliases,
  ...dueDateAliases,
  ...companyAliases,
  ...taxNumberAliases,
  ...taxOfficeAliases,
  ...subtotalAliases,
  ...vatAmountAliases,
  ...discountAmountAliases,
  ...totalAmountAliases,
  ...scenarioAliases,
];

const datePattern = /\b(?:[0-9]{4}[./-][0-9]{1,2}[./-][0-9]{1,2}|[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{4})\b/u;
const amountTokenPattern =
  /(?:[$€₺]\s*)?[-+]?\d[\d\s.,]*(?:\s*(?:TL|TRY|USD|EUR|₺|\$|€))?/giu;

export function parseInvoiceText(rawText: string): ParsedInvoiceData {
  const warnings: string[] = [];
  const text = normalizeWhitespace(rawText).slice(0, maxRawTextLength);

  if (rawText.length > maxRawTextLength) {
    warnings.push("Ham metin çok uzun olduğu için yalnızca ilk bölüm parse edildi.");
  }

  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = findDateByAliases(text, invoiceDateAliases);
  const dueDate = findDateByAliases(text, dueDateAliases);
  const companyName = extractCompanyName(text);
  const taxNumber = extractTaxNumber(text);
  const taxOffice = extractTaxOffice(text);
  const subtotal = findAmountByAliases(text, subtotalAliases);
  const vatAmount = findAmountByAliases(text, vatAmountAliases);
  const discountAmount = findAmountByAliases(text, discountAmountAliases) ?? 0;
  const totalAmount = findAmountByAliases(text, totalAmountAliases);
  const currency = detectCurrency(text);
  const invoiceTypeSuggestion = detectInvoiceType(text);

  pushMissingWarnings(warnings, {
    invoiceNumber,
    invoiceDate,
    companyName,
    taxNumber,
    subtotal,
    vatAmount,
    totalAmount,
  });

  if (!dueDate) {
    warnings.push("Vade tarihi bulunamadı. Bu alan opsiyoneldir; gerekirse manuel kontrol edin.");
  }

  if (invoiceTypeSuggestion === "UNKNOWN") {
    warnings.push("Fatura tipi otomatik belirlenemedi. Kaydetmeden önce satış/alış tipini manuel seçin.");
  }

  const confidenceScore = calculateConfidence({
    invoiceNumber,
    invoiceDate,
    companyName,
    taxNumber,
    subtotal,
    vatAmount,
    totalAmount,
  });

  if (confidenceScore < 0.75) {
    warnings.push(
      "Güven skoru düşük: zorunlu veya tutar alanlarından bazıları bulunamadı. Fatura oluşturmadan önce bilgileri kontrol edin.",
    );
  }

  return {
    invoiceNumber,
    invoiceDate,
    dueDate,
    companyName,
    taxNumber,
    taxOffice,
    subtotal,
    vatAmount,
    discountAmount,
    totalAmount,
    currency,
    invoiceTypeSuggestion,
    confidenceScore,
    warnings,
  };
}

export function normalizeAmount(value: string) {
  const cleaned = value
    .replace(/[₺€$]/g, "")
    .replace(/\b(TL|TRY|USD|EUR)\b/giu, "")
    .replace(/[^\d.,+\-\s]/g, "")
    .replace(/\s+(?=\d{3}(?:\D|$))/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!cleaned || !/[0-9]/.test(cleaned)) {
    return null;
  }

  const sign = cleaned.startsWith("-") ? "-" : "";
  const unsigned = cleaned.replace(/^[+-]/u, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  let normalized = unsigned;

  if (lastComma > -1 && lastDot > -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = unsigned
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (lastComma > -1) {
    normalized = inferSingleSeparatorAmount(unsigned, ",");
  } else if (lastDot > -1) {
    normalized = inferSingleSeparatorAmount(unsigned, ".");
  }

  const parsed = Number(`${sign}${normalized}`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const dateValue = value.trim();
  let year: number;
  let month: number;
  let day: number;

  const isoMatch = dateValue.match(/^([0-9]{4})[-/.]([0-9]{1,2})[-/.]([0-9]{1,2})$/u);
  const localMatch = dateValue.match(/^([0-9]{1,2})[-/.]([0-9]{1,2})[-/.]([0-9]{4})$/u);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (localMatch) {
    day = Number(localMatch[1]);
    month = Number(localMatch[2]);
    year = Number(localMatch[3]);
  } else {
    return null;
  }

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

export function detectCurrency(text: string) {
  if (/(?:\bUSD\b|\$)/iu.test(text)) return "USD";
  if (/(?:\bEUR\b|€)/iu.test(text)) return "EUR";
  if (/(?:\bTRY\b|\bTL\b|₺)/iu.test(text)) return "TRY";
  return "TRY";
}

export function extractTaxNumber(text: string) {
  for (const line of getMeaningfulLines(text)) {
    const value = findValueAfterAliases(line, taxNumberAliases);
    const number = extractTaxNumberFromValue(value ?? line);

    if (value && number) {
      return number;
    }
  }

  return null;
}

export function extractInvoiceNumber(text: string) {
  for (const line of getMeaningfulLines(text)) {
    if (hasAnyAlias(line, scenarioAliases)) {
      continue;
    }

    const value = findValueAfterAliases(line, invoiceNumberAliases);
    const invoiceNumber = cleanInvoiceNumber(value);

    if (invoiceNumber) {
      return invoiceNumber;
    }
  }

  return null;
}

function extractCompanyName(text: string) {
  for (const line of getMeaningfulLines(text)) {
    const value = findValueAfterAliases(line, companyAliases);
    const companyName = cleanCompanyName(value);

    if (companyName) {
      return companyName;
    }
  }

  return null;
}

function extractTaxOffice(text: string) {
  for (const line of getMeaningfulLines(text)) {
    const value = findValueAfterAliases(line, taxOfficeAliases);
    const taxOffice = cleanFreeTextValue(value);

    if (taxOffice) {
      return truncateAtNextKnownLabel(taxOffice);
    }
  }

  return null;
}

function findDateByAliases(text: string, aliases: string[]) {
  for (const line of getMeaningfulLines(text)) {
    const value = findValueAfterAliases(line, aliases);
    const source = value ?? line;
    const date = source.match(datePattern)?.[0] ?? null;
    const normalized = normalizeDate(date);

    if (value && normalized) {
      return normalized;
    }
  }

  return null;
}

function findAmountByAliases(text: string, aliases: string[]) {
  for (const line of getMeaningfulLines(text)) {
    const value = findValueAfterAliases(line, aliases);

    if (!value) {
      continue;
    }

    const amount = extractAmountFromValue(value);

    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

function extractAmountFromValue(value: string) {
  const matches = Array.from(value.matchAll(amountTokenPattern))
    .map((match) => match[0])
    .filter((match) => /\d/u.test(match))
    .filter((match) => !match.trim().startsWith("%"));

  const currencyAware = matches.find((match) => /(?:\bTL\b|\bTRY\b|\bUSD\b|\bEUR\b|₺|\$|€)/iu.test(match));
  const candidate = currencyAware ?? matches.at(-1) ?? null;

  if (!candidate) {
    return null;
  }

  return normalizeAmount(candidate);
}

function findValueAfterAliases(line: string, aliases: string[]) {
  const foldedLine = foldForSearch(line);

  for (const alias of aliases) {
    const pattern = buildAliasPattern(alias);
    const match = foldedLine.match(pattern);

    if (!match || match.index === undefined) {
      continue;
    }

    const value = line.slice(match.index + match[0].length);
    const cleaned = cleanFreeTextValue(value);

    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

function buildAliasPattern(alias: string) {
  const words = foldForSearch(alias)
    .split(/\s+/u)
    .filter(Boolean)
    .map(escapeRegex);
  const body = words.join("[\\s\\-_/]*");

  return new RegExp(`(?:^|[^a-z0-9])${body}\\s*(?:[:：=\\-–—]|\\s)+`, "iu");
}

function hasAnyAlias(line: string, aliases: string[]) {
  return aliases.some((alias) => buildAliasPattern(alias).test(foldForSearch(line)));
}

function cleanInvoiceNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const truncated = truncateAtNextKnownLabel(value);
  const match = truncated.match(/[A-Z0-9][A-Z0-9/._-]{2,}/iu);

  return match?.[0]?.trim() ?? null;
}

function cleanCompanyName(value: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = truncateAtNextKnownLabel(value)
    .replace(/\b(VKN|TCKN|Vergi\s*No|Vergi\s*Dairesi)\b.*$/iu, "")
    .trim();

  return cleanFreeTextValue(cleaned);
}

function cleanFreeTextValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^[\s:;=\-–—]+|[\s;|]+$/g, "")
    .trim();

  return cleaned || null;
}

function truncateAtNextKnownLabel(value: string) {
  let truncated = value;

  for (const alias of allKnownAliases) {
    const pattern = buildAliasPattern(alias);
    const match = foldForSearch(truncated).match(pattern);

    if (match?.index && match.index > 0) {
      truncated = truncated.slice(0, match.index).trim();
    }
  }

  return truncated.split(/\s{3,}|\t|\|/u)[0]?.trim() ?? truncated.trim();
}

function extractTaxNumberFromValue(value: string | null) {
  if (!value) {
    return null;
  }

  const compact = value.replace(/[^\d]/g, "");
  const match = compact.match(/\d{10,11}/u);

  return match?.[0] ?? null;
}

function getMeaningfulLines(text: string) {
  return normalizeWhitespace(text)
    .split("\n")
    .flatMap((line) => line.split(/\s{4,}|\t|\|/u))
    .map((line) => line.trim())
    .filter(Boolean);
}

function inferSingleSeparatorAmount(value: string, separator: "," | ".") {
  const parts = value.split(separator);
  const lastPart = parts.at(-1) ?? "";

  if (parts.length > 2) {
    return parts.join("");
  }

  if (lastPart.length === 3 && parts[0].length <= 3) {
    return parts.join("");
  }

  if (lastPart.length === 1 || lastPart.length === 2) {
    return value.replace(separator, ".");
  }

  return value.replace(separator, ".");
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function detectInvoiceType(text: string): InvoiceTypeSuggestion {
  const folded = foldForSearch(text);

  if (/(?:satis\s*faturasi|bizden|tarafimizca|duzenleyen\s*biz)/iu.test(folded)) {
    return "SALES";
  }

  if (/(?:alis\s*faturasi|tedarikci|bize\s*kesilen|satici)/iu.test(folded)) {
    return "PURCHASE";
  }

  return "UNKNOWN";
}

function pushMissingWarnings(warnings: string[], values: ParsedFieldsForConfidence) {
  if (!values.invoiceNumber) {
    warnings.push("Fatura no bulunamadı. E-Arşiv No, E-Fatura No, Belge No veya Fatura No alanını kontrol edin.");
  }

  if (!values.invoiceDate) {
    warnings.push("Fatura tarihi bulunamadı. Fatura Tarihi, Düzenleme Tarihi veya Belge Tarihi alanını kontrol edin.");
  }

  if (!values.companyName) {
    warnings.push("Firma adı bulunamadı. Firma, Ünvan, Alıcı veya Satıcı alanını kontrol edin.");
  }

  if (!values.taxNumber) {
    warnings.push("Vergi no bulunamadı. VKN, Vergi No veya TCKN alanını kontrol edin.");
  }

  if (values.subtotal === null) {
    warnings.push("Ara toplam bulunamadı. Mal Hizmet Toplamı veya Ara Toplam alanını kontrol edin.");
  }

  if (values.vatAmount === null) {
    warnings.push("KDV tutarı bulunamadı. KDV, Hesaplanan KDV veya Vergiler Toplamı alanını kontrol edin.");
  }

  if (values.totalAmount === null) {
    warnings.push("Genel toplam bulunamadı. Genel Toplam, Ödenecek Tutar veya Fatura Toplamı alanını kontrol edin.");
  }
}

function calculateConfidence(values: ParsedFieldsForConfidence) {
  const checks = [
    values.invoiceNumber,
    values.invoiceDate,
    values.companyName,
    values.taxNumber,
    values.subtotal,
    values.vatAmount,
    values.totalAmount,
  ];
  const foundCount = checks.filter((value) => value !== null && value !== "").length;

  return Number((foundCount / checks.length).toFixed(2));
}

function isValidDateParts(year: number, month: number, day: number) {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function foldForSearch(value: string) {
  return value
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
