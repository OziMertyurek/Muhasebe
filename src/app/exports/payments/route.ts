import { PaymentMethod, PaymentType } from "#prisma/client";
import {
  createCsv,
  createCsvResponse,
  formatCsvDate,
  formatCsvNumber,
  formatTodayForFileName,
  getDateToExclusive,
  parseExportDate,
} from "@/lib/export-utils";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

function getPaymentType(value?: string | null) {
  if (value && Object.values(PaymentType).includes(value as PaymentType)) {
    return value as PaymentType;
  }

  return undefined;
}

function getPaymentMethod(value?: string | null) {
  if (value && Object.values(PaymentMethod).includes(value as PaymentMethod)) {
    return value as PaymentMethod;
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
  const type = getPaymentType(searchParams.get("type"));
  const method = getPaymentMethod(searchParams.get("method"));
  const dateFrom = parseExportDate(searchParams.get("dateFrom"));
  const dateToExclusive = getDateToExclusive(searchParams.get("dateTo"));
  const payments = await prisma.payment.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { description: { contains: query } },
              { company: { name: { contains: query } } },
              { invoice: { invoiceNumber: { contains: query } } },
            ],
          }
        : {}),
      ...(type ? { type } : {}),
      ...(method ? { method } : {}),
      ...(dateFrom || dateToExclusive
        ? {
            paymentDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateToExclusive ? { lt: dateToExclusive } : {}),
            },
          }
        : {}),
    },
    include: {
      company: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
      financialAccount: { select: { name: true } },
    },
    orderBy: { paymentDate: "desc" },
  });
  const csv = createCsv(
    [
      "Tarih",
      "Ä°ÅŸlem tipi",
      "Cari firma",
      "Ä°lgili fatura",
      "Finansal hesap",
      "Tutar",
      "Para birimi",
      "Ã–deme yÃ¶ntemi",
      "AÃ§Ä±klama",
    ],
    payments.map((payment) => [
      formatCsvDate(payment.paymentDate),
      paymentTypeLabels[payment.type],
      payment.company?.name,
      payment.invoice?.invoiceNumber,
      payment.financialAccount?.name,
      formatCsvNumber(payment.amount),
      payment.currency,
      paymentMethodLabels[payment.method],
      payment.description,
    ]),
  );

  return createCsvResponse(csv, `tahsilat-odeme-${formatTodayForFileName()}.csv`);
}
