import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createPaymentAction } from "@/app/(dashboard)/payments/actions";
import { PaymentForm } from "@/components/payments/payment-form";
import { prisma } from "@/lib/prisma";

export default async function NewPaymentPage() {
  const [companies, invoices, financialAccounts] = await Promise.all([
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
          href="/payments"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Hareketlere dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni hareket</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Tahsilat / ödeme ekle
          </h1>
        </div>
      </section>

      <PaymentForm
        action={createPaymentAction}
        companies={companies}
        invoices={invoiceOptions}
        financialAccounts={financialAccounts}
        submitLabel="Hareketi kaydet"
      />
    </div>
  );
}
