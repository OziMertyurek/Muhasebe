import { AiExtractionStatus, type PrismaClient, type Prisma } from "@prisma/client";
import {
  getInvoiceStructuredExtractionProvider,
  getTextExtractionProvider,
  withProviderTimeout,
} from "./document-processing-providers.ts";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

const staleProcessingMs = 10 * 60 * 1_000;

export function canRetryAiExtractionJob(job: {
  status: AiExtractionStatus;
  postedInvoiceId?: string | null;
}) {
  return job.status !== "POSTED" && !job.postedInvoiceId;
}

export function isAiExtractionProcessingStale(job: {
  status: AiExtractionStatus;
  updatedAt: Date;
}, now = new Date()) {
  return job.status === "PROCESSING" && now.getTime() - job.updatedAt.getTime() > staleProcessingMs;
}

export async function runTextExtractionJob(db: PrismaLike, jobId: string) {
  const job = await db.aiExtractionJob.findFirst({
    where: {
      id: jobId,
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
    return { ok: false as const, code: "not-found", message: "AI analiz kaydı bulunamadı." };
  }

  if (!canRetryAiExtractionJob(job)) {
    return { ok: false as const, code: "posted", message: "Kaydedilmiş AI taslağı tekrar işlenemez." };
  }

  if (job.status === "PROCESSING" && !isAiExtractionProcessingStale(job)) {
    return { ok: false as const, code: "processing", message: "Belge işleme halen devam ediyor." };
  }

  await db.aiExtractionJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", errorMessage: null },
    select: { id: true },
  });

  const provider = getTextExtractionProvider();
  const result = await withProviderTimeout(provider.extractText(job.fileAttachment));

  if (!result.ok) {
    const failedJob = await db.aiExtractionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: result.message },
      select: { id: true, status: true, errorMessage: true, fileAttachmentId: true },
    });

    return {
      ok: false as const,
      code: result.code,
      message: result.message,
      job,
      failedJob,
      providerId: provider.id,
    };
  }

  const updatedJob = await db.aiExtractionJob.update({
    where: { id: job.id },
    data: {
      rawExtractedText: result.value,
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

  return { ok: true as const, job, updatedJob, providerId: provider.id };
}

export async function runInvoiceStructuredExtractionJob(db: PrismaLike, jobId: string) {
  const job = await db.aiExtractionJob.findFirst({
    where: {
      id: jobId,
      deletedAt: null,
      fileAttachment: { deletedAt: null },
    },
    select: {
      id: true,
      status: true,
      postedInvoiceId: true,
      rawExtractedText: true,
      extractedJson: true,
      errorMessage: true,
      fileAttachmentId: true,
      fileAttachment: {
        select: { originalFileName: true },
      },
    },
  });

  if (!job) {
    return { ok: false as const, code: "not-found", message: "AI analiz kaydı bulunamadı." };
  }

  if (!canRetryAiExtractionJob(job)) {
    return { ok: false as const, code: "posted", message: "Kaydedilmiş AI taslağı tekrar işlenemez." };
  }

  if (!job.rawExtractedText?.trim()) {
    return { ok: false as const, code: "parse-empty", message: "Çıkarılmış metin bulunamadı." };
  }

  const provider = getInvoiceStructuredExtractionProvider();
  const result = await withProviderTimeout(provider.extractInvoice(job.rawExtractedText));

  if (!result.ok) {
    const failedJob = await db.aiExtractionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: result.message },
      select: { id: true, status: true, errorMessage: true, fileAttachmentId: true },
    });

    return {
      ok: false as const,
      code: result.code,
      message: result.message,
      job,
      failedJob,
      providerId: provider.id,
    };
  }

  const extractedJson = JSON.stringify(result.value, null, 2);
  const updatedJob = await db.aiExtractionJob.update({
    where: { id: job.id },
    data: {
      extractedJson,
      status: "COMPLETED",
      errorMessage: null,
    },
    select: { id: true, status: true, extractedJson: true, fileAttachmentId: true },
  });

  return { ok: true as const, job, updatedJob, providerId: provider.id };
}
