import { formatTodayForFileName } from "@/lib/export-utils";
import { invoiceStatusLabels, invoiceTypeLabels } from "@/lib/invoice-utils";
import {
  createPdfDocument,
  createPdfResponse,
  drawSectionTitle,
  drawTable,
  formatPdfDate,
  formatPdfMoney,
} from "@/lib/pdf-utils";
import { getDueInvoicesReport } from "@/lib/report-utils";
import { requireRequestLocalAuth } from "@/lib/security-utils";

function dayLabel(dayDiff: number) {
  if (dayDiff < 0) {
    return `${Math.abs(dayDiff)} gün gecikti`;
  }

  if (dayDiff === 0) {
    return "Bugün";
  }

  return `${dayDiff} gün kaldı`;
}

export async function GET(request: Request) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const report = await getDueInvoicesReport({
    view: searchParams.get("view") ?? undefined,
    invoiceType: searchParams.get("invoiceType") ?? undefined,
    currency: searchParams.get("currency") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  const buffer = await createPdfDocument(
    "Vadesi Gelen Faturalar",
    "Ödenmemiş veya kısmi ödenmiş, vadesi geçmiş ya da yaklaşan faturalar.",
    (doc) => {
      drawSectionTitle(doc, "Faturalar");
      drawTable(
        doc,
        [
          { header: "Vade", width: 58, value: (row) => formatPdfDate(row.dueDate) },
          { header: "Fatura no", width: 74, value: (row) => row.invoiceNumber },
          { header: "Cari", width: 110, value: (row) => row.companyName },
          { header: "Tip", width: 82, value: (row) => invoiceTypeLabels[row.type] },
          {
            header: "Toplam",
            width: 68,
            value: (row) => formatPdfMoney(row.totalAmount, row.currency),
            align: "right",
          },
          {
            header: "Ödenen",
            width: 68,
            value: (row) => formatPdfMoney(row.paidTotal, row.currency),
            align: "right",
          },
          {
            header: "Kalan",
            width: 68,
            value: (row) => formatPdfMoney(row.remainingAmount, row.currency),
            align: "right",
          },
          { header: "PB", width: 32, value: (row) => row.currency },
          { header: "Durum", width: 58, value: (row) => invoiceStatusLabels[row.status] },
          { header: "Gün", width: 64, value: (row) => dayLabel(row.dayDiff) },
        ],
        report.rows,
      );
    },
  );

  return createPdfResponse(buffer, `vadesi-gelen-faturalar-${formatTodayForFileName()}.pdf`);
}
