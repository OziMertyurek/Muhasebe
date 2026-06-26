-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'TRY',
    "buyRate" DECIMAL,
    "sellRate" DECIMAL,
    "effectiveDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT
);

-- CreateIndex
CREATE INDEX "ExchangeRate_currency_effectiveDate_idx" ON "ExchangeRate"("currency", "effectiveDate");

-- CreateIndex
CREATE INDEX "ExchangeRate_source_fetchedAt_idx" ON "ExchangeRate"("source", "fetchedAt");
