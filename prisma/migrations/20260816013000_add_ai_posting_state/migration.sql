-- Track reviewed AI drafts posted into real invoices and enforce one invoice per draft.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiExtractionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileAttachmentId" TEXT NOT NULL,
    "postedInvoiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawExtractedText" TEXT,
    "extractedJson" TEXT,
    "confidence" REAL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AiExtractionJob_fileAttachmentId_fkey" FOREIGN KEY ("fileAttachmentId") REFERENCES "FileAttachment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiExtractionJob_postedInvoiceId_fkey" FOREIGN KEY ("postedInvoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AiExtractionJob" ("confidence", "createdAt", "deletedAt", "errorMessage", "extractedJson", "fileAttachmentId", "id", "rawExtractedText", "status", "updatedAt")
SELECT "confidence", "createdAt", "deletedAt", "errorMessage", "extractedJson", "fileAttachmentId", "id", "rawExtractedText", "status", "updatedAt" FROM "AiExtractionJob";
DROP TABLE "AiExtractionJob";
ALTER TABLE "new_AiExtractionJob" RENAME TO "AiExtractionJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE UNIQUE INDEX "AiExtractionJob_postedInvoiceId_key" ON "AiExtractionJob"("postedInvoiceId");
CREATE INDEX "AiExtractionJob_fileAttachmentId_idx" ON "AiExtractionJob"("fileAttachmentId");
CREATE INDEX "AiExtractionJob_postedInvoiceId_idx" ON "AiExtractionJob"("postedInvoiceId");
CREATE INDEX "AiExtractionJob_status_idx" ON "AiExtractionJob"("status");
CREATE INDEX "AiExtractionJob_deletedAt_idx" ON "AiExtractionJob"("deletedAt");
