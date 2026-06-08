import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { formatCsvDate, formatCsvNumber, formatTodayForFileName, createCsv, createCsvResponse } from "@/lib/export-utils";
import { invoiceStatusLabels, invoiceTypeLabels } from "@/lib/invoice-utils";
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
  const csv = createCsv(
    [
      "Fatura no",
      "Cari firma",
      "Fatura tipi",
      "Fatura tarihi",
      "Vade tarihi",
      "Ara toplam",
      "KDV",
      "İskonto",
      "Genel toplam",
      "Para birimi",
      "Durum",
      "Notlar",
    ],
    invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.company.name,
      invoiceTypeLabels[invoice.type],
      formatCsvDate(invoice.invoiceDate),
      formatCsvDate(invoice.dueDate),
      formatCsvNumber(invoice.subtotal),
      formatCsvNumber(invoice.vatAmount),
      formatCsvNumber(invoice.discountAmount),
      formatCsvNumber(invoice.totalAmount),
      invoice.currency,
      invoiceStatusLabels[invoice.status],
      invoice.notes,
    ]),
  );

  return createCsvResponse(csv, `faturalar-${formatTodayForFileName()}.csv`);
}
