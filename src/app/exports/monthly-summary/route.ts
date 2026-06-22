import { Prisma } from "@prisma/client";
import {
  createCsv,
  createCsvResponse,
  formatCsvNumber,
  formatMonthForFileName,
  parseExportMonth,
} from "@/lib/export-utils";
import { getMonthlySummaryReport } from "@/lib/report-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

function toCurrencyMap(items: Array<{ currency: string; amount: Prisma.Decimal }>) {
  return new Map(items.map((item) => [item.currency, item.amount]));
}

function amountFor(map: Map<string, Prisma.Decimal>, currency: string) {
  return formatCsvNumber(map.get(currency));
}

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseExportMonth(searchParams.get("month"));
  const report = await getMonthlySummaryReport(String(parsed.month), String(parsed.year));
  const maps = {
    sales: toCurrencyMap(report.totals.salesInvoices),
    purchases: toCurrencyMap(report.totals.purchaseInvoices),
    collections: toCurrencyMap(report.totals.collections),
    payments: toCurrencyMap(report.totals.payments),
    expenses: toCurrencyMap(report.totals.expenses),
    paidExpenses: toCurrencyMap(report.totals.paidExpenses),
    net: toCurrencyMap(report.totals.net),
  };
  const currencies = Array.from(
    new Set(Object.values(maps).flatMap((map) => Array.from(map.keys()))),
  ).sort((first, second) => first.localeCompare(second));
  const csv = createCsv(
    [
      "Para birimi",
      "Satış faturaları toplamı",
      "Alış faturaları toplamı",
      "Tahsilat toplamı",
      "Ödeme toplamı",
      "Giderler toplamı",
      "Ödenmiş giderler toplamı",
      "Net durum",
    ],
    currencies.map((currency) => [
      currency,
      amountFor(maps.sales, currency),
      amountFor(maps.purchases, currency),
      amountFor(maps.collections, currency),
      amountFor(maps.payments, currency),
      amountFor(maps.expenses, currency),
      amountFor(maps.paidExpenses, currency),
      amountFor(maps.net, currency),
    ]),
  );
  const fileMonth = formatMonthForFileName(report.range.year, report.range.month);

  return createCsvResponse(csv, `aylik-ozet-${fileMonth}.csv`);
}
