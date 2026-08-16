import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import { runTextExtractionJob } from "@/lib/document-processing-service";
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
  const result = await runTextExtractionJob(prisma, id);

  if (result.ok) {
    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: result.job.id,
      action: "UPDATE",
      title: "Belgeden metin çıkarıldı",
      description: `${result.job.fileAttachment.originalFileName} dosyasından metin çıkarıldı.`,
      before: {
        status: result.job.status,
        rawExtractedText: result.job.rawExtractedText,
        errorMessage: result.job.errorMessage,
      },
      after: {
        status: result.updatedJob.status,
        textLength: result.updatedJob.rawExtractedText?.length ?? 0,
        fileAttachmentId: result.updatedJob.fileAttachmentId,
        providerId: result.providerId,
      },
    });

    revalidatePath("/ai-extraction");
    revalidatePath(`/ai-extraction/${result.job.id}`);
    detailUrl.searchParams.set("extracted", "1");
    return NextResponse.redirect(detailUrl);
  }

  if (result.code === "not-found") {
    return NextResponse.redirect(new URL("/ai-extraction?error=not-found", request.url));
  }

  const failedSourceJob = "job" in result ? result.job : null;

  if (failedSourceJob) {
    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: failedSourceJob.id,
      action: "STATUS_CHANGE",
      title: "Belge metni çıkarma hatası",
      description: result.message,
      before: {
        status: failedSourceJob.status,
        errorMessage: failedSourceJob.errorMessage,
      },
      after: "failedJob" in result ? result.failedJob : { errorMessage: result.message },
    });
  }

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${id}`);
  detailUrl.searchParams.set("error", result.code);
  return NextResponse.redirect(detailUrl);
}
