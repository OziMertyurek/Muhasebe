import {
  buildCrmCompanyWhere,
  crmCompanyStatusLabels,
  crmReplyStatusLabels,
  formatCrmDate,
  formatCrmTags,
  getCrmCompanyStatus,
  getCrmReplyStatus,
  parseCrmDate,
} from "@/lib/crm-company-utils";
import {
  createCsv,
  createCsvResponse,
  formatCsvDateTime,
  formatTodayForFileName,
} from "@/lib/export-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const where = buildCrmCompanyWhere({
    q: searchParams.get("q")?.trim() ?? "",
    country: searchParams.get("country")?.trim() ?? "",
    source: searchParams.get("source")?.trim() ?? "",
    status: getCrmCompanyStatus(searchParams.get("status")),
    replyStatus: getCrmReplyStatus(searchParams.get("replyStatus")),
    followUpFrom: parseCrmDate(searchParams.get("followUpFrom")),
    followUpTo: parseCrmDate(searchParams.get("followUpTo")),
  });
  const crmCompanies = await prisma.crmCompany.findMany({
    where,
    orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }],
  });
  const csv = createCsv(
    [
      "Firma Adı",
      "Ülke",
      "E-posta",
      "Web Sitesi",
      "Yetkili Kişi",
      "Telefon",
      "Sektör",
      "Kaynak",
      "Durum",
      "Cevap Durumu",
      "Son İletişim Tarihi",
      "Takip Tarihi",
      "Etiketler",
      "Notlar",
      "Oluşturma Tarihi",
    ],
    crmCompanies.map((company) => [
      company.companyName,
      company.country,
      company.email,
      company.website,
      company.contactPerson,
      company.phone,
      company.sector,
      company.source,
      crmCompanyStatusLabels[company.status],
      crmReplyStatusLabels[company.replyStatus],
      formatCrmDate(company.lastContactDate),
      formatCrmDate(company.followUpDate),
      formatCrmTags(company.tagsJson),
      company.notes,
      formatCsvDateTime(company.createdAt),
    ]),
  );

  return createCsvResponse(csv, `firma-takip-${formatTodayForFileName()}.csv`);
}
