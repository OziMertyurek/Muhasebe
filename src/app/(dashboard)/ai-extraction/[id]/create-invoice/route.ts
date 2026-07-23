import { InvoiceType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  createDecimalFromNumber,
  mergeAiInvoiceCreatedInvoiceId,
  parseAiInvoiceCreateData,
  parseAiInvoiceDate,
  validateAiInvoiceCreateInput,
} from "@/lib/ai-invoice-create-utils";
import { createAuditLog } from "@/lib/audit-log-utils";
import { syncInvoiceDueReminder } from "@/lib/auto-reminder-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateInvoiceRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: CreateInvoiceRouteContext) {
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
      fileAttachmentId: true,
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
    return NextResponse.redirect(new URL("/ai-extraction?error=not-found", request.url));
  }

  if (!job.extractedJson?.trim()) {
    detailUrl.searchParams.set("error", "create-invoice-json");
    return NextResponse.redirect(detailUrl);
  }

  const invoiceData = parseAiInvoiceCreateData(job.extractedJson);
  const validation = validateAiInvoiceCreateInput({
    data: invoiceData,
    confirmed,
    companyId,
    invoiceType,
  });

  if (validation !== "ok") {
    detailUrl.searchParams.set("error", mapValidationToQueryError(validation));
    return NextResponse.redirect(detailUrl);
  }

  if (!invoiceData) {
    detailUrl.searchParams.set("error", "create-invoice-json");
    return NextResponse.redirect(detailUrl);
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!company) {
    detailUrl.searchParams.set("error", "create-invoice-company");
    return NextResponse.redirect(detailUrl);
  }

  const duplicateInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: invoiceData.invoiceNumber!,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (duplicateInvoice) {
    detailUrl.searchParams.set("error", "create-invoice-duplicate");
    return NextResponse.redirect(detailUrl);
  }

  const invoiceDate = parseAiInvoiceDate(invoiceData.invoiceDate);

  if (!invoiceDate) {
    detailUrl.searchParams.set("error", "create-invoice-date");
    return NextResponse.redirect(detailUrl);
  }

  const dueDate = parseAiInvoiceDate(invoiceData.dueDate);
  const totalAmount = createDecimalFromNumber(invoiceData.totalAmount);
  const subtotal = createDecimalFromNumber(invoiceData.subtotal, invoiceData.totalAmount ?? 0);
  const vatAmount = createDecimalFromNumber(invoiceData.vatAmount);
  const discountAmount = createDecimalFromNumber(invoiceData.discountAmount);

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          companyId,
          type: invoiceType as InvoiceType,
          invoiceNumber: invoiceData.invoiceNumber!,
          invoiceDate,
          dueDate,
          currency: invoiceData.currency || "TRY",
          subtotal,
          vatAmount,
          discountAmount,
          totalAmount,
          status: "UNPAID",
          notes: `AI analiz kaydından oluşturuldu. Analiz ID: ${job.id}`,
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

      await tx.fileAttachment.update({
        where: { id: job.fileAttachmentId },
        data: {
          invoiceId: createdInvoice.id,
          relatedType: "INVOICE",
        },
        select: { id: true },
      });

      await tx.aiExtractionJob.update({
        where: { id: job.id },
        data: {
          status: "REVIEWED",
          extractedJson: mergeAiInvoiceCreatedInvoiceId(
            job.extractedJson!,
            createdInvoice.id,
            companyId,
          ),
          errorMessage: null,
        },
        select: { id: true },
      });

      return createdInvoice;
    });

    await createAuditLog({
      entityType: "INVOICE",
      entityId: invoice.id,
      action: "CREATE",
      title: `AI analizinden fatura oluşturuldu: ${invoice.invoiceNumber}`,
      description: `${job.fileAttachment.originalFileName} dosyasından ${company.name} carisine fatura oluşturuldu.`,
      after: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        companyId,
        aiExtractionJobId: job.id,
        fileAttachmentId: job.fileAttachmentId,
      },
    });

    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: job.id,
      action: "UPDATE",
      title: "AI analiz kaydı faturaya dönüştürüldü",
      description: `Analiz kaydı incelendi olarak işaretlendi ve ${invoice.invoiceNumber} faturası oluşturuldu.`,
      before: {
        status: job.status,
        extractedJson: job.extractedJson,
        fileAttachmentInvoiceId: job.fileAttachment.invoiceId,
        fileAttachmentRelatedType: job.fileAttachment.relatedType,
      },
      after: {
        status: "REVIEWED",
        createdInvoiceId: invoice.id,
        selectedCompanyId: companyId,
      },
    });

    await syncInvoiceDueReminder(invoice);

    safeRevalidatePath("/ai-extraction");
    safeRevalidatePath(`/ai-extraction/${job.id}`);
    safeRevalidatePath("/invoices");
    safeRevalidatePath(`/invoices/${invoice.id}`);
    safeRevalidatePath(`/files/${job.fileAttachmentId}`);
    safeRevalidatePath("/important-dates");

    detailUrl.searchParams.set("invoiceCreated", "1");
    return NextResponse.redirect(detailUrl);
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? "Fatura oluşturulurken veritabanı hatası oluştu."
        : "Fatura oluşturulurken beklenmeyen bir hata oluştu.";

    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: job.id,
      action: "UPDATE",
      title: "AI analizinden fatura oluşturma hatası",
      description: message,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    detailUrl.searchParams.set("error", "create-invoice");
    return NextResponse.redirect(detailUrl);
  }
}

function readFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Direct route tests run outside Next.js request context; the app server can revalidate normally.
  }
}

function mapValidationToQueryError(validation: Exclude<ReturnType<typeof validateAiInvoiceCreateInput>, "ok">) {
  switch (validation) {
    case "missing-json":
    case "invalid-json":
      return "create-invoice-json";
    case "already-created":
      return "create-invoice-existing";
    case "missing-confirmation":
      return "create-invoice-confirm";
    case "missing-company":
      return "create-invoice-company";
    case "missing-type":
      return "create-invoice-type";
    case "missing-invoice-number":
      return "create-invoice-number";
    case "missing-invoice-date":
      return "create-invoice-date";
    case "invalid-total":
      return "create-invoice-total";
  }
}
