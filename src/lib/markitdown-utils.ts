import type { FileAttachment } from "@prisma/client";

type MarkItDownFile = Pick<
  FileAttachment,
  "filePath" | "mimeType" | "originalFileName" | "relatedType"
>;

export type MarkItDownResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const supportedMimeByExtension = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".html", "text/html"],
  [".htm", "text/html"],
]);

const blockedExtensions = new Set([
  ".js",
  ".exe",
  ".bat",
  ".cmd",
  ".ps1",
  ".sh",
  ".php",
  ".svg",
  ".env",
  ".db",
  ".zip",
]);

export function isMarkItDownSupportedFile(file: MarkItDownFile) {
  if (file.relatedType !== "INVOICE" && file.relatedType !== "OTHER") {
    return false;
  }

  const extension = getFileExtension(file.originalFileName);

  if (!extension || blockedExtensions.has(extension) || !file.mimeType) {
    return false;
  }

  return supportedMimeByExtension.get(extension) === file.mimeType;
}

export async function extractMarkdownFromFileAttachment(
  file: MarkItDownFile,
): Promise<MarkItDownResult> {
  if (!isMarkItDownSupportedFile(file)) {
    return {
      ok: false,
      error:
        "Bu dosya türü MarkItDown ile metin çıkarma için desteklenmiyor. PDF, PNG, JPG, WebP veya HTML fatura dosyası kullanın.",
    };
  }

  const resolvedFilePath = resolveUploadPath(file.filePath);

  if (!resolvedFilePath) {
    return {
      ok: false,
      error: "Dosya yolu güvenli değil veya upload klasörü dışında görünüyor.",
    };
  }

  const scriptPath = "python-worker/extract_markdown.py";

  try {
    const { access } = await import("node:fs/promises");
    await Promise.all([access(resolvedFilePath), access(scriptPath)]);
  } catch {
    return {
      ok: false,
      error: "Dosya veya MarkItDown worker scripti bulunamadı.",
    };
  }

  return runMarkItDownWorker(scriptPath, resolvedFilePath);
}

function resolveUploadPath(filePath: string) {
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  const uploadPrefix = "storage/uploads/";

  if (!normalizedFilePath.startsWith(uploadPrefix)) {
    return null;
  }

  const uploadRelativePath = normalizedFilePath.slice(uploadPrefix.length);
  const pathParts = uploadRelativePath.split("/").filter(Boolean);

  if (
    pathParts.length === 0 ||
    pathParts.some((part) => part === "." || part === ".." || part.includes(":"))
  ) {
    return null;
  }

  return `storage/uploads/${pathParts.join("/")}`;
}

function getFileExtension(fileName: string) {
  const lowerName = fileName.toLowerCase();
  const dotIndex = lowerName.lastIndexOf(".");

  return dotIndex === -1 ? "" : lowerName.slice(dotIndex);
}

async function runMarkItDownWorker(
  scriptPath: string,
  filePath: string,
): Promise<MarkItDownResult> {
  const { execFile } = await import("node:child_process");
  const pythonCommand = process.env.MARKITDOWN_PYTHON || "python";

  return new Promise((resolve) => {
    execFile(
      pythonCommand,
      [scriptPath, filePath],
      {
        shell: false,
        timeout: 60_000,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr.trim() || error.message;
          const timeoutMessage = error.killed
            ? "MarkItDown işlemi zaman aşımına uğradı."
            : "MarkItDown çalıştırılamadı. Python ve markitdown paketinin kurulu olduğundan emin olun.";

          resolve({
            ok: false,
            error: message ? `${timeoutMessage} Detay: ${message}` : timeoutMessage,
          });
          return;
        }

        const text = stdout.trim();

        if (!text) {
          resolve({
            ok: false,
            error: "MarkItDown çalıştı ancak dosyadan okunabilir metin çıkarılamadı.",
          });
          return;
        }

        resolve({ ok: true, text });
      },
    );
  });
}
