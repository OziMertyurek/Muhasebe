import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { deriveInvoiceStatus } from "../src/lib/accounting-core.ts";
import {
  getDocumentProcessingTimeoutMs,
  getDocumentProcessorMode,
  getInvoiceStructuredExtractionProvider,
  getTextExtractionProvider,
  withProviderTimeout,
} from "../src/lib/document-processing-providers.ts";
import {
  canRetryAiExtractionJob,
  isAiExtractionProcessingStale,
} from "../src/lib/document-processing-service.ts";
import {
  DocumentStorageError,
  resolveStoredDocumentPath,
  storedDocumentExists,
} from "../src/lib/document-storage.ts";
import { Prisma } from "#prisma/client";

test("provider abstraction selects local mode for local development by default", () => {
  assert.equal(getDocumentProcessorMode({ NODE_ENV: "development" } as NodeJS.ProcessEnv), "LOCAL");
});

test("provider abstraction selects hosted-safe mode for production by default", () => {
  assert.equal(getDocumentProcessorMode({ NODE_ENV: "production" } as NodeJS.ProcessEnv), "HOSTED_SAFE");
});

test("explicit local provider mode is available without changing business logic", () => {
  const provider = getTextExtractionProvider("LOCAL");

  assert.equal(provider.id, "LOCAL");
});

test("hosted-safe provider reports processor unavailable without throwing", async () => {
  const provider = getTextExtractionProvider("HOSTED_SAFE");
  const result = await provider.extractText({
    filePath: "storage/uploads/sample.pdf",
    mimeType: "application/pdf",
    originalFileName: "sample.pdf",
    relatedType: "INVOICE",
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.code, "PROVIDER_UNAVAILABLE");
});

test("disabled provider mode reports no provider configured", async () => {
  const provider = getTextExtractionProvider("DISABLED");
  const result = await provider.extractText({
    filePath: "storage/uploads/sample.pdf",
    mimeType: "application/pdf",
    originalFileName: "sample.pdf",
    relatedType: "INVOICE",
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.code, "NOT_CONFIGURED");
});

test("external invoice provider rejects malformed configured output", async () => {
  const previousKey = process.env.DOCUMENT_AI_API_KEY;
  process.env.DOCUMENT_AI_API_KEY = "test-key";

  try {
    const provider = getInvoiceStructuredExtractionProvider("EXTERNAL_AI");
    const result = await provider.extractInvoice("{bad-json");

    assert.equal(result.ok, false);
    assert.equal(result.ok ? "" : result.code, "MALFORMED_RESULT");
  } finally {
    if (previousKey === undefined) {
      delete process.env.DOCUMENT_AI_API_KEY;
    } else {
      process.env.DOCUMENT_AI_API_KEY = previousKey;
    }
  }
});

test("provider timeout returns a safe timeout result", async () => {
  const result = await withProviderTimeout(new Promise(() => undefined), 5);

  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.code, "TIMEOUT");
});

test("processing timeout env is bounded", () => {
  assert.equal(getDocumentProcessingTimeoutMs({ DOCUMENT_PROCESSING_TIMEOUT_MS: "2500" } as unknown as NodeJS.ProcessEnv), 2500);
  assert.equal(getDocumentProcessingTimeoutMs({ DOCUMENT_PROCESSING_TIMEOUT_MS: "5" } as unknown as NodeJS.ProcessEnv), 30000);
});

test("failed AI job can be retried but posted invoice job cannot", () => {
  assert.equal(canRetryAiExtractionJob({ status: "FAILED", postedInvoiceId: null }), true);
  assert.equal(canRetryAiExtractionJob({ status: "POSTED", postedInvoiceId: "invoice-1" }), false);
});

test("processing job becomes retryable when stale", () => {
  const now = new Date("2026-08-16T12:00:00Z");

  assert.equal(
    isAiExtractionProcessingStale({ status: "PROCESSING", updatedAt: new Date("2026-08-16T11:45:00Z") }, now),
    true,
  );
  assert.equal(
    isAiExtractionProcessingStale({ status: "PROCESSING", updatedAt: new Date("2026-08-16T11:59:00Z") }, now),
    false,
  );
});

test("retry guard does not allow duplicate processing for posted invoices", () => {
  const posted = { status: "POSTED" as const, postedInvoiceId: "invoice-1" };

  assert.equal(canRetryAiExtractionJob(posted), false);
});

test("storage path traversal is rejected", () => {
  assert.throws(
    () => resolveStoredDocumentPath("storage/uploads/../secret.pdf"),
    DocumentStorageError,
  );
});

test("storage path resolution is Linux-safe and root bounded", () => {
  const previousRoot = process.env.DOCUMENT_UPLOAD_DIR;
  process.env.DOCUMENT_UPLOAD_DIR = "/tmp/muhasebe-uploads";

  try {
    const resolved = resolveStoredDocumentPath("storage/uploads/invoices/sample.pdf");
    const fromRoot = relative("/tmp/muhasebe-uploads", resolved).replace(/\\/g, "/");

    assert.equal(fromRoot, "invoices/sample.pdf");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.DOCUMENT_UPLOAD_DIR;
    } else {
      process.env.DOCUMENT_UPLOAD_DIR = previousRoot;
    }
  }
});

test("uploaded document remains available after processing failure", async () => {
  const previousRoot = process.env.DOCUMENT_UPLOAD_DIR;
  const root = join(tmpdir(), `muhasebe-doc-test-${Date.now()}`);
  process.env.DOCUMENT_UPLOAD_DIR = root;
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "sample.pdf"), "sample");

  try {
    const provider = getTextExtractionProvider("HOSTED_SAFE");
    const result = await provider.extractText({
      filePath: "storage/uploads/sample.pdf",
      mimeType: "application/pdf",
      originalFileName: "sample.pdf",
      relatedType: "INVOICE",
    });

    assert.equal(result.ok, false);
    assert.equal(await storedDocumentExists("storage/uploads/sample.pdf"), true);
  } finally {
    if (previousRoot === undefined) {
      delete process.env.DOCUMENT_UPLOAD_DIR;
    } else {
      process.env.DOCUMENT_UPLOAD_DIR = previousRoot;
    }
  }
});

test("normal accounting logic works when document AI is disabled", () => {
  const status = deriveInvoiceStatus(
    { type: "SALES", currency: "TRY", totalAmount: new Prisma.Decimal(100) },
    [],
  );

  assert.equal(getDocumentProcessorMode({ DOCUMENT_PROCESSOR_MODE: "DISABLED" } as unknown as NodeJS.ProcessEnv), "DISABLED");
  assert.equal(status, "UNPAID");
});
