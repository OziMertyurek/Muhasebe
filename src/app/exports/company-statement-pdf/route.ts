import { Prisma } from "@prisma/client";
import {
  getCompanyStatement,
  getStatementDateToExclusive,
  getStatementType,
  parseStatementDateFilter,
} from "@/lib/company-statement-utils";
import { formatTodayForFileName, slugifyFileNamePart } from "@/lib/export-utils";
import {
  createPdfDocument,
  createPdfResponse,
  drawKeyValueList,
  drawSectionTitle,
  drawTable,
  formatPdfDate,
  formatPdfMoney,
  formatPdfSignedMoney,
} from "@/lib/pdf-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

function buildSummary(
  movements: Array<{
    currency: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    balance: Prisma.Decimal;
  }>,
) {
  const summary = new Map<
    string,
    { debit: Prisma.Decimal; credit: Prisma.Decimal; balance: Prisma.Decimal }
  >();

  for (const movement of movements) {
    const row = summary.get(movement.currency) ?? {
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(0),
      balance: new Prisma.Decimal(0),
    };
    row.debit = row.debit.plus(movement.debit);
    row.credit = row.credit.plus(movement.credit);
    row.balance = movement.balance;
    summary.set(movement.currency, row);
  }

  return Array.from(summary.entries()).map(([currency, values]) => ({
    currency,
    ...values,
  }));
}

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

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

  const company = statement.company;
  const summary = buildSummary(statement.movements);
  const buffer = await createPdfDocument(
    `Cari Ekstre - ${company.name}`,
    "Cari hareketleri para birimi bazında ayrı bakiye ile hazırlanmıştır.",
    (doc) => {
      drawSectionTitle(doc, "Firma bilgileri");
      drawKeyValueList(doc, [
        { label: "Cari adı", value: company.name },
        { label: "Ekstre tarihi", value: formatPdfDate(new Date()) },
        { label: "Varsayılan para birimi", value: company.defaultCurrency },
      ]);

      drawSectionTitle(doc, "Para birimi özeti");
      drawTable(
        doc,
        [
          { header: "Para birimi", width: 90, value: (row) => row.currency },
          {
            header: "Toplam borç",
            width: 130,
            value: (row) => formatPdfMoney(row.debit, row.currency),
            align: "right",
          },
          {
            header: "Toplam alacak",
            width: 130,
            value: (row) => formatPdfMoney(row.credit, row.currency),
            align: "right",
          },
          {
            header: "Net bakiye",
            width: 130,
            value: (row) => formatPdfSignedMoney(row.balance, row.currency),
            align: "right",
          },
        ],
        summary,
      );

      drawSectionTitle(doc, "Hareketler");
      drawTable(
        doc,
        [
          { header: "Tarih", width: 48, value: (row) => formatPdfDate(row.date) },
          { header: "İşlem tipi", width: 72, value: (row) => row.label },
          { header: "Referans", width: 70, value: (row) => row.reference },
          { header: "Açıklama", width: 105, value: (row) => row.description },
          {
            header: "Borç",
            width: 58,
            value: (row) => (row.debit.equals(0) ? "-" : formatPdfMoney(row.debit, row.currency)),
            align: "right",
          },
          {
            header: "Alacak",
            width: 58,
            value: (row) =>
              row.credit.equals(0) ? "-" : formatPdfMoney(row.credit, row.currency),
            align: "right",
          },
          {
            header: "Bakiye",
            width: 64,
            value: (row) => formatPdfSignedMoney(row.balance, row.currency),
            align: "right",
          },
          { header: "PB", width: 38, value: (row) => row.currency },
        ],
        statement.movements,
      );
    },
  );
  const companySlug = slugifyFileNamePart(company.name) || "cari";

  return createPdfResponse(
    buffer,
    `cari-ekstre-${companySlug}-${formatTodayForFileName()}.pdf`,
  );
}
