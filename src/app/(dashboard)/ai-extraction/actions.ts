"use server";

import { AiExtractionStatus } from "#prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAiExtractionFileWhere,
  validateJsonText,
} from "@/lib/ai-extraction-utils";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";
import { requireLocalAuth } from "@/lib/security-utils";

export type AiExtractionFormField =
  | "fileAttachmentId"
  | "status"
  | "rawExtractedText"
  | "extractedJson"
  | "confidence"
  | "errorMessage";

export type AiExtractionFormState = {
  message?: string;
  errors?: Partial<Record<AiExtractionFormField, string>>;
};

type AiExtractionPayload = {
  fileAttachmentId: string;
  status: AiExtractionStatus;
  rawExtractedText: string | null;
  extractedJson: string | null;
  confidence: number | null;
  errorMessage: string | null;
};

function readText(formData: FormData, key: AiExtractionFormField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

async function parseAiExtractionForm(
  formData: FormData,
  { requireFile }: { requireFile: boolean },
): Promise<{ data?: AiExtractionPayload; errors: AiExtractionFormState["errors"] }> {
  const errors: AiExtractionFormState["errors"] = {};
  const fileAttachmentId = readText(formData, "fileAttachmentId");
  const status = readText(formData, "status") || "PENDING";
  const extractedJson = readText(formData, "extractedJson");
  const confidenceValue = readText(formData, "confidence").replace(",", ".");

  if (requireFile && !fileAttachmentId) {
    errors.fileAttachmentId = "Dosya seÃ§ilmeli.";
  }

  if (!Object.values(AiExtractionStatus).includes(status as AiExtractionStatus)) {
    errors.status = "GeÃ§erli bir durum seÃ§in.";
  }

  if (extractedJson && !validateJsonText(extractedJson)) {
    errors.extractedJson = "GeÃ§erli bir JSON girin.";
  }

  let confidence: number | null = null;

  if (confidenceValue) {
    const parsedConfidence = Number(confidenceValue);

    if (Number.isNaN(parsedConfidence)) {
      errors.confidence = "GÃ¼ven skoru sayÄ±sal olmalÄ±.";
    } else if (parsedConfidence < 0 || parsedConfidence > 1) {
      errors.confidence = "GÃ¼ven skoru 0 ile 1 arasÄ±nda olmalÄ±.";
    } else {
      confidence = parsedConfidence;
    }
  }

  if (fileAttachmentId) {
    const file = await prisma.fileAttachment.findFirst({
      where: {
        id: fileAttachmentId,
        ...getAiExtractionFileWhere(),
      },
      select: { id: true },
    });

    if (!file) {
      errors.fileAttachmentId = "SeÃ§ilen dosya AI analiz iÃ§in uygun deÄŸil.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      fileAttachmentId,
      status: status as AiExtractionStatus,
      rawExtractedText: optionalText(readText(formData, "rawExtractedText")),
      extractedJson: optionalText(extractedJson),
      confidence,
      errorMessage: optionalText(readText(formData, "errorMessage")),
    },
    errors,
  };
}

export async function createAiExtractionAction(
  _previousState: AiExtractionFormState,
  formData: FormData,
): Promise<AiExtractionFormState> {
  const parsed = await parseAiExtractionForm(formData, { requireFile: true });

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  let jobId: string;

  try {
    const job = await prisma.aiExtractionJob.create({
      data: parsed.data,
      select: { id: true },
    });
    jobId = job.id;
    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: jobId,
      action: "CREATE",
      title: "AI analiz kaydÄ± oluÅŸturuldu",
      description: "GerÃ§ek OCR Ã§alÄ±ÅŸmadan analiz hazÄ±rlÄ±k kaydÄ± oluÅŸturuldu.",
      after: {
        fileAttachmentId: parsed.data.fileAttachmentId,
        status: parsed.data.status,
        confidence: parsed.data.confidence,
      },
    });
  } catch {
    return { message: "AI analiz kaydÄ± oluÅŸturulurken bir hata oluÅŸtu." };
  }

  revalidatePath("/ai-extraction");
  revalidatePath(`/files/${parsed.data.fileAttachmentId}`);
  redirect(`/ai-extraction/${jobId}`);
}

export async function updateAiExtractionAction(
  jobId: string,
  _previousState: AiExtractionFormState,
  formData: FormData,
): Promise<AiExtractionFormState> {
  const parsed = await parseAiExtractionForm(formData, { requireFile: true });

  if (!parsed.data) {
    return { errors: parsed.errors, message: "LÃ¼tfen formdaki hatalarÄ± dÃ¼zeltin." };
  }

  try {
    const before = await prisma.aiExtractionJob.findFirst({
      where: { id: jobId, deletedAt: null },
      select: {
        id: true,
        fileAttachmentId: true,
        status: true,
        confidence: true,
        errorMessage: true,
      },
    });

    await prisma.aiExtractionJob.update({
      where: { id: jobId, deletedAt: null },
      data: {
        status: parsed.data.status,
        rawExtractedText: parsed.data.rawExtractedText,
        extractedJson: parsed.data.extractedJson,
        confidence: parsed.data.confidence,
        errorMessage: parsed.data.errorMessage,
      },
      select: { id: true },
    });
    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: jobId,
      action: before?.status !== parsed.data.status ? "STATUS_CHANGE" : "UPDATE",
      title: "AI analiz kaydÄ± gÃ¼ncellendi",
      description: "AI analiz hazÄ±rlÄ±k kaydÄ±nda deÄŸiÅŸiklik yapÄ±ldÄ±.",
      before,
      after: {
        fileAttachmentId: parsed.data.fileAttachmentId,
        status: parsed.data.status,
        confidence: parsed.data.confidence,
        errorMessage: parsed.data.errorMessage,
      },
    });
  } catch {
    return { message: "AI analiz kaydÄ± gÃ¼ncellenirken bir hata oluÅŸtu." };
  }

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${jobId}`);
  redirect(`/ai-extraction/${jobId}`);
}

export async function updateAiExtractionStatusAction(
  jobId: string,
  status: AiExtractionStatus,
) {
  try {
    const before = await prisma.aiExtractionJob.findFirst({
      where: { id: jobId, deletedAt: null },
      select: { id: true, status: true },
    });
    const job = await prisma.aiExtractionJob.update({
      where: { id: jobId, deletedAt: null },
      data: { status },
      select: { id: true, status: true },
    });
    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: job.id,
      action: "STATUS_CHANGE",
      title: "AI analiz durumu deÄŸiÅŸti",
      description: `${before?.status ?? "-"} -> ${job.status}`,
      before,
      after: job,
    });
  } catch {
    redirect(`/ai-extraction/${jobId}?error=status`);
  }

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${jobId}`);
  redirect(`/ai-extraction/${jobId}`);
}

export async function archiveAiExtractionJobAction(jobId: string) {
  await requireLocalAuth(`/ai-extraction/${jobId}`);

  try {
    const job = await prisma.aiExtractionJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        fileAttachmentId: true,
        status: true,
        confidence: true,
        errorMessage: true,
        extractedJson: true,
        deletedAt: true,
        fileAttachment: {
          select: {
            originalFileName: true,
          },
        },
      },
    });

    if (!job) {
      redirect("/ai-extraction?error=archive-not-found");
    }

    if (job.deletedAt) {
      redirect(`/ai-extraction/${job.id}?error=archive-already`);
    }

    const archivedJob = await prisma.aiExtractionJob.update({
      where: { id: job.id, deletedAt: null },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        fileAttachmentId: true,
        status: true,
        confidence: true,
        errorMessage: true,
        deletedAt: true,
      },
    });

    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: archivedJob.id,
      action: "SOFT_DELETE",
      title: "AI analiz kaydÄ± arÅŸivlendi",
      description:
        "AI analiz kaydÄ± arÅŸivlendi. BaÄŸlÄ± dosya, oluÅŸturulmuÅŸ fatura ve iÅŸ kayÄ±tlarÄ± deÄŸiÅŸtirilmedi.",
      before: {
        id: job.id,
        fileAttachmentId: job.fileAttachmentId,
        status: job.status,
        confidence: job.confidence,
        errorMessage: job.errorMessage,
        fileName: job.fileAttachment.originalFileName,
        createdInvoiceId: getCreatedInvoiceId(job.extractedJson),
      },
      after: archivedJob,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(`/ai-extraction/${jobId}?error=archive`);
  }

  revalidatePath("/ai-extraction");
  revalidatePath("/files");
  revalidatePath("/trash");
  redirect("/ai-extraction?archived=1");
}

export async function restoreAiExtractionJobAction(jobId: string) {
  await requireLocalAuth("/trash?type=ai-extractions");

  try {
    const job = await prisma.aiExtractionJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        fileAttachmentId: true,
        status: true,
        confidence: true,
        errorMessage: true,
        deletedAt: true,
        fileAttachment: {
          select: {
            originalFileName: true,
          },
        },
      },
    });

    if (!job) {
      redirect("/trash?type=ai-extractions&error=restore-not-found");
    }

    if (!job.deletedAt) {
      redirect("/trash?type=ai-extractions&error=restore-active");
    }

    const restoredJob = await prisma.aiExtractionJob.update({
      where: { id: job.id },
      data: { deletedAt: null },
      select: {
        id: true,
        fileAttachmentId: true,
        status: true,
        confidence: true,
        errorMessage: true,
      },
    });

    await createAuditLog({
      entityType: "AI_EXTRACTION",
      entityId: restoredJob.id,
      action: "RESTORE",
      title: "AI analiz kaydÄ± geri yÃ¼klendi",
      description:
        "AI analiz kaydÄ± arÅŸivden geri yÃ¼klendi. BaÄŸlÄ± dosya, fatura ve iÅŸ kayÄ±tlarÄ± deÄŸiÅŸtirilmedi.",
      before: {
        id: job.id,
        fileAttachmentId: job.fileAttachmentId,
        status: job.status,
        confidence: job.confidence,
        errorMessage: job.errorMessage,
        deletedAt: job.deletedAt,
        fileName: job.fileAttachment.originalFileName,
      },
      after: restoredJob,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect("/trash?type=ai-extractions&error=restore");
  }

  revalidatePath("/ai-extraction");
  revalidatePath("/files");
  revalidatePath("/trash");
  redirect("/trash?type=ai-extractions&restored=1");
}

function getCreatedInvoiceId(extractedJson: string | null) {
  if (!extractedJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(extractedJson) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "createdInvoiceId" in parsed &&
      typeof (parsed as { createdInvoiceId?: unknown }).createdInvoiceId === "string"
    ) {
      return (parsed as { createdInvoiceId: string }).createdInvoiceId;
    }
  } catch {
    return null;
  }

  return null;
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
