"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FileRelatedType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getSafeFileExtension,
  isAllowedUploadType,
  maxUploadSize,
} from "@/lib/file-utils";
import { getUploadsDir } from "@/lib/app-paths";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";
import { requireLocalAuth } from "@/lib/security-utils";

export type FileUploadFormState = {
  message?: string;
  errors?: Partial<Record<"file" | "relatedType" | "relatedId", string>>;
};

type RelationFields = {
  invoiceId: string | null;
  expenseId: string | null;
  companyId: string | null;
  paymentId: string | null;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function getRelatedType(value: string) {
  if (Object.values(FileRelatedType).includes(value as FileRelatedType)) {
    return value as FileRelatedType;
  }

  return null;
}

async function parseRelation(formData: FormData, relatedType: FileRelatedType) {
  const relation: RelationFields = {
    invoiceId: null,
    expenseId: null,
    companyId: null,
    paymentId: null,
  };

  if (relatedType === "INVOICE") {
    relation.invoiceId = optionalText(readText(formData, "invoiceId"));
  }

  if (relatedType === "EXPENSE") {
    relation.expenseId = optionalText(readText(formData, "expenseId"));
  }

  if (relatedType === "COMPANY") {
    relation.companyId = optionalText(readText(formData, "companyId"));
  }

  if (relatedType === "PAYMENT") {
    relation.paymentId = optionalText(readText(formData, "paymentId"));
  }

  return relation;
}

async function validateRelation(relation: RelationFields) {
  const [invoice, expense, company, payment] = await Promise.all([
    relation.invoiceId
      ? prisma.invoice.findFirst({
          where: { id: relation.invoiceId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    relation.expenseId
      ? prisma.expense.findFirst({
          where: { id: relation.expenseId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    relation.companyId
      ? prisma.company.findFirst({
          where: { id: relation.companyId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
    relation.paymentId
      ? prisma.payment.findFirst({
          where: { id: relation.paymentId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (relation.invoiceId && !invoice) {
    return "Geçerli bir fatura seçin.";
  }

  if (relation.expenseId && !expense) {
    return "Geçerli bir gider seçin.";
  }

  if (relation.companyId && !company) {
    return "Geçerli bir cari seçin.";
  }

  if (relation.paymentId && !payment) {
    return "Geçerli bir tahsilat / ödeme hareketi seçin.";
  }

  return null;
}

export async function uploadFileAction(
  _previousState: FileUploadFormState,
  formData: FormData,
): Promise<FileUploadFormState> {
  const errors: FileUploadFormState["errors"] = {};
  const fileValue = formData.get("file");
  const relatedType = getRelatedType(readText(formData, "relatedType"));

  if (!relatedType) {
    errors.relatedType = "İlişki tipi seçilmeli.";
  }

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    errors.file = "Dosya seçilmeden kaydedilemez.";
  }

  if (fileValue instanceof File && fileValue.size > maxUploadSize) {
    errors.file = "Dosya boyutu en fazla 10 MB olabilir.";
  }

  if (
    fileValue instanceof File &&
    fileValue.size > 0 &&
    !isAllowedUploadType(fileValue.name, fileValue.type, relatedType ?? undefined)
  ) {
    errors.file =
      relatedType === "INVOICE"
        ? "Bu dosya türü desteklenmiyor. Fatura dosyaları için PDF, PNG, JPG, WebP veya HTML yükleyebilirsiniz."
        : "Bu dosya türü desteklenmiyor. PDF, PNG, JPG, WebP, DOC/DOCX veya XLS/XLSX yükleyebilirsiniz.";
  }

  if (!relatedType || !(fileValue instanceof File) || Object.keys(errors).length > 0) {
    return { errors, message: "Lütfen formdaki hataları düzeltin." };
  }

  const relation = await parseRelation(formData, relatedType);
  const relationError = await validateRelation(relation);

  if (relationError) {
    return {
      errors: { relatedId: relationError },
      message: "Lütfen formdaki hataları düzeltin.",
    };
  }

  const extension = getSafeFileExtension(fileValue.name, fileValue.type, relatedType);
  const storedFileName = `${randomUUID()}${extension}`;
  const uploadDirectory = getUploadsDir();
  const absolutePath = join(uploadDirectory, storedFileName);
  const relativePath = `storage/uploads/${storedFileName}`;

  let fileId: string;

  try {
    await mkdir(uploadDirectory, { recursive: true });
    const buffer = Buffer.from(await fileValue.arrayBuffer());
    await writeFile(absolutePath, buffer);

    const file = await prisma.fileAttachment.create({
      data: {
        originalFileName: fileValue.name,
        storedFileName,
        filePath: relativePath,
        mimeType: fileValue.type || null,
        fileSize: fileValue.size,
        relatedType,
        ...relation,
      },
      select: { id: true },
    });
    fileId = file.id;
    await createAuditLog({
      entityType: "FILE_ATTACHMENT",
      entityId: fileId,
      action: "CREATE",
      title: `Dosya yüklendi: ${fileValue.name}`,
      description: "Dosya arşivine yeni ek yüklendi.",
      after: {
        originalFileName: fileValue.name,
        mimeType: fileValue.type || null,
        fileSize: fileValue.size,
        relatedType,
        ...relation,
      },
    });
  } catch {
    return { message: "Dosya yüklenirken bir hata oluştu." };
  }

  redirect(`/files/${fileId}`);
}

export async function archiveFileAttachmentAction(fileId: string) {
  await requireLocalAuth(`/files/${fileId}`);

  try {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        relatedType: true,
        invoiceId: true,
        expenseId: true,
        companyId: true,
        paymentId: true,
        deletedAt: true,
        aiExtractionJobs: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!file) {
      redirect("/files?error=archive-not-found");
    }

    if (file.deletedAt) {
      redirect(`/files/${file.id}?error=archive-already`);
    }

    if (file.aiExtractionJobs.length > 0) {
      redirect(`/files/${file.id}?error=archive-active-ai`);
    }

    if (file.invoiceId || file.expenseId || file.companyId || file.paymentId) {
      redirect(`/files/${file.id}?error=archive-linked-record`);
    }

    const archivedFile = await prisma.fileAttachment.update({
      where: { id: file.id, deletedAt: null },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        relatedType: true,
        deletedAt: true,
      },
    });

    await createAuditLog({
      entityType: "FILE_ATTACHMENT",
      entityId: archivedFile.id,
      action: "SOFT_DELETE",
      title: `Dosya arşivlendi: ${archivedFile.originalFileName}`,
      description:
        "Dosya kaydı arşivlendi. Fiziksel dosya ve iş kayıtları değiştirilmedi.",
      before: {
        id: file.id,
        originalFileName: file.originalFileName,
        storedFileName: file.storedFileName,
        filePath: file.filePath,
        relatedType: file.relatedType,
      },
      after: archivedFile,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(`/files/${fileId}?error=archive`);
  }

  revalidatePath("/files");
  revalidatePath("/trash");
  redirect("/files?archived=1");
}

export async function restoreFileAttachmentAction(fileId: string) {
  await requireLocalAuth("/trash?type=files");

  try {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        relatedType: true,
        deletedAt: true,
      },
    });

    if (!file) {
      redirect("/trash?type=files&error=restore-not-found");
    }

    if (!file.deletedAt) {
      redirect("/trash?type=files&error=restore-active");
    }

    const restoredFile = await prisma.fileAttachment.update({
      where: { id: file.id },
      data: { deletedAt: null },
      select: {
        id: true,
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        relatedType: true,
      },
    });

    await createAuditLog({
      entityType: "FILE_ATTACHMENT",
      entityId: restoredFile.id,
      action: "RESTORE",
      title: `Dosya geri yÃ¼klendi: ${restoredFile.originalFileName}`,
      description:
        "Dosya kaydı arşivden geri yüklendi. Fiziksel dosya taşınmadı veya yeniden oluşturulmadı.",
      before: file,
      after: restoredFile,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect("/trash?type=files&error=restore");
  }

  revalidatePath("/files");
  revalidatePath("/trash");
  redirect("/trash?type=files&restored=1");
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
