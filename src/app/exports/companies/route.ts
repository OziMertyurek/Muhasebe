import { CompanyType } from "@prisma/client";
import { companyTypeLabels } from "@/lib/company-utils";
import {
  createCsv,
  createCsvResponse,
  formatCsvDateTime,
  formatCsvNumber,
  formatTodayForFileName,
} from "@/lib/export-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

function getCompanyType(value?: string | null) {
  if (value && Object.values(CompanyType).includes(value as CompanyType)) {
    return value as CompanyType;
  }

  return undefined;
}

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const type = getCompanyType(searchParams.get("type"));
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(query ? { name: { contains: query } } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  const csv = createCsv(
    [
      "Firma adı",
      "Cari tipi",
      "Vergi no",
      "Vergi dairesi",
      "E-posta",
      "Telefon",
      "Ülke",
      "Şehir",
      "Varsayılan para birimi",
      "Risk limiti",
      "Vade günü",
      "Notlar",
      "Oluşturulma tarihi",
    ],
    companies.map((company) => [
      company.name,
      companyTypeLabels[company.type],
      company.taxNumber,
      company.taxOffice,
      company.email,
      company.phone,
      company.country,
      company.city,
      company.defaultCurrency,
      formatCsvNumber(company.riskLimit),
      company.paymentTermDays,
      company.notes,
      formatCsvDateTime(company.createdAt),
    ]),
  );

  return createCsvResponse(csv, `cariler-${formatTodayForFileName()}.csv`);
}
