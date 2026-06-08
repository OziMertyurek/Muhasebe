"use server";

import { AiExtractionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAiExtractionFileWhere,
  validateJsonText,
} from "@/lib/ai-extraction-utils";
import { prisma } from "@/lib/prisma";

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
    errors.fileAttachmentId = "Dosya seçilmeli.";
  }

  if (!Object.values(AiExtractionStatus).includes(status as AiExtractionStatus)) {
    errors.status = "Geçerli bir durum seçin.";
  }

  if (extractedJson && !validateJsonText(extractedJson)) {
    errors.extractedJson = "Geçerli bir JSON girin.";
  }

  let confidence: number | null = null;

  if (confidenceValue) {
    const parsedConfidence = Number(confidenceValue);

    if (Number.isNaN(parsedConfidence)) {
      errors.confidence = "Güven skoru sayısal olmalı.";
    } else if (parsedConfidence < 0 || parsedConfidence > 1) {
      errors.confidence = "Güven skoru 0 ile 1 arasında olmalı.";
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
      errors.fileAttachmentId = "Seçilen dosya AI analiz için uygun değil.";
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
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  let jobId: string;

  try {
    const job = await prisma.aiExtractionJob.create({
      data: parsed.data,
      select: { id: true },
    });
    jobId = job.id;
  } catch {
    return { message: "AI analiz kaydı oluşturulurken bir hata oluştu." };
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
    return { errors: parsed.errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  try {
    await prisma.aiExtractionJob.update({
      where: { id: jobId },
      data: {
        status: parsed.data.status,
        rawExtractedText: parsed.data.rawExtractedText,
        extractedJson: parsed.data.extractedJson,
        confidence: parsed.data.confidence,
        errorMessage: parsed.data.errorMessage,
      },
      select: { id: true },
    });
  } catch {
    return { message: "AI analiz kaydı güncellenirken bir hata oluştu." };
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
    await prisma.aiExtractionJob.update({
      where: { id: jobId },
      data: { status },
      select: { id: true },
    });
  } catch {
    redirect(`/ai-extraction/${jobId}?error=status`);
  }

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${jobId}`);
  redirect(`/ai-extraction/${jobId}`);
}
