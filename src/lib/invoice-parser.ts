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

type FieldPattern = {
  label: string;
  pattern: RegExp;
};

const maxRawTextLength = 200_000;

const invoiceNumberPatterns: FieldPattern[] = [
  { label: "Fatura No", pattern: /(?:^|\n)\s*(?:e[- ]?arşiv|e[- ]?fatura)?\s*fatura\s*no(?:su)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/._]{2,})/imu },
  { label: "Fatura Numarası", pattern: /(?:^|\n)\s*fatura\s*numaras[ıi]\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/._]{2,})/imu },
  { label: "Belge No", pattern: /(?:^|\n)\s*belge\s*no(?:su)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/._]{2,})/imu },
  { label: "E-Arşiv No", pattern: /(?:^|\n)\s*e[- ]?arşiv\s*no(?:su)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/._]{2,})/imu },
  { label: "E-Fatura No", pattern: /(?:^|\n)\s*e[- ]?fatura\s*no(?:su)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/._]{2,})/imu },
];

const invoiceDatePatterns: FieldPattern[] = [
  { label: "Fatura Tarihi", pattern: /(?:^|\n)\s*fatura\s*tarihi\s*[:\-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/imu },
  { label: "Düzenleme Tarihi", pattern: /(?:^|\n)\s*d[üu]zenleme\s*tarihi\s*[:\-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/imu },
  { label: "Belge Tarihi", pattern: /(?:^|\n)\s*belge\s*tarihi\s*[:\-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/imu },
  { label: "Tarih", pattern: /(?:^|\n)\s*tarih\s*[:\-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/imu },
];

const dueDatePatterns: FieldPattern[] = [
  { label: "Vade Tarihi", pattern: /(?:^|\n)\s*vade\s*tarihi\s*[:\-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/imu },
  { label: "Ödeme Tarihi", pattern: /(?:^|\n)\s*[öo]deme\s*tarihi\s*[:\-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/imu },
  { label: "Son Ödeme Tarihi", pattern: /(?:^|\n)\s*son\s*[öo]deme\s*tarihi\s*[:\-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/imu },
];

const companyPatterns: FieldPattern[] = [
  { label: "Ticaret Ünvanı", pattern: /(?:^|\n)\s*ticaret\s*[üu]nvan[ıi]\s*[:\-]?\s*(.+)/imu },
  { label: "Firma", pattern: /(?:^|\n)\s*firma\s*[:\-]?\s*(.+)/imu },
  { label: "Ünvan", pattern: /(?:^|\n)\s*[üu]nvan\s*[:\-]?\s*(.+)/imu },
  { label: "Alıcı", pattern: /(?:^|\n)\s*al[ıi]c[ıi]\s*[:\-]?\s*(.+)/imu },
  { label: "Satıcı", pattern: /(?:^|\n)\s*sat[ıi]c[ıi]\s*[:\-]?\s*(.+)/imu },
  { label: "Müşteri", pattern: /(?:^|\n)\s*m[üu][şs]teri\s*[:\-]?\s*(.+)/imu },
  { label: "Cari", pattern: /(?:^|\n)\s*cari\s*[:\-]?\s*(.+)/imu },
];

const taxNumberPatterns: FieldPattern[] = [
  { label: "VKN", pattern: /(?:^|\n)\s*vkn\s*[:\-]?\s*([0-9]{10})/imu },
  { label: "TCKN", pattern: /(?:^|\n)\s*tckn\s*[:\-]?\s*([0-9]{11})/imu },
  { label: "Vergi No", pattern: /(?:^|\n)\s*vergi\s*no(?:su)?\s*[:\-]?\s*([0-9]{10,11})/imu },
  { label: "Vergi Numarası", pattern: /(?:^|\n)\s*vergi\s*numaras[ıi]\s*[:\-]?\s*([0-9]{10,11})/imu },
  { label: "Vergi Kimlik No", pattern: /(?:^|\n)\s*vergi\s*kimlik\s*no(?:su)?\s*[:\-]?\s*([0-9]{10,11})/imu },
];

const taxOfficePatterns: FieldPattern[] = [
  { label: "Vergi Dairesi", pattern: /(?:^|\n)\s*vergi\s*dairesi\s*[:\-]?\s*(.+)/imu },
  { label: "VD", pattern: /(?:^|\n)\s*vd\s*[:\-]?\s*(.+)/imu },
];

const amountPatterns = {
  subtotal: [
    /(?:^|\n)\s*mal\s*\/?\s*hizmet\s*toplam[ıi?]\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*mal\s*\/?\s*hizmet\s*toplam[ıi]\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*ara\s*toplam\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
  ],
  vatAmount: [
    /(?:^|\n)\s*hesaplanan\s*kdv\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*vergiler\s*toplam[ıi]\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*kdv\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
  ],
  discountAmount: [
    /(?:^|\n)\s*iskonto\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*indirim\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
  ],
  totalAmount: [
    /(?:^|\n)\s*genel\s*toplam\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*[öo]denecek\s*tutar\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*toplam\s*tutar\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
    /(?:^|\n)\s*fatura\s*toplam[ıi]\s*[:\-]?\s*([₺€$]?\s*[-+]?[0-9][0-9.,\s]*\s*(?:TL|TRY|USD|EUR|₺|\$|€)?)/imu,
  ],
};

export function parseInvoiceText(rawText: string): ParsedInvoiceData {
  const warnings: string[] = [];
  const text = normalizeWhitespace(rawText).slice(0, maxRawTextLength);

  if (rawText.length > maxRawTextLength) {
    warnings.push("Ham metin çok uzun olduğu için ilk bölüm parse edildi");
  }

  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = normalizeDate(findByPatterns(text, invoiceDatePatterns));
  const dueDate = normalizeDate(findByPatterns(text, dueDatePatterns));
  const companyName = cleanTextValue(findByPatterns(text, companyPatterns));
  const taxNumber = extractTaxNumber(text);
  const taxOffice = cleanTextValue(findByPatterns(text, taxOfficePatterns));
  const subtotal = findAmount(text, amountPatterns.subtotal);
  const vatAmount = findAmount(text, amountPatterns.vatAmount);
  const discountAmount = findAmount(text, amountPatterns.discountAmount) ?? 0;
  const totalAmount = findAmount(text, amountPatterns.totalAmount);
  const currency = detectCurrency(text);
  const invoiceTypeSuggestion = detectInvoiceType(text);

  if (!invoiceNumber) warnings.push("Fatura numarası bulunamadı");
  if (!invoiceDate) warnings.push("Fatura tarihi bulunamadı");
  if (!companyName) warnings.push("Firma adı bulunamadı");
  if (!taxNumber) warnings.push("Vergi no bulunamadı");
  if (subtotal === null) warnings.push("Ara toplam bulunamadı");
  if (vatAmount === null) warnings.push("KDV tutarı bulunamadı");
  if (totalAmount === null) warnings.push("Genel toplam bulunamadı");
  if (invoiceTypeSuggestion === "UNKNOWN") warnings.push("Fatura tipi otomatik belirlenemedi");

  const confidenceScore = calculateConfidence({
    invoiceNumber,
    invoiceDate,
    companyName,
    taxNumber,
    subtotal,
    vatAmount,
    totalAmount,
  });

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
    .replace(/[^\d.,+-]/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = cleaned
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (lastComma > -1) {
    normalized = inferSingleSeparatorAmount(cleaned, ",");
  } else if (lastDot > -1) {
    normalized = inferSingleSeparatorAmount(cleaned, ".");
  }

  const parsed = Number(normalized);
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

  const isoMatch = dateValue.match(/^([0-9]{4})[-/.]([0-9]{1,2})[-/.]([0-9]{1,2})$/);
  const localMatch = dateValue.match(/^([0-9]{1,2})[-/.]([0-9]{1,2})[-/.]([0-9]{4})$/);

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
  return findByPatterns(text, taxNumberPatterns);
}

export function extractInvoiceNumber(text: string) {
  const withoutScenarioLines = text
    .split("\n")
    .filter((line) => !/senaryo\s*no/iu.test(line))
    .join("\n");

  return findByPatterns(withoutScenarioLines, invoiceNumberPatterns);
}

function findByPatterns(text: string, patterns: FieldPattern[]) {
  for (const { pattern } of patterns) {
    const match = text.match(pattern);
    const value = cleanTextValue(match?.[1] ?? null);

    if (value) {
      return value;
    }
  }

  return null;
}

function findAmount(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const amount = match?.[1] ? normalizeAmount(match[1]) : null;

    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

function inferSingleSeparatorAmount(value: string, separator: "," | ".") {
  const parts = value.split(separator);
  const lastPart = parts.at(-1) ?? "";

  if (lastPart.length === 3 && parts.length > 1) {
    return parts.join("");
  }

  return value.replace(separator, ".");
}

function cleanTextValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^[\s:;-]+|[\s;]+$/g, "")
    .trim();

  return cleaned || null;
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function detectInvoiceType(text: string): InvoiceTypeSuggestion {
  if (/(?:sat[ıi][şs]\s*faturas[ıi]|bizden|taraf[ıi]m[ıi]zca)/iu.test(text)) {
    return "SALES";
  }

  if (/(?:al[ıi][şs]\s*faturas[ıi]|tedarik[çc]i|bize\s*kesilen)/iu.test(text)) {
    return "PURCHASE";
  }

  return "UNKNOWN";
}

function calculateConfidence(values: {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  companyName: string | null;
  taxNumber: string | null;
  subtotal: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
}) {
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
