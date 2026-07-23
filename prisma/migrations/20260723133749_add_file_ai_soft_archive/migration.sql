-- Add soft archive fields for file attachments and AI extraction jobs.
ALTER TABLE "FileAttachment" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "AiExtractionJob" ADD COLUMN "deletedAt" DATETIME;

CREATE INDEX "FileAttachment_deletedAt_idx" ON "FileAttachment"("deletedAt");
CREATE INDEX "AiExtractionJob_deletedAt_idx" ON "AiExtractionJob"("deletedAt");
