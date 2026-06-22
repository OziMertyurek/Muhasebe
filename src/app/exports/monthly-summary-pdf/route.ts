import { formatMonthForFileName, parseExportMonth } from "@/lib/export-utils";
import { expenseStatusLabels } from "@/lib/expense-utils";
import { invoiceTypeLabels } from "@/lib/invoice-utils";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/payment-utils";
import { getMonthlySummaryReport } from "@/lib/report-utils";
import {
  createPdfDocument,
  createPdfResponse,
  drawKeyValueList,
  drawSectionTitle,
  drawTable,
  formatPdfDate,
  formatPdfMoney,
  moneyItemsToText,
} from "@/lib/pdf-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseExportMonth(searchParams.get("month"));
  const report = await getMonthlySummaryReport(String(parsed.month), String(parsed.year));
  const monthText = formatMonthForFileName(report.range.year, report.range.month);
  const buffer = await createPdfDocument(
    `Aylık Özet - ${monthText}`,
    "Seçili ay için fatura, ödeme, tahsilat ve gider özetleri.",
    (doc) => {
      drawSectionTitle(doc, "Para birimi bazlı özet");
      drawKeyValueList(doc, [
        { label: "Satış faturaları toplamı", value: moneyItemsToText(report.totals.salesInvoices) },
        { label: "Alış faturaları toplamı", value: moneyItemsToText(report.totals.purchaseInvoices) },
        { label: "Tahsilat toplamı", value: moneyItemsToText(report.totals.collections) },
        { label: "Ödeme toplamı", value: moneyItemsToText(report.totals.payments) },
        { label: "Giderler toplamı", value: moneyItemsToText(report.totals.expenses) },
        { label: "Ödenmiş giderler toplamı", value: moneyItemsToText(report.totals.paidExpenses) },
        { label: "Net durum", value: moneyItemsToText(report.totals.net, true) },
      ]);

      drawSectionTitle(doc, "Son satış faturaları");
      drawTable(
        doc,
        [
          { header: "Fatura no", width: 90, value: (row) => row.invoiceNumber },
          { header: "Cari", width: 150, value: (row) => row.company.name },
          { header: "Tarih", width: 80, value: (row) => formatPdfDate(row.invoiceDate) },
          {
            header: "Toplam",
            width: 110,
            value: (row) => formatPdfMoney(row.totalAmount, row.currency),
            align: "right",
          },
          { header: "Tip", width: 90, value: (row) => invoiceTypeLabels[row.type] },
        ],
        report.lists.salesInvoices,
      );

      drawSectionTitle(doc, "Son alış faturaları");
      drawTable(
        doc,
        [
          { header: "Fatura no", width: 90, value: (row) => row.invoiceNumber },
          { header: "Cari", width: 150, value: (row) => row.company.name },
          { header: "Tarih", width: 80, value: (row) => formatPdfDate(row.invoiceDate) },
          {
            header: "Toplam",
            width: 110,
            value: (row) => formatPdfMoney(row.totalAmount, row.currency),
            align: "right",
          },
          { header: "Tip", width: 90, value: (row) => invoiceTypeLabels[row.type] },
        ],
        report.lists.purchaseInvoices,
      );

      drawSectionTitle(doc, "Son tahsilat / ödeme hareketleri");
      drawTable(
        doc,
        [
          { header: "Tarih", width: 70, value: (row) => formatPdfDate(row.paymentDate) },
          { header: "Tip", width: 80, value: (row) => paymentTypeLabels[row.type] },
          {
            header: "Cari / Fatura",
            width: 150,
            value: (row) => row.company?.name ?? row.invoice?.invoiceNumber ?? "Genel hareket",
          },
          {
            header: "Tutar",
            width: 110,
            value: (row) => formatPdfMoney(row.amount, row.currency),
            align: "right",
          },
          { header: "Yöntem", width: 110, value: (row) => paymentMethodLabels[row.method] },
        ],
        report.lists.payments,
      );

      drawSectionTitle(doc, "Son giderler");
      drawTable(
        doc,
        [
          { header: "Tarih", width: 70, value: (row) => formatPdfDate(row.expenseDate) },
          { header: "Başlık", width: 140, value: (row) => row.title },
          { header: "Kategori", width: 100, value: (row) => row.category?.name ?? "-" },
          {
            header: "Tutar",
            width: 100,
            value: (row) => formatPdfMoney(row.amount, row.currency),
            align: "right",
          },
          { header: "Durum", width: 110, value: (row) => expenseStatusLabels[row.status] },
        ],
        report.lists.expenses,
      );
    },
  );

  return createPdfResponse(buffer, `aylik-ozet-${monthText}.pdf`);
}
