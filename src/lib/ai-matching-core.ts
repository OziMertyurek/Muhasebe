import type { CompanyType } from "#prisma/client";
import {
  normalizeTaxIdentity,
  type AiMatchStatus,
  type CanonicalExtractedInvoiceDraft,
} from "./ai-invoice-extraction-core.ts";
import { prisma } from "./prisma.ts";

export type AiCompanyCandidate = {
  id: string;
  name: string;
  type: CompanyType;
  taxNumber: string | null;
  email?: string | null;
  phone?: string | null;
};

export type AiProductCandidate = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
};

export type AiMatchResult = {
  matchedId: string | null;
  status: AiMatchStatus;
  reason: string;
  confidence: number;
  candidates: Array<{ id: string; label: string; score: number }>;
};

export type AiProductMatchResult = AiMatchResult & {
  lineIndex: number;
  originalDescription: string | null;
};

const highConfidenceThreshold = 0.86;
const ambiguousBand = 0.05;

export function normalizeSearchName(value: string | null | undefined) {
  if (!value) return "";

  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/Ä°/g, "i")
    .replace(/Ä±/g, "i")
    .replace(/ÅŸ/g, "s")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(ltd|sti|limited|anonim|as|a s|ticaret|sanayi|sirketi|sirket|ve)\b/giu, " ")
    .replace(/[^a-z0-9\s]/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCompanyDeterministic(
  extracted: { taxNumber: string | null; companyName: string | null },
  companies: AiCompanyCandidate[],
): AiMatchResult {
  const taxNumber = normalizeTaxIdentity(extracted.taxNumber);

  if (taxNumber) {
    const matches = companies.filter((company) => normalizeTaxIdentity(company.taxNumber) === taxNumber);
    if (matches.length === 1) {
      return exact(matches[0].id, matches[0].name, "EXACT_TAX_NUMBER");
    }
    if (matches.length > 1) {
      return ambiguous(matches.map((company) => candidate(company.id, company.name, 1)), "AMBIGUOUS_TAX_NUMBER");
    }
  }

  const name = normalizeSearchName(extracted.companyName);
  if (!name) return notFound("NO_COMPANY_SIGNAL");

  const exactNameMatches = companies.filter((company) => normalizeSearchName(company.name) === name);
  if (exactNameMatches.length === 1) {
    return exact(exactNameMatches[0].id, exactNameMatches[0].name, "EXACT_NORMALIZED_NAME");
  }
  if (exactNameMatches.length > 1) {
    return ambiguous(exactNameMatches.map((company) => candidate(company.id, company.name, 1)), "AMBIGUOUS_NAME");
  }

  return chooseFuzzy(
    companies.map((company) => candidate(company.id, company.name, similarity(name, normalizeSearchName(company.name)))),
    "FUZZY_NAME",
  );
}

export function matchProductDeterministic(
  line: { barcode: string | null; sku: string | null; description: string | null },
  products: AiProductCandidate[],
  lineIndex = 0,
): AiProductMatchResult {
  const barcode = line.barcode?.replace(/\s/g, "") ?? "";
  if (barcode) {
    const matches = products.filter((product) => product.barcode?.replace(/\s/g, "") === barcode);
    if (matches.length === 1) {
      return { ...exact(matches[0].id, matches[0].name, "EXACT_BARCODE"), lineIndex, originalDescription: line.description };
    }
    if (matches.length > 1) {
      return { ...ambiguous(matches.map((product) => candidate(product.id, product.name, 1)), "AMBIGUOUS_BARCODE"), lineIndex, originalDescription: line.description };
    }
  }

  const sku = normalizeCode(line.sku);
  if (sku) {
    const matches = products.filter((product) => normalizeCode(product.sku) === sku);
    if (matches.length === 1) {
      return { ...exact(matches[0].id, matches[0].name, "EXACT_SKU"), lineIndex, originalDescription: line.description };
    }
    if (matches.length > 1) {
      return { ...ambiguous(matches.map((product) => candidate(product.id, product.name, 1)), "AMBIGUOUS_SKU"), lineIndex, originalDescription: line.description };
    }
  }

  const description = normalizeSearchName(line.description);
  if (!description) {
    return { ...notFound("NO_PRODUCT_SIGNAL"), lineIndex, originalDescription: line.description };
  }

  const exactNameMatches = products.filter((product) => normalizeSearchName(product.name) === description);
  if (exactNameMatches.length === 1) {
    return { ...exact(exactNameMatches[0].id, exactNameMatches[0].name, "EXACT_NORMALIZED_NAME"), lineIndex, originalDescription: line.description };
  }
  if (exactNameMatches.length > 1) {
    return { ...ambiguous(exactNameMatches.map((product) => candidate(product.id, product.name, 1)), "AMBIGUOUS_NAME"), lineIndex, originalDescription: line.description };
  }

  return {
    ...chooseFuzzy(
      products.map((product) => candidate(product.id, product.name, similarity(description, normalizeSearchName(product.name)))),
      "FUZZY_NAME",
    ),
    lineIndex,
    originalDescription: line.description,
  };
}

export function normalizeCode(value: string | null | undefined) {
  return value
    ?.replace(/\s+/g, "")
    .replace(/Ä°/g, "I")
    .replace(/Ä±/g, "i")
    .toUpperCase()
    .trim() ?? "";
}

export async function matchCompanyForDraft(draft: CanonicalExtractedInvoiceDraft) {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, type: true, taxNumber: true, email: true, phone: true },
  });

  return matchCompanyDeterministic(
    {
      taxNumber: draft.document.taxNumber,
      companyName: draft.document.companyName,
    },
    companies,
  );
}

export async function matchProductsForDraft(draft: CanonicalExtractedInvoiceDraft) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, sku: true, barcode: true },
  });

  return draft.lineItems.map((line, index) => matchProductDeterministic(line, products, index));
}

function exact(id: string, label: string, reason: string): AiMatchResult {
  return { matchedId: id, status: "EXACT", reason, confidence: 1, candidates: [candidate(id, label, 1)] };
}

function ambiguous(candidates: AiMatchResult["candidates"], reason: string): AiMatchResult {
  return {
    matchedId: null,
    status: "AMBIGUOUS",
    reason,
    confidence: candidates[0]?.score ?? 0,
    candidates: candidates.sort((a, b) => b.score - a.score).slice(0, 5),
  };
}

function notFound(reason: string): AiMatchResult {
  return { matchedId: null, status: "NOT_FOUND", reason, confidence: 0, candidates: [] };
}

function chooseFuzzy(candidates: AiMatchResult["candidates"], reason: string): AiMatchResult {
  const sorted = candidates.filter((item) => item.score >= 0.55).sort((a, b) => b.score - a.score).slice(0, 5);
  const best = sorted[0];
  const second = sorted[1];

  if (!best) return notFound(reason);
  if (best.score >= highConfidenceThreshold && (!second || best.score - second.score > ambiguousBand)) {
    return {
      matchedId: best.id,
      status: "HIGH_CONFIDENCE",
      reason,
      confidence: Number(best.score.toFixed(2)),
      candidates: sorted,
    };
  }

  return ambiguous(sorted, reason);
}

function candidate(id: string, label: string, score: number) {
  return { id, label, score: Number(Math.max(0, Math.min(1, score)).toFixed(2)) };
}

function similarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;

  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union > 0 ? intersection / union : 0;
  const distanceScore = 1 - levenshtein(left, right) / Math.max(left.length, right.length);

  return Math.max(tokenScore, distanceScore);
}

function levenshtein(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let i = 0; i <= right.length; i += 1) matrix[0][i] = i;

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
