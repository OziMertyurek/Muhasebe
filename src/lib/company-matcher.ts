import type { Company, CompanyType } from "#prisma/client";
import { prisma } from "@/lib/prisma";

export type CompanyMatchType = "TAX_NUMBER" | "NAME" | "NONE";

export type CompanyMatchResult = {
  matchedCompanyId: string | null;
  matchType: CompanyMatchType;
  confidence: number;
  extracted: {
    taxNumber: string | null;
    companyName: string | null;
  };
  matchedCompany: MatchedCompany | null;
  candidates: MatchedCompany[];
  warnings: string[];
};

export type MatchedCompany = {
  id: string;
  name: string;
  type: CompanyType;
  taxNumber: string | null;
  city: string | null;
  country: string | null;
  score: number;
};

type ExtractedInvoiceForCompanyMatch = {
  taxNumber?: unknown;
  companyName?: unknown;
};

type CompanyForMatch = Pick<
  Company,
  "id" | "name" | "type" | "taxNumber" | "city" | "country"
>;

const minimumNameScore = 0.55;
const maxCandidates = 5;

export async function matchCompanyFromExtractedJson(
  extractedJson: string | null,
): Promise<CompanyMatchResult> {
  const extracted = parseExtractedInvoice(extractedJson);
  return matchCompany(extracted);
}

export async function matchCompany(
  extracted: ExtractedInvoiceForCompanyMatch,
): Promise<CompanyMatchResult> {
  const taxNumber = normalizeTaxNumber(getStringValue(extracted.taxNumber));
  const companyName = getStringValue(extracted.companyName);
  const warnings: string[] = [];

  if (!taxNumber) {
    warnings.push("Vergi no bulunamadÄ±");
  }

  if (!companyName) {
    warnings.push("Firma adÄ± bulunamadÄ±");
  }

  if (taxNumber) {
    const taxMatch = await prisma.company.findFirst({
      where: {
        deletedAt: null,
        taxNumber,
      },
      select: companySelect,
    });

    if (taxMatch) {
      const matchedCompany = toMatchedCompany(taxMatch, 1);

      return {
        matchedCompanyId: matchedCompany.id,
        matchType: "TAX_NUMBER",
        confidence: 1,
        extracted: { taxNumber, companyName },
        matchedCompany,
        candidates: [matchedCompany],
        warnings,
      };
    }

    warnings.push("Vergi no ile eÅŸleÅŸen cari bulunamadÄ±");
  }

  if (companyName) {
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: companySelect,
    });
    const candidates = companies
      .map((company) => toMatchedCompany(company, calculateNameScore(companyName, company.name)))
      .filter((candidate) => candidate.score >= minimumNameScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates);

    if (candidates.length > 0) {
      return {
        matchedCompanyId: candidates[0].id,
        matchType: "NAME",
        confidence: candidates[0].score,
        extracted: { taxNumber, companyName },
        matchedCompany: candidates[0],
        candidates,
        warnings,
      };
    }

    warnings.push("Firma adÄ±na benzer cari bulunamadÄ±");
  }

  return {
    matchedCompanyId: null,
    matchType: "NONE",
    confidence: 0,
    extracted: { taxNumber, companyName },
    matchedCompany: null,
    candidates: [],
    warnings,
  };
}

function parseExtractedInvoice(extractedJson: string | null): ExtractedInvoiceForCompanyMatch {
  if (!extractedJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(extractedJson) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as ExtractedInvoiceForCompanyMatch;
  } catch {
    return {};
  }
}

const companySelect = {
  id: true,
  name: true,
  type: true,
  taxNumber: true,
  city: true,
  country: true,
} satisfies Record<keyof CompanyForMatch, true>;

function toMatchedCompany(company: CompanyForMatch, score: number): MatchedCompany {
  return {
    id: company.id,
    name: company.name,
    type: company.type,
    taxNumber: company.taxNumber,
    city: company.city,
    country: company.country,
    score: Number(normalizeCandidateScore(score).toFixed(2)),
  };
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTaxNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

function calculateNameScore(inputName: string, companyName: string) {
  const left = normalizeCompanyName(inputName);
  const right = normalizeCompanyName(companyName);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 0.95;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.85;
  }

  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union > 0 ? intersection / union : 0;
  const distanceScore = 1 - levenshteinDistance(left, right) / Math.max(left.length, right.length);

  return Math.max(tokenScore, distanceScore);
}

function normalizeCompanyName(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ÅŸ/g, "s")
    .replace(/Ä±/g, "i")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c")
    .replace(/ÅŸ/g, "s")
    .replace(/Ä±/g, "i")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c")
    .replace(/\b(ltd|sti|ÅŸti|limited|anonim|aÅŸ|as|ticaret|sanayi|ve)\b/g, " ")
    .replace(/\b(sirketi|sirket|a\s*s)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCandidateScore(score: number) {
  if (score >= minimumNameScore && score < 0.75) {
    return 0.75;
  }

  return Math.min(score, 0.95);
}

function levenshteinDistance(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );

  for (let index = 0; index <= left.length; index += 1) {
    matrix[index][0] = index;
  }

  for (let index = 0; index <= right.length; index += 1) {
    matrix[0][index] = index;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}
