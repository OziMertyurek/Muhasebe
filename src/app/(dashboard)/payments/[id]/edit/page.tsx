import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updatePaymentAction } from "@/app/(dashboard)/payments/actions";
import { PaymentForm } from "@/components/payments/payment-form";
import { formatDateInput } from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";

type EditPaymentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPaymentPage({ params }: EditPaymentPageProps) {
  const { id } = await params;
  const [payment, companies, invoices, financialAccounts] = await Promise.all([
    prisma.payment.findFirst({
      where: { id, deletedAt: null },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, company: { deletedAt: null } },
      orderBy: { invoiceDate: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        companyId: true,
        type: true,
        company: { select: { name: true } },
      },
    }),
    prisma.financialAccount.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!payment) {
    notFound();
  }

  const invoiceOptions = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    companyId: invoice.companyId,
    companyName: invoice.company.name,
    type: invoice.type,
  }));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/payments/${payment.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Hareket düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Para hareketi
          </h1>
        </div>
      </section>

      <PaymentForm
        action={updatePaymentAction.bind(null, payment.id)}
        companies={companies}
        invoices={invoiceOptions}
        financialAccounts={financialAccounts}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          type: payment.type,
          companyId: payment.companyId,
          invoiceId: payment.invoiceId,
          financialAccountId: payment.financialAccountId,
          amount: payment.amount.toString(),
          currency: payment.currency,
          paymentDate: formatDateInput(payment.paymentDate),
          method: payment.method,
          description: payment.description,
        }}
      />
    </div>
  );
}
