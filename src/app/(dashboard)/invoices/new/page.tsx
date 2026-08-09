import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { createInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage() {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href="/invoices"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Faturalara dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Yeni fatura</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Fatura ekle
          </h1>
        </div>
      </section>

      {companies.length === 0 ? (
        <div className="rounded-lg border border-[#dce2dc] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#223028]">Önce cari eklemelisiniz</p>
          <p className="mt-2 text-sm text-[#647067]">
            Fatura kaydı oluşturmak için en az bir müşteri veya tedarikçi cari kaydı gerekir.
          </p>
          <Link
            href="/companies/new"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <Plus className="h-4 w-4" />
            Yeni Cari Ekle
          </Link>
        </div>
      ) : (
        <InvoiceForm
          action={createInvoiceAction}
          companies={companies}
          lineItemsEnabled
          submitLabel="Faturayı kaydet"
        />
      )}
    </div>
  );
}
