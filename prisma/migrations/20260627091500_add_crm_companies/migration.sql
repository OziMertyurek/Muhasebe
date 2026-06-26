-- CreateTable
CREATE TABLE "CrmCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "country" TEXT,
    "email" TEXT,
    "website" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "sector" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "replyStatus" TEXT NOT NULL DEFAULT 'NO_CONTACT',
    "lastContactDate" DATETIME,
    "followUpDate" DATETIME,
    "notes" TEXT,
    "tagsJson" TEXT,
    "linkedCompanyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "CrmCompany_linkedCompanyId_fkey" FOREIGN KEY ("linkedCompanyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CrmCompany_companyName_idx" ON "CrmCompany"("companyName");

-- CreateIndex
CREATE INDEX "CrmCompany_email_idx" ON "CrmCompany"("email");

-- CreateIndex
CREATE INDEX "CrmCompany_country_idx" ON "CrmCompany"("country");

-- CreateIndex
CREATE INDEX "CrmCompany_status_idx" ON "CrmCompany"("status");

-- CreateIndex
CREATE INDEX "CrmCompany_replyStatus_idx" ON "CrmCompany"("replyStatus");

-- CreateIndex
CREATE INDEX "CrmCompany_followUpDate_idx" ON "CrmCompany"("followUpDate");

-- CreateIndex
CREATE INDEX "CrmCompany_linkedCompanyId_idx" ON "CrmCompany"("linkedCompanyId");

-- CreateIndex
CREATE INDEX "CrmCompany_deletedAt_idx" ON "CrmCompany"("deletedAt");
