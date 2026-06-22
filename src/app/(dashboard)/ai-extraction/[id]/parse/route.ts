import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import { parseInvoiceText } from "@/lib/invoice-parser";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParseRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: ParseRouteContext) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;
  const detailUrl = new URL(`/ai-extraction/${id}`, request.url);
  const job = await prisma.aiExtractionJob.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      rawExtractedText: true,
      extractedJson: true,
      errorMessage: true,
      fileAttachmentId: true,
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

  if (!job.rawExtractedText?.trim()) {
    detailUrl.searchParams.set("error", "parse-empty");
    return NextResponse.redirect(detailUrl);
  }

  try {
    const parsedInvoice = parseInvoiceText(job.rawExtractedText);
    const extractedJson = JSON.stringify(parsedInvoice, null, 2);
    const updatedJob = await prisma.aiExtractionJob.update({
      where: { id: job.id },
      data: {
        extractedJson,
        status: "COMPLETED",
        errorMessage: null,
      },
      select: {
        id: true,
        status: true,
        extractedJson: true,
        fileAttachmentId: true,
      },
    });

    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: job.id,
      action: "UPDATE",
      title: "Fatura bilgileri metinden çıkarıldı",
      description: `${job.fileAttachment.originalFileName} için local parser ile fatura bilgileri çıkarıldı.`,
      before: {
        status: job.status,
        extractedJson: job.extractedJson,
        errorMessage: job.errorMessage,
      },
      after: {
        status: updatedJob.status,
        extractedJson: updatedJob.extractedJson,
        fileAttachmentId: updatedJob.fileAttachmentId,
      },
    });

    revalidatePath("/ai-extraction");
    revalidatePath(`/ai-extraction/${job.id}`);
    detailUrl.searchParams.set("parsed", "1");
    return NextResponse.redirect(detailUrl);
  } catch (error) {
    const message =
      error instanceof Error
        ? `Fatura bilgileri çıkarılırken hata oluştu: ${error.message}`
        : "Fatura bilgileri çıkarılırken beklenmeyen bir hata oluştu.";

    const failedJob = await prisma.aiExtractionJob.update({
      where: { id: job.id },
      data: {
        errorMessage: message,
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        fileAttachmentId: true,
      },
    });

    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: job.id,
      action: "UPDATE",
      title: "Fatura bilgileri çıkarma hatası",
      description: message,
      before: {
        status: job.status,
        errorMessage: job.errorMessage,
      },
      after: failedJob,
    });

    revalidatePath("/ai-extraction");
    revalidatePath(`/ai-extraction/${job.id}`);
    detailUrl.searchParams.set("error", "parse");
    return NextResponse.redirect(detailUrl);
  }
}
