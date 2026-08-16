import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { getInvoiceProductOptions } from "@/lib/invoice-product-options";
import { formatDateInput } from "@/lib/invoice-utils";
import { prisma } from "@/lib/prisma";

type EditInvoicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  const [invoice, companies, products] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, deletedAt: null, company: { deletedAt: null } },
      include: {
        company: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getInvoiceProductOptions(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6">
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Detaya dön
        </Link>
        <div>
          <p className="text-sm font-medium text-[#607167]">Fatura düzenle</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {invoice.invoiceNumber}
          </h1>
        </div>
      </section>

      <InvoiceForm
        action={updateInvoiceAction.bind(null, invoice.id)}
        companies={companies}
        products={products}
        submitLabel="Değişiklikleri kaydet"
        initialValues={{
          companyId: invoice.companyId,
          type: invoice.type,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: formatDateInput(invoice.invoiceDate),
          dueDate: invoice.dueDate ? formatDateInput(invoice.dueDate) : null,
          currency: invoice.currency,
          subtotal: invoice.subtotal.toString(),
          vatAmount: invoice.vatAmount.toString(),
          discountAmount: invoice.discountAmount.toString(),
          totalAmount: invoice.totalAmount.toString(),
          status: invoice.status,
          notes: invoice.notes,
        }}
        initialLineItems={
          invoice.items.length > 0
            ? invoice.items.map((item) => ({
                id: item.id,
                productId: item.productId ?? "",
                description: item.description,
                quantity: item.quantity.toString(),
                unit: item.unit,
                unitPrice: item.unitPrice.toString(),
                vatRate: item.vatRate.toString(),
                discountAmount: item.discountAmount.toString(),
              }))
            : [
                {
                  id: "legacy-total-line",
                  productId: "",
                  description: invoice.notes || invoice.invoiceNumber,
                  quantity: "1",
                  unit: "ADET",
                  unitPrice: invoice.totalAmount.toString(),
                  vatRate: "0",
                  discountAmount: "0",
                },
              ]
        }
        lineItemsEnabled
      />
    </div>
  );
}
