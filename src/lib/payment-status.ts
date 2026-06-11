import { InvoiceStatus, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";

export async function updateInvoicePaymentStatus(invoiceId: string | null | undefined) {
  if (!invoiceId) {
    return;
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
    },
  });

  if (!invoice || invoice.status === "CANCELLED") {
    return;
  }

  const result = await prisma.payment.aggregate({
    where: {
      invoiceId,
      deletedAt: null,
    },
    _sum: {
      amount: true,
    },
  });

  const paidTotal = result._sum.amount ?? new Prisma.Decimal(0);
  let nextStatus: InvoiceStatus = "UNPAID";

  if (paidTotal.greaterThanOrEqualTo(invoice.totalAmount)) {
    nextStatus = "PAID";
  } else if (paidTotal.greaterThan(0)) {
    nextStatus = "PARTIAL";
  }

  if (nextStatus !== invoice.status) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
      select: { id: true },
    });
    await createAuditLog({
      entityType: "INVOICE",
      entityId: invoice.id,
      action: "STATUS_CHANGE",
      title: `Fatura durumu değişti: ${invoice.invoiceNumber}`,
      description: `${invoice.status} -> ${nextStatus}`,
      before: { status: invoice.status },
      after: { status: nextStatus },
      metadata: { paidTotal, totalAmount: invoice.totalAmount },
    });
  }
}
