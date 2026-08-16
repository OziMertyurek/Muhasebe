-- Store only user-confirmed AI extraction mappings for safe reuse.
CREATE TABLE "AiConfirmedMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceValue" TEXT NOT NULL,
    "companyId" TEXT,
    "productId" TEXT,
    "supplierCompanyId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AiConfirmedMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AiConfirmedMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AiConfirmedMapping_supplierCompanyId_fkey" FOREIGN KEY ("supplierCompanyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AiConfirmedMapping_type_sourceKey_sourceValue_supplierCompanyId_key" ON "AiConfirmedMapping"("type", "sourceKey", "sourceValue", "supplierCompanyId");
CREATE INDEX "AiConfirmedMapping_type_idx" ON "AiConfirmedMapping"("type");
CREATE INDEX "AiConfirmedMapping_companyId_idx" ON "AiConfirmedMapping"("companyId");
CREATE INDEX "AiConfirmedMapping_productId_idx" ON "AiConfirmedMapping"("productId");
CREATE INDEX "AiConfirmedMapping_supplierCompanyId_idx" ON "AiConfirmedMapping"("supplierCompanyId");
CREATE INDEX "AiConfirmedMapping_deletedAt_idx" ON "AiConfirmedMapping"("deletedAt");
