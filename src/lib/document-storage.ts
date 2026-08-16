import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import type { FileRelatedType } from "#prisma/client";
import {
  getSafeFileExtension,
  isAllowedUploadType,
  maxUploadSize,
} from "./file-utils.ts";
import { getUploadsDir } from "./app-paths.ts";

export type StoredDocument = {
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  mimeType: string | null;
  fileSize: number;
};

export class DocumentStorageError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DocumentStorageError";
    this.code = code;
  }
}

const storagePrefix = "storage/uploads/";

export function getDocumentUploadRoot() {
  return process.env.DOCUMENT_UPLOAD_DIR || getUploadsDir();
}

export function getStoredDocumentReference(storedFileName: string) {
  return `${storagePrefix}${storedFileName}`;
}

export async function saveUploadedDocument(input: {
  file: File;
  relatedType: FileRelatedType;
}): Promise<StoredDocument> {
  validateUpload(input.file, input.relatedType);

  const extension = getSafeFileExtension(input.file.name, input.file.type, input.relatedType);
  const storedFileName = `${randomUUID()}${extension}`;
  const root = getDocumentUploadRoot();
  const absolutePath = resolve(root, storedFileName);
  assertWithinRoot(root, absolutePath);

  await mkdir(root, { recursive: true });
  await writeFile(absolutePath, Buffer.from(await input.file.arrayBuffer()));

  return {
    originalFileName: sanitizeOriginalFileName(input.file.name),
    storedFileName,
    filePath: getStoredDocumentReference(storedFileName),
    mimeType: input.file.type || null,
    fileSize: input.file.size,
  };
}

export function resolveStoredDocumentPath(filePath: string) {
  const normalizedFilePath = filePath.replace(/\\/g, "/");

  if (!normalizedFilePath.startsWith(storagePrefix)) {
    throw new DocumentStorageError("storage-reference", "Dosya referansi gecersiz.");
  }

  const uploadRelativePath = normalizedFilePath.slice(storagePrefix.length);
  const parts = uploadRelativePath.split("/").filter(Boolean);

  if (
    parts.length === 0 ||
    parts.some((part) => part === "." || part === ".." || part.includes(":"))
  ) {
    throw new DocumentStorageError("path-traversal", "Dosya yolu guvenli degil.");
  }

  const absolutePath = resolve(getDocumentUploadRoot(), ...parts);
  assertWithinRoot(getDocumentUploadRoot(), absolutePath);
  return absolutePath;
}

export async function storedDocumentExists(filePath: string) {
  try {
    await access(resolveStoredDocumentPath(filePath));
    return true;
  } catch {
    return false;
  }
}

export async function readStoredDocument(filePath: string) {
  return readFile(resolveStoredDocumentPath(filePath));
}

export function getSafeDocumentAccessReference(filePath: string) {
  const absolutePath = resolveStoredDocumentPath(filePath);
  return basename(absolutePath);
}

function validateUpload(file: File, relatedType: FileRelatedType) {
  if (file.size <= 0) {
    throw new DocumentStorageError("empty-file", "Dosya secilmeden kaydedilemez.");
  }

  if (file.size > maxUploadSize) {
    throw new DocumentStorageError("file-size", "Dosya boyutu en fazla 10 MB olabilir.");
  }

  if (!isAllowedUploadType(file.name, file.type, relatedType)) {
    throw new DocumentStorageError("file-type", "Bu dosya turu desteklenmiyor.");
  }
}

function assertWithinRoot(root: string, targetPath: string) {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(targetPath);
  const pathFromRoot = relative(resolvedRoot, resolvedTarget);

  if (
    pathFromRoot === "" ||
    pathFromRoot.startsWith(`..${sep}`) ||
    pathFromRoot === ".." ||
    resolve(pathFromRoot) === pathFromRoot
  ) {
    throw new DocumentStorageError("path-traversal", "Dosya yolu upload klasoru disinda.");
  }
}

function sanitizeOriginalFileName(fileName: string) {
  return basename(fileName).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_").slice(0, 180);
}
