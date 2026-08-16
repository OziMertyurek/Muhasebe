-- Link invoice-originated stock movements to the exact invoice item.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "invoiceItemId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "movementDate" DATETIME NOT NULL,
    "referenceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StockMovement" ("createdAt", "id", "movementDate", "note", "productId", "quantity", "referenceId", "referenceType", "type")
SELECT "createdAt", "id", "movementDate", "note", "productId", "quantity", "referenceId", "referenceType", "type" FROM "StockMovement";
DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE UNIQUE INDEX "StockMovement_invoiceItemId_key" ON "StockMovement"("invoiceItemId");
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_invoiceItemId_idx" ON "StockMovement"("invoiceItemId");
CREATE INDEX "StockMovement_productId_movementDate_idx" ON "StockMovement"("productId", "movementDate");
CREATE INDEX "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");
