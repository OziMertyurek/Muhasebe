import { Prisma } from "#prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  normalizeDraftFromForm,
  prepareAiDraftForPosting,
  readFormText,
  readProductSelections,
  AiPostingValidationError,
  type AiPostingPreparedDraft,
} from "@/lib/ai-posting-utils";
import { parseCanonicalDraftJson } from "@/lib/ai-invoice-extraction-core";
import { normalizeMappingSource } from "@/lib/ai-confirmed-mapping-utils";
import { createAuditLog } from "@/lib/audit-log-utils";
import { syncInvoiceDueReminder } from "@/lib/auto-reminder-utils";
import {
  reconcileInvoiceStockMovements,
  type InvoiceStockLineInput,
} from "@/lib/invoice-stock-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostRouteContext = {
  params: Promise<{ id: string }>;
};

type PostedInvoiceForReminder = Parameters<typeof syncInvoiceDueReminder>[0];

type PostingResult =
  | { invoiceId: string; alreadyPosted: true }
  | { invoiceId: string; alreadyPosted: false; invoice: PostedInvoiceForReminder };

class AiPostingConflictError extends Error {
  readonly queryError: string;

  constructor(queryError: string, message: string) {
    super(message);
    this.name = "AiPostingConflictError";
    this.queryError = queryError;
  }
}

export async function POST(request: Request, { params }: PostRouteContext) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;
  const formData = await request.formData();
  const detailUrl = new URL(`/ai-extraction/${id}`, request.url);

  if (formData.get("confirmCreateInvoice") !== "yes") {
    detailUrl.searchParams.set("error", "post-confirm");
    return NextResponse.redirect(detailUrl);
  }

  let postedInvoiceId: string;

  try {
    const posted = await prisma.$transaction(async (tx): Promise<PostingResult> => {
      const job = await tx.aiExtractionJob.findFirst({
        where: {
          id,
          deletedAt: null,
          fileAttachment: { deletedAt: null },
        },
        select: {
          id: true,
          status: true,
          extractedJson: true,
          fileAttachmentId: true,
          postedInvoiceId: true,
          fileAttachment: {
            select: {
              id: true,
              originalFileName: true,
              invoiceId: true,
              relatedType: true,
            },
          },
        },
      });

      if (!job) {
        throw new AiPostingConflictError("post-not-found", "AI taslagi bulunamadi.");
      }

      if (job.postedInvoiceId) {
        return { invoiceId: job.postedInvoiceId, alreadyPosted: true };
      }

      if (!job.extractedJson?.trim()) {
        throw new AiPostingConflictError("post-json", "AI taslak JSON bulunamadi.");
      }

      const currentDraft = parseCanonicalDraftJson(job.extractedJson);
      const draft = normalizeDraftFromForm(currentDraft, formData);
      const prepared = prepareAiDraftForPosting({
        draft,
        companyId: readFormText(formData, "companyId"),
        invoiceType: readFormText(formData, "invoiceType"),
        productSelections: readProductSelections(formData),
      });

      const companyId = await resolveCompany(tx, prepared);
      const productIds = await resolveProducts(tx, prepared, companyId);
      const duplicate = await tx.invoice.findFirst({
        where: {
          companyId,
          invoiceNumber: prepared.draft.document.invoiceNumber!,
          type: prepared.invoiceType,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new AiPostingConflictError("post-duplicate", "Ayni cari, fatura no ve tipte aktif fatura var.");
      }

      const invoice = await tx.invoice.create({
        data: {
          companyId,
          type: prepared.invoiceType,
          invoiceNumber: prepared.draft.document.invoiceNumber!,
          invoiceDate: prepared.invoiceDate,
          dueDate: prepared.dueDate,
          currency: prepared.draft.document.currency || "TRY",
          status: "UNPAID",
          subtotal: prepared.totals.subtotal,
          vatAmount: prepared.totals.vatAmount,
          discountAmount: prepared.totals.discountAmount,
          totalAmount: prepared.totals.totalAmount,
          notes: `AI analiz taslagindan kaydedildi. Analiz ID: ${job.id}`,
        },
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          dueDate: true,
          status: true,
          companyId: true,
          deletedAt: true,
          currency: true,
          totalAmount: true,
        },
      });

      const stockLines: InvoiceStockLineInput[] = [];

      for (const [index, line] of prepared.calculatedLines.entries()) {
        const item = await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: productIds[index] ?? null,
            description: line.description,
            quantity: line.quantity,
            unit: prepared.units[index] ?? "ADET",
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            discountAmount: line.discountAmount,
            lineTotal: line.lineTotal,
            sortOrder: index,
          },
          select: {
            id: true,
            productId: true,
            quantity: true,
            unit: true,
            description: true,
          },
        });

        stockLines.push({
          invoiceItemId: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
        });
      }

      await reconcileInvoiceStockMovements(tx, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.type,
        invoiceDate: prepared.invoiceDate,
        lines: stockLines,
      });

      const postedDraft = {
        ...prepared.draft,
        review: {
          ...prepared.draft.review,
          status: "REVIEWED" as const,
          selectedCompanyId: companyId,
          invoiceType: prepared.invoiceType,
          reviewedAt: new Date().toISOString(),
        },
        postedInvoiceId: invoice.id,
      };

      await tx.fileAttachment.update({
        where: { id: job.fileAttachmentId },
        data: {
          invoiceId: invoice.id,
          relatedType: "INVOICE",
        },
        select: { id: true },
      });

      await saveConfirmedMappings(tx, prepared, companyId, productIds);

      const postedUpdate = await tx.aiExtractionJob.updateMany({
        where: { id: job.id, postedInvoiceId: null },
        data: {
          status: "POSTED",
          postedInvoiceId: invoice.id,
          extractedJson: JSON.stringify(postedDraft, null, 2),
          errorMessage: null,
        },
      });

      if (postedUpdate.count !== 1) {
        throw new AiPostingConflictError("post-already-posted", "AI taslagi daha once faturaya kaydedildi.");
      }

      await createAuditLog(
        {
          entityType: "INVOICE",
          entityId: invoice.id,
          action: "CREATE",
          title: `AI taslagindan fatura kaydedildi: ${invoice.invoiceNumber}`,
          description: `${job.fileAttachment.originalFileName} kaynagindan fatura olusturuldu.`,
          after: {
            aiExtractionJobId: job.id,
            fileAttachmentId: job.fileAttachmentId,
            companyId,
            invoiceType: invoice.type,
            totalAmount: invoice.totalAmount,
            itemCount: prepared.calculatedLines.length,
          },
        },
        tx,
      );

      await createAuditLog(
        {
          entityType: "AI_EXTRACTION",
          entityId: job.id,
          action: "STATUS_CHANGE",
          title: "AI taslagi faturaya kaydedildi",
          description: `Taslak POSTED yapildi ve ${invoice.invoiceNumber} faturasina baglandi.`,
          before: {
            status: job.status,
            postedInvoiceId: job.postedInvoiceId,
            fileAttachmentInvoiceId: job.fileAttachment.invoiceId,
            fileAttachmentRelatedType: job.fileAttachment.relatedType,
          },
          after: {
            status: "POSTED",
            postedInvoiceId: invoice.id,
          },
        },
        tx,
      );

      return { invoiceId: invoice.id, invoice, alreadyPosted: false };
    });

    postedInvoiceId = posted.invoiceId;

    if (!posted.alreadyPosted) {
      await syncInvoiceDueReminder(posted.invoice);
    }
  } catch (error) {
    const queryError = mapPostingError(error);
    detailUrl.searchParams.set("error", queryError);
    return NextResponse.redirect(detailUrl);
  }

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${id}`);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${postedInvoiceId}`);
  revalidatePath("/important-dates");
  return NextResponse.redirect(new URL(`/invoices/${postedInvoiceId}`, request.url));
}

async function resolveCompany(tx: Prisma.TransactionClient, prepared: AiPostingPreparedDraft) {
  if (!prepared.createNewCompany) {
    if (!prepared.companyId) {
      throw new AiPostingConflictError("post-company", "Cari secilmeli.");
    }

    const company = await tx.company.findFirst({
      where: { id: prepared.companyId, deletedAt: null },
      select: { id: true },
    });

    if (!company) {
      throw new AiPostingConflictError("post-company", "Secilen cari aktif degil.");
    }

    return company.id;
  }

  const name = prepared.draft.document.companyName;
  if (!name) {
    throw new AiPostingConflictError("post-new-company", "Yeni cari icin firma adi zorunlu.");
  }

  const conflict = await tx.company.findFirst({
    where: {
      deletedAt: null,
      OR: [
        ...(prepared.draft.document.taxNumber ? [{ taxNumber: prepared.draft.document.taxNumber }] : []),
        { name },
      ],
    },
    select: { id: true },
  });

  if (conflict) {
    throw new AiPostingConflictError("post-company-conflict", "Ayni vergi no veya ad ile aktif cari var.");
  }

  const company = await tx.company.create({
    data: {
      name,
      type: prepared.invoiceType === "PURCHASE" ? "SUPPLIER" : "CUSTOMER",
      taxNumber: prepared.draft.document.taxNumber,
      taxOffice: prepared.draft.document.taxOffice,
      defaultCurrency: prepared.draft.document.currency || "TRY",
    },
    select: { id: true },
  });

  await createAuditLog(
    {
      entityType: "COMPANY",
      entityId: company.id,
      action: "CREATE",
      title: `AI taslagindan cari olusturuldu: ${name}`,
      description: "Kullanici onayi ile AI taslagi icin yeni cari olusturuldu.",
      after: {
        name,
        taxNumber: prepared.draft.document.taxNumber,
      },
    },
    tx,
  );

  return company.id;
}

async function resolveProducts(
  tx: Prisma.TransactionClient,
  prepared: AiPostingPreparedDraft,
  supplierCompanyId: string,
) {
  const productIds: Array<string | null> = [];

  for (const [index, selection] of prepared.productSelections.entries()) {
    const line = prepared.draft.lineItems[index];

    if (selection.createNew) {
      productIds.push(await createProductFromLine(tx, prepared, index, supplierCompanyId));
      continue;
    }

    if (!selection.productId) {
      productIds.push(null);
      continue;
    }

    const product = await tx.product.findFirst({
      where: { id: selection.productId, deletedAt: null, isActive: true },
      select: { id: true, unit: true },
    });

    if (!product) {
      throw new AiPostingConflictError("post-product", "Secilen urun aktif degil.");
    }

    if (line.unit && product.unit !== line.unit) {
      throw new AiPostingConflictError("post-product-unit", "Secilen urun ile satir birimi uyumlu degil.");
    }

    productIds.push(product.id);
  }

  return productIds;
}

async function createProductFromLine(
  tx: Prisma.TransactionClient,
  prepared: AiPostingPreparedDraft,
  index: number,
  supplierCompanyId: string,
) {
  const line = prepared.draft.lineItems[index];
  const name = line.description;
  const sku = prepared.productSelections[index]?.sku || line.sku;

  if (!name || !sku) {
    throw new AiPostingConflictError("post-new-product", "Yeni urun icin aciklama ve SKU zorunlu.");
  }

  const barcode = prepared.productSelections[index]?.barcode || line.barcode;
  const conflict = await tx.product.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { sku },
        ...(barcode ? [{ barcode }] : []),
      ],
    },
    select: { id: true },
  });

  if (conflict) {
    throw new AiPostingConflictError("post-product-conflict", "Ayni SKU veya barkod ile aktif urun var.");
  }

  const unit = line.unit ?? "ADET";
  const unitPrice = line.unitPrice ? new Prisma.Decimal(line.unitPrice) : new Prisma.Decimal(0);
  const vatRate = line.vatRate ? new Prisma.Decimal(line.vatRate) : new Prisma.Decimal(0);
  const product = await tx.product.create({
    data: {
      name,
      sku,
      barcode,
      unit,
      currency: prepared.draft.document.currency || "TRY",
      defaultVatRate: vatRate,
      defaultPurchasePrice: prepared.invoiceType === "PURCHASE" ? unitPrice : new Prisma.Decimal(0),
      defaultSalesPrice: prepared.invoiceType === "SALES" ? unitPrice : new Prisma.Decimal(0),
    },
    select: { id: true },
  });

  await createAuditLog(
    {
      entityType: "PRODUCT",
      entityId: product.id,
      action: "CREATE",
      title: `AI taslagindan urun olusturuldu: ${name}`,
      description: "Kullanici onayi ile AI taslagi satirindan yeni urun olusturuldu.",
      after: {
        name,
        sku,
        barcode,
        unit,
        supplierCompanyId,
      },
    },
    tx,
  );

  return product.id;
}

async function saveConfirmedMappings(
  tx: Prisma.TransactionClient,
  prepared: AiPostingPreparedDraft,
  companyId: string,
  productIds: Array<string | null>,
) {
  if (prepared.draft.document.taxNumber) {
    await upsertMapping(tx, {
      type: "COMPANY",
      sourceKey: "TAX_NUMBER",
      sourceValue: prepared.draft.document.taxNumber,
      companyId,
    });
  }

  if (prepared.draft.document.companyName) {
    await upsertMapping(tx, {
      type: "COMPANY",
      sourceKey: "COMPANY_NAME",
      sourceValue: prepared.draft.document.companyName,
      companyId,
    });
  }

  for (const [index, productId] of productIds.entries()) {
    if (!productId) continue;
    const line = prepared.draft.lineItems[index];
    const source = line.sku
      ? { sourceKey: "SKU", sourceValue: line.sku }
      : line.barcode
        ? { sourceKey: "BARCODE", sourceValue: line.barcode }
        : line.description
          ? { sourceKey: "DESCRIPTION", sourceValue: line.description }
          : null;

    if (!source) continue;

    await upsertMapping(tx, {
      type: "PRODUCT",
      sourceKey: source.sourceKey,
      sourceValue: source.sourceValue,
      productId,
      supplierCompanyId: companyId,
    });
  }
}

async function upsertMapping(
  tx: Prisma.TransactionClient,
  input: {
    type: "COMPANY" | "PRODUCT";
    sourceKey: string;
    sourceValue: string;
    companyId?: string;
    productId?: string;
    supplierCompanyId?: string;
  },
) {
  const normalized = normalizeMappingSource(input);
  const existing = await tx.aiConfirmedMapping.findFirst({
    where: {
      type: input.type,
      sourceKey: normalized.sourceKey,
      sourceValue: normalized.sourceValue,
      supplierCompanyId: input.supplierCompanyId ?? null,
      deletedAt: null,
    },
    select: { id: true },
  });

  const data = {
    sourceKey: normalized.sourceKey,
    sourceValue: normalized.sourceValue,
    companyId: input.companyId ?? null,
    productId: input.productId ?? null,
    supplierCompanyId: input.supplierCompanyId ?? null,
  };

  if (existing) {
    await tx.aiConfirmedMapping.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
    return;
  }

  await tx.aiConfirmedMapping.create({
    data: {
      type: input.type,
      ...data,
    },
    select: { id: true },
  });
}

function mapPostingError(error: unknown) {
  if (error instanceof AiPostingConflictError) {
    return error.queryError;
  }

  if (error instanceof AiPostingValidationError) {
    return `post-${error.code}`;
  }

  return "post-failed";
}
