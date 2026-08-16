import type { FileAttachment } from "#prisma/client";
import {
  normalizeExtractedInvoiceDraft,
  parseCanonicalDraftJson,
  type CanonicalExtractedInvoiceDraft,
} from "./ai-invoice-extraction-core.ts";
import { extractMarkdownFromFileAttachment } from "./markitdown-utils.ts";
import { parseInvoiceText } from "./invoice-parser.ts";

export type DocumentProcessorMode = "LOCAL" | "HOSTED_SAFE" | "EXTERNAL_AI" | "DISABLED";

export type DocumentProcessingFailureCode =
  | "PROVIDER_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "UNSUPPORTED_FILE"
  | "TIMEOUT"
  | "MALFORMED_RESULT"
  | "FAILED";

export type ProviderResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: DocumentProcessingFailureCode; message: string };

export type DocumentSource = Pick<
  FileAttachment,
  "filePath" | "mimeType" | "originalFileName" | "relatedType"
>;

export type TextExtractionProvider = {
  id: DocumentProcessorMode;
  label: string;
  extractText(source: DocumentSource): Promise<ProviderResult<string>>;
};

export type InvoiceStructuredExtractionProvider = {
  id: DocumentProcessorMode;
  label: string;
  extractInvoice(text: string): Promise<ProviderResult<CanonicalExtractedInvoiceDraft>>;
};

const processorUnavailableMessage =
  "Belge iÅŸleme servisi ÅŸu anda kullanÄ±lamÄ±yor. Belge kaydedildi; daha sonra tekrar deneyebilir veya faturayÄ± manuel oluÅŸturabilirsiniz.";

export function getDocumentProcessorMode(env: NodeJS.ProcessEnv = process.env): DocumentProcessorMode {
  const configured = env.DOCUMENT_PROCESSOR_MODE?.trim().toUpperCase();

  if (configured === "LOCAL" || configured === "HOSTED_SAFE" || configured === "EXTERNAL_AI" || configured === "DISABLED") {
    return configured;
  }

  return env.NODE_ENV === "production" ? "HOSTED_SAFE" : "LOCAL";
}

export function getDocumentProcessingTimeoutMs(env: NodeJS.ProcessEnv = process.env) {
  const rawValue = Number(env.DOCUMENT_PROCESSING_TIMEOUT_MS);
  return Number.isFinite(rawValue) && rawValue >= 1_000 && rawValue <= 120_000 ? rawValue : 30_000;
}

export function getProcessingUnavailableMessage() {
  return processorUnavailableMessage;
}

export function getTextExtractionProvider(mode = getDocumentProcessorMode()): TextExtractionProvider {
  if (mode === "LOCAL") {
    return localTextExtractionProvider;
  }

  if (mode === "EXTERNAL_AI") {
    return externalTextExtractionProvider;
  }

  return disabledTextExtractionProvider(mode);
}

export function getInvoiceStructuredExtractionProvider(
  mode = getDocumentProcessorMode(),
): InvoiceStructuredExtractionProvider {
  if (mode === "LOCAL" || mode === "HOSTED_SAFE") {
    return localInvoiceStructuredExtractionProvider;
  }

  if (mode === "EXTERNAL_AI") {
    return externalInvoiceStructuredExtractionProvider;
  }

  return disabledInvoiceStructuredExtractionProvider(mode);
}

export async function withProviderTimeout<T>(
  operation: Promise<ProviderResult<T>>,
  timeoutMs = getDocumentProcessingTimeoutMs(),
): Promise<ProviderResult<T>> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<ProviderResult<T>>((resolve) => {
        timeout = setTimeout(() => {
          resolve({
            ok: false,
            code: "TIMEOUT",
            message: "Belge iÅŸleme zaman aÅŸÄ±mÄ±na uÄŸradÄ±. LÃ¼tfen daha sonra tekrar deneyin.",
          });
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

const localTextExtractionProvider: TextExtractionProvider = {
  id: "LOCAL",
  label: "Local MarkItDown",
  async extractText(source) {
    const result = await extractMarkdownFromFileAttachment(source);

    return result.ok
      ? { ok: true, value: result.text }
      : { ok: false, code: "PROVIDER_UNAVAILABLE", message: sanitizeProviderMessage(result.error) };
  },
};

const localInvoiceStructuredExtractionProvider: InvoiceStructuredExtractionProvider = {
  id: "LOCAL",
  label: "Local parser",
  async extractInvoice(text) {
    try {
      const parsed = parseInvoiceText(text);
      return {
        ok: true,
        value: normalizeExtractedInvoiceDraft(parsed as unknown as Record<string, unknown>),
      };
    } catch {
      return {
        ok: false,
        code: "MALFORMED_RESULT",
        message: "Fatura alanlarÄ± Ã§Ä±karÄ±lamadÄ±. TaslaÄŸÄ± manuel kontrol edin.",
      };
    }
  },
};

const externalTextExtractionProvider: TextExtractionProvider = {
  id: "EXTERNAL_AI",
  label: "External AI document processor",
  async extractText() {
    return notConfigured();
  },
};

const externalInvoiceStructuredExtractionProvider: InvoiceStructuredExtractionProvider = {
  id: "EXTERNAL_AI",
  label: "External AI invoice parser",
  async extractInvoice(text) {
    const apiKeyConfigured = Boolean(process.env.DOCUMENT_AI_API_KEY);

    if (!apiKeyConfigured) {
      return notConfigured();
    }

    try {
      return { ok: true, value: parseCanonicalDraftJson(text) };
    } catch {
      return {
        ok: false,
        code: "MALFORMED_RESULT",
        message: "Harici saÄŸlayÄ±cÄ± geÃ§erli fatura taslaÄŸÄ± dÃ¶ndÃ¼rmedi.",
      };
    }
  },
};

function disabledTextExtractionProvider(mode: DocumentProcessorMode): TextExtractionProvider {
  return {
    id: mode,
    label: "Hosted safe document processor",
    async extractText() {
      return {
        ok: false,
        code: mode === "DISABLED" ? "NOT_CONFIGURED" : "PROVIDER_UNAVAILABLE",
        message: processorUnavailableMessage,
      };
    },
  };
}

function disabledInvoiceStructuredExtractionProvider(mode: DocumentProcessorMode): InvoiceStructuredExtractionProvider {
  return {
    id: mode,
    label: "Hosted safe invoice parser",
    async extractInvoice() {
      return {
        ok: false,
        code: mode === "DISABLED" ? "NOT_CONFIGURED" : "PROVIDER_UNAVAILABLE",
        message: processorUnavailableMessage,
      };
    },
  };
}

function notConfigured<T>(): ProviderResult<T> {
  return {
    ok: false,
    code: "NOT_CONFIGURED",
    message: "Belge iÅŸleme saÄŸlayÄ±cÄ±sÄ± yapÄ±landÄ±rÄ±lmadÄ±. Taslak manuel kontrol gerektiriyor.",
  };
}

function sanitizeProviderMessage(message: string) {
  return message
    .replace(/[A-Za-z]:\\[^\r\n]+/g, "[path]")
    .replace(/file:[^\s]+/g, "file:[path]")
    .slice(0, 500);
}
