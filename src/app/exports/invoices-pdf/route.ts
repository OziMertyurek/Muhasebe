import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { formatTodayForFileName } from "@/lib/export-utils";
import { invoiceStatusLabels, invoiceTypeLabels } from "@/lib/invoice-utils";
import { createPdfDocument, createPdfResponse, drawSectionTitle, drawTable, formatPdfDate, formatPdfMoney } from "@/lib/pdf-utils";
import { prisma } from "@/lib/prisma";

function getInvoiceType(value?: string | null) {
  if (value && Object.values(InvoiceType).includes(value as InvoiceType)) {
    return value as InvoiceType;
  }

  return undefined;
}

function getInvoiceStatus(value?: string | null) {
  if (value && Object.values(InvoiceStatus).includes(value as InvoiceStatus)) {
    return value as InvoiceStatus;
  }

  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const type = getInvoiceType(searchParams.get("type"));
  const status = getInvoiceStatus(searchParams.get("status"));
  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      company: { deletedAt: null },
      ...(query
        ? {
            OR: [
              { invoiceNumber: { contains: query } },
              { company: { name: { contains: query } } },
            ],
          }
        : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    include: { company: { select: { name: true } } },
    orderBy: { invoiceDate: "desc" },
  });
  const buffer = await createPdfDocument(
    "Fatura Listesi",
    "Sistemde kayıtlı aktif fatura listesi.",
    (doc) => {
      drawSectionTitle(doc, "Faturalar");
      drawTable(
        doc,
        [
          { header: "Fatura no", width: 78, value: (row) => row.invoiceNumber },
          { header: "Cari firma", width: 125, value: (row) => row.company.name },
          { header: "Tip", width: 88, value: (row) => invoiceTypeLabels[row.type] },
          { header: "Fatura", width: 58, value: (row) => formatPdfDate(row.invoiceDate) },
          { header: "Vade", width: 58, value: (row) => formatPdfDate(row.dueDate) },
          {
            header: "Toplam",
            width: 78,
            value: (row) => formatPdfMoney(row.totalAmount, row.currency),
            align: "right",
          },
          { header: "PB", width: 34, value: (row) => row.currency },
          { header: "Durum", width: 64, value: (row) => invoiceStatusLabels[row.status] },
        ],
        invoices,
      );
    },
  );

  return createPdfResponse(buffer, `faturalar-${formatTodayForFileName()}.pdf`);
}
