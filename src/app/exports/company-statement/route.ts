import {
  getCompanyStatement,
  getStatementDateToExclusive,
  getStatementType,
  parseStatementDateFilter,
} from "@/lib/company-statement-utils";
import {
  createCsv,
  createCsvResponse,
  formatCsvDate,
  formatCsvNumber,
  formatTodayForFileName,
  slugifyFileNamePart,
} from "@/lib/export-utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId")?.trim();

  if (!companyId) {
    return new Response("companyId gerekli", { status: 400 });
  }

  const statement = await getCompanyStatement(companyId, {
    dateFrom: parseStatementDateFilter(searchParams.get("dateFrom") ?? undefined),
    dateToExclusive: getStatementDateToExclusive(searchParams.get("dateTo") ?? undefined),
    type: getStatementType(searchParams.get("type") ?? undefined),
    currency: searchParams.get("currency")?.trim() || undefined,
  });

  if (!statement.company) {
    return new Response("Cari bulunamadı", { status: 404 });
  }

  const csv = createCsv(
    [
      "Tarih",
      "İşlem tipi",
      "Belge / Referans",
      "Açıklama",
      "Borç",
      "Alacak",
      "Bakiye",
      "Para birimi",
    ],
    statement.movements.map((movement) => [
      formatCsvDate(movement.date),
      movement.label,
      movement.reference,
      movement.description,
      formatCsvNumber(movement.debit),
      formatCsvNumber(movement.credit),
      formatCsvNumber(movement.balance),
      movement.currency,
    ]),
  );
  const companySlug = slugifyFileNamePart(statement.company.name) || "cari";

  return createCsvResponse(
    csv,
    `cari-ekstre-${companySlug}-${formatTodayForFileName()}.csv`,
  );
}
