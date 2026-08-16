import { InvoiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  normalizeCurrencyCode,
  normalizeDateText,
  normalizeDecimalText,
  normalizeInvoiceNumber,
  normalizeProductUnit,
  normalizeTaxIdentity,
  parseCanonicalDraftJson,
  validateExtractedInvoiceTotals,
} from "@/lib/ai-invoice-extraction-core";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: ReviewRouteContext) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;
  const detailUrl = new URL(`/ai-extraction/${id}`, request.url);
  const formData = await request.formData();
  const companyId = readFormText(formData, "companyId");
  const invoiceType = readFormText(formData, "invoiceType");
  const confirmed = formData.get("confirmCreateInvoice") === "yes";

  const job = await prisma.aiExtractionJob.findFirst({
    where: {
      id,
      deletedAt: null,
      fileAttachment: { deletedAt: null },
    },
    select: {
      id: true,
      status: true,
      extractedJson: true,
      fileAttachment: {
        select: {
          originalFileName: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.redirect(new URL("/ai-extraction?error=not-found", request.url));
  }

  if (!confirmed) {
    detailUrl.searchParams.set("error", "review-confirm");
    return NextResponse.redirect(detailUrl);
  }

  if (!Object.values(InvoiceType).includes(invoiceType as InvoiceType)) {
    detailUrl.searchParams.set("error", "review-type");
    return NextResponse.redirect(detailUrl);
  }

  if (!job.extractedJson?.trim()) {
    detailUrl.searchParams.set("error", "review-json");
    return NextResponse.redirect(detailUrl);
  }

  let draft;

  try {
    draft = parseCanonicalDraftJson(job.extractedJson);
  } catch {
    detailUrl.searchParams.set("error", "review-json");
    return NextResponse.redirect(detailUrl);
  }

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      detailUrl.searchParams.set("error", "review-company");
      return NextResponse.redirect(detailUrl);
    }
  }

  const reviewedDraft = {
    ...draft,
    document: {
      companyName: optionalFormText(formData, "companyName"),
      taxNumber: normalizeTaxIdentity(readFormText(formData, "taxNumber")),
      taxOffice: optionalFormText(formData, "taxOffice"),
      invoiceNumber: normalizeInvoiceNumber(readFormText(formData, "invoiceNumber")),
      invoiceDate: normalizeDateText(readFormText(formData, "invoiceDate")),
      dueDate: normalizeDateText(readFormText(formData, "dueDate")),
      currency: normalizeCurrencyCode(readFormText(formData, "currency")) ?? "TRY",
      subtotal: normalizeDecimalText(readFormText(formData, "subtotal")),
      vatAmount: normalizeDecimalText(readFormText(formData, "vatAmount")),
      discountAmount: normalizeDecimalText(readFormText(formData, "discountAmount")) ?? "0",
      totalAmount: normalizeDecimalText(readFormText(formData, "totalAmount")),
      notes: draft.document.notes,
    },
    lineItems: readLineItems(formData),
    review: {
      ...draft.review,
      status: "REVIEWED" as const,
      selectedCompanyId: companyId || null,
      invoiceType: invoiceType as InvoiceType,
      reviewedAt: new Date().toISOString(),
    },
  };
  const validatedDraft = {
    ...reviewedDraft,
    validation: validateExtractedInvoiceTotals({
      document: reviewedDraft.document,
      lineItems: reviewedDraft.lineItems,
    }),
    matches: {
      ...reviewedDraft.matches,
      products: mergeSelectedProducts(reviewedDraft.matches.products, formData),
    },
  };

  await prisma.aiExtractionJob.update({
    where: { id: job.id },
    data: {
      status: "REVIEWED",
      extractedJson: JSON.stringify(validatedDraft, null, 2),
      errorMessage: null,
    },
    select: { id: true },
  });

  await createAuditLog({
    entityType: "AI_EXTRACTION",
    entityId: job.id,
    action: "UPDATE",
    title: "AI analiz taslagi incelendi",
    description: `${job.fileAttachment.originalFileName} icin taslak inceleme tamamlandi. Fatura kaydi olusturulmadi.`,
    before: {
      status: job.status,
      extractedJson: job.extractedJson,
    },
    after: {
      status: "REVIEWED",
      selectedCompanyId: companyId || null,
      invoiceType,
    },
  });

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${job.id}`);
  detailUrl.searchParams.set("reviewed", "1");
  return NextResponse.redirect(detailUrl);
}

function readFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormText(formData: FormData, key: string) {
  const value = readFormText(formData, key);
  return value || null;
}

function readLineItems(formData: FormData) {
  const lineCount = Number(readFormText(formData, "lineCount"));

  if (!Number.isInteger(lineCount) || lineCount < 0) {
    return [];
  }

  return Array.from({ length: lineCount }, (_, index) => ({
    description: optionalFormText(formData, `line-${index}-description`),
    sku: null,
    barcode: null,
    quantity: normalizeDecimalText(readFormText(formData, `line-${index}-quantity`)),
    unit: normalizeProductUnit(readFormText(formData, `line-${index}-unit`)),
    unitPrice: normalizeDecimalText(readFormText(formData, `line-${index}-unitPrice`)),
    discountAmount: normalizeDecimalText(readFormText(formData, `line-${index}-discountAmount`)) ?? "0",
    vatRate: normalizeDecimalText(readFormText(formData, `line-${index}-vatRate`)),
    lineTotal: normalizeDecimalText(readFormText(formData, `line-${index}-lineTotal`)),
    warnings: [],
  }));
}

function mergeSelectedProducts(existingMatches: unknown[], formData: FormData) {
  const lineCount = Number(readFormText(formData, "lineCount"));

  if (!Number.isInteger(lineCount) || lineCount < 0) {
    return existingMatches;
  }

  return Array.from({ length: lineCount }, (_, index) => {
    const productId = readFormText(formData, `line-${index}-productId`);
    const existing = existingMatches.find((match) =>
      typeof match === "object" &&
      match !== null &&
      "lineIndex" in match &&
      (match as { lineIndex?: unknown }).lineIndex === index,
    );

    return {
      ...(typeof existing === "object" && existing !== null ? existing : {}),
      lineIndex: index,
      matchedId: productId || null,
      status: productId ? "EXACT" : "NOT_FOUND",
      reason: productId ? "USER_SELECTED_PRODUCT" : "USER_LEFT_FREE_TEXT",
      confidence: productId ? 1 : 0,
    };
  });
}
