import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import { runInvoiceStructuredExtractionJob } from "@/lib/document-processing-service";
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
  const result = await runInvoiceStructuredExtractionJob(prisma, id);

  if (result.ok) {
    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: result.job.id,
      action: "UPDATE",
      title: "Fatura bilgileri metinden çıkarıldı",
      description: `${result.job.fileAttachment.originalFileName} için fatura bilgileri çıkarıldı.`,
      before: {
        status: result.job.status,
        extractedJson: result.job.extractedJson,
        errorMessage: result.job.errorMessage,
      },
      after: {
        status: result.updatedJob.status,
        extractedJson: result.updatedJob.extractedJson,
        fileAttachmentId: result.updatedJob.fileAttachmentId,
        providerId: result.providerId,
      },
    });

    revalidatePath("/ai-extraction");
    revalidatePath(`/ai-extraction/${result.job.id}`);
    detailUrl.searchParams.set("parsed", "1");
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
      action: "UPDATE",
      title: "Fatura bilgileri çıkarma hatası",
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
