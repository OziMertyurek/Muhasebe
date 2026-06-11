import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ArrowLeft, Building2, Pencil, Trash2 } from "lucide-react";
import { deleteInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { RelatedFilesCard } from "@/components/files/related-files-card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import { formatMoney, invoiceStatusLabels, invoiceTypeLabels } from "@/lib/invoice-utils";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#223028]">{value}</p>
    </div>
  );
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: InvoiceDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const invoice = await prisma.invoice.findFirst({
    where: { id, deletedAt: null, company: { deletedAt: null } },
    include: {
      company: true,
      payments: {
        where: { deletedAt: null },
        orderBy: { paymentDate: "desc" },
      },
      files: {
        orderBy: { uploadedAt: "desc" },
        take: 5,
        select: {
          id: true,
          originalFileName: true,
          mimeType: true,
          fileSize: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const paidTotal = invoice.payments.reduce(
    (total, payment) => total.plus(payment.amount),
    new Prisma.Decimal(0),
  );
  const remainingTotal = invoice.totalAmount.minus(paidTotal);
  const remainingDisplay = remainingTotal.lessThan(0) ? new Prisma.Decimal(0) : remainingTotal;
  const placeholders = ["Fatura kalemleri", "AI fatura okuma sonucu"];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Faturalara dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Fatura detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deleteInvoiceAction.bind(null, invoice.id)}>
            <ConfirmSubmitButton
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]"
              message="Bu faturayı silmek istediğine emin misin? Kayıt çöp kutusuna taşınacak. Bağlı ödeme durumu etkilenebilir."
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Fatura silinirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Fatura ana bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Fatura no" value={invoice.invoiceNumber} />
            <InfoItem label="Fatura tipi" value={invoiceTypeLabels[invoice.type]} />
            <InfoItem label="Fatura tarihi" value={formatDate(invoice.invoiceDate)} />
            <InfoItem
              label="Vade tarihi"
              value={invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
            />
            <InfoItem label="Ödeme durumu" value={invoiceStatusLabels[invoice.status]} />
            <InfoItem label="Para birimi" value={invoice.currency} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Cari firma</h2>
          <Link
            href={`/companies/${invoice.company.id}`}
            className="mt-5 flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
              <Building2 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#223028]">
                {invoice.company.name}
              </span>
              <span className="mt-1 block text-sm text-[#647067]">Cari detayına git</span>
            </span>
          </Link>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Tutar bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Ara toplam" value={formatMoney(invoice.subtotal, invoice.currency)} />
            <InfoItem label="KDV tutarı" value={formatMoney(invoice.vatAmount, invoice.currency)} />
            <InfoItem
              label="İskonto tutarı"
              value={formatMoney(invoice.discountAmount, invoice.currency)}
            />
            <InfoItem
              label="Genel toplam"
              value={formatMoney(invoice.totalAmount, invoice.currency)}
            />
            <InfoItem
              label="Ödenen / tahsil edilen"
              value={formatMoney(paidTotal, invoice.currency)}
            />
            <InfoItem label="Kalan tutar" value={formatMoney(remainingDisplay, invoice.currency)} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Notlar</h2>
          <p className="mt-5 text-sm leading-6 text-[#223028]">
            {formatPlainValue(invoice.notes)}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">
              Tahsilat / ödeme hareketleri
            </h2>
            <p className="mt-1 text-sm text-[#647067]">
              Bu faturaya bağlanan aktif para hareketleri.
            </p>
          </div>
          <Link
            href="/payments/new"
            className="inline-flex h-10 w-fit items-center rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            Hareket ekle
          </Link>
        </div>

        {invoice.payments.length === 0 ? (
          <p className="mt-5 rounded-md border border-dashed border-[#cfd8cf] p-4 text-sm text-[#647067]">
            Bu faturaya bağlı tahsilat veya ödeme hareketi yok.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">İşlem tipi</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Yöntem</th>
                  <th className="px-4 py-3">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {paymentTypeLabels[payment.type]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {paymentMethodLabels[payment.method]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatPlainValue(payment.description)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RelatedFilesCard
        files={invoice.files}
        addHref={`/files/new?relatedType=INVOICE&invoiceId=${invoice.id}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {placeholders.map((title) => (
          <div key={title} className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-5">
            <h3 className="text-sm font-semibold text-[#223028]">{title}</h3>
            <p className="mt-2 text-sm text-[#647067]">Bu alan sonraki aşamada bağlanacak.</p>
          </div>
        ))}
      </section>
    </div>
  );
}
