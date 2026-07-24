import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import { extractMarkdownFromFileAttachment } from "@/lib/markitdown-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtractRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: ExtractRouteContext) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;
  const detailUrl = new URL(`/ai-extraction/${id}`, request.url);
  const job = await prisma.aiExtractionJob.findFirst({
    where: {
      id,
      deletedAt: null,
      fileAttachment: { deletedAt: null },
    },
    include: {
      fileAttachment: {
        select: {
          id: true,
          filePath: true,
          mimeType: true,
          originalFileName: true,
          relatedType: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.redirect(new URL("/ai-extraction?error=not-found", request.url));
  }

  await prisma.aiExtractionJob.update({
    where: { id: job.id },
    data: {
      status: "PROCESSING",
      errorMessage: null,
    },
    select: { id: true },
  });

  const result = await extractMarkdownFromFileAttachment(job.fileAttachment);

  if (result.ok) {
    const updatedJob = await prisma.aiExtractionJob.update({
      where: { id: job.id },
      data: {
        rawExtractedText: result.text,
        status: "COMPLETED",
        errorMessage: null,
      },
      select: {
        id: true,
        status: true,
        rawExtractedText: true,
        fileAttachmentId: true,
      },
    });

    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: job.id,
      action: "UPDATE",
      title: "MarkItDown ile metin çıkarıldı",
      description: `${job.fileAttachment.originalFileName} dosyasından metin çıkarıldı.`,
      before: {
        status: job.status,
        rawExtractedText: job.rawExtractedText,
        errorMessage: job.errorMessage,
      },
      after: {
        status: updatedJob.status,
        textLength: updatedJob.rawExtractedText?.length ?? 0,
        fileAttachmentId: updatedJob.fileAttachmentId,
      },
    });

    revalidatePath("/ai-extraction");
    revalidatePath(`/ai-extraction/${job.id}`);
    detailUrl.searchParams.set("extracted", "1");
    return NextResponse.redirect(detailUrl);
  }

  const failedJob = await prisma.aiExtractionJob.update({
    where: { id: job.id },
    data: {
      status: "FAILED",
      errorMessage: result.error,
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
    action: "STATUS_CHANGE",
    title: "MarkItDown metin çıkarma hatası",
    description: result.error,
    before: {
      status: job.status,
      errorMessage: job.errorMessage,
    },
    after: failedJob,
  });

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${job.id}`);
  detailUrl.searchParams.set("error", "markitdown");
  return NextResponse.redirect(detailUrl);
}
