import { InvoiceStatus, Prisma } from "#prisma/client";
import { createAuditLog } from "@/lib/audit-log-utils";
import { syncInvoiceDueReminder } from "@/lib/auto-reminder-utils";
import { deriveInvoiceStatus, getInvoicePaidTotal } from "@/lib/accounting-core";
import { prisma } from "@/lib/prisma";

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export async function updateInvoicePaymentStatus(
  invoiceId: string | null | undefined,
  client: PrismaClientLike = prisma,
) {
  if (!invoiceId) {
    return;
  }

  const invoice = await client.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
      type: true,
      currency: true,
      dueDate: true,
      companyId: true,
      deletedAt: true,
    },
  });

  if (!invoice || invoice.status === "CANCELLED") {
    return;
  }

  const payments = await client.payment.findMany({
    where: {
      invoiceId,
      deletedAt: null,
    },
    select: {
      type: true,
      amount: true,
      currency: true,
    },
  });

  const paidTotal = getInvoicePaidTotal(invoice, payments);
  const nextStatus: InvoiceStatus = deriveInvoiceStatus(invoice, payments);

  if (nextStatus !== invoice.status) {
    await client.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
      select: { id: true },
    });
    await createAuditLog(
      {
        entityType: "INVOICE",
        entityId: invoice.id,
        action: "STATUS_CHANGE",
        title: `Fatura durumu degisti: ${invoice.invoiceNumber}`,
        description: `${invoice.status} -> ${nextStatus}`,
        before: { status: invoice.status },
        after: { status: nextStatus },
        metadata: { paidTotal, totalAmount: invoice.totalAmount },
      },
      client,
    );
    await syncInvoiceDueReminder({ ...invoice, status: nextStatus });
  }
}
