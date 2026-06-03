import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, FileText, Landmark, Pencil, Trash2 } from "lucide-react";
import { deletePaymentAction } from "@/app/(dashboard)/payments/actions";
import { RelatedFilesCard } from "@/components/files/related-files-card";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import { formatMoney } from "@/lib/invoice-utils";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";

type PaymentDetailPageProps = {
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

export default async function PaymentDetailPage({
  params,
  searchParams,
}: PaymentDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const payment = await prisma.payment.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
      financialAccount: { select: { id: true, name: true } },
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

  if (!payment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/payments"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Hareketlere dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Hareket detay</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {paymentTypeLabels[payment.type]}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/payments/${payment.id}/edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <form action={deletePaymentAction.bind(null, payment.id)}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e0c4bf] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#c79a92]">
              <Trash2 className="h-4 w-4" />
              Sil
            </button>
          </form>
        </div>
      </section>

      {query?.error === "delete" ? (
        <div className="rounded-md border border-[#e8c4bf] bg-[#fff7f5] px-4 py-3 text-sm font-medium text-[#8b2f28]">
          Para hareketi silinirken bir hata oluştu.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">İşlem ana bilgileri</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Tarih" value={formatDate(payment.paymentDate)} />
            <InfoItem label="İşlem tipi" value={paymentTypeLabels[payment.type]} />
            <InfoItem
              label="Tutar"
              value={formatMoney(payment.amount, payment.currency)}
            />
            <InfoItem label="Para birimi" value={payment.currency} />
            <InfoItem label="Ödeme yöntemi" value={paymentMethodLabels[payment.method]} />
            <InfoItem
              label="Finansal hesap"
              value={formatPlainValue(payment.financialAccount?.name)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Bağlantılar</h2>
          <div className="mt-5 space-y-3">
            {payment.company ? (
              <Link
                href={`/companies/${payment.company.id}`}
                className="flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#223028]">
                    {payment.company.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#647067]">Cari detayına git</span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-[#647067]">Cari firma seçilmedi.</p>
            )}

            {payment.invoice ? (
              <Link
                href={`/invoices/${payment.invoice.id}`}
                className="flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#ecf0f5] text-[#34445c]">
                  <FileText className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#223028]">
                    {payment.invoice.invoiceNumber}
                  </span>
                  <span className="mt-1 block text-sm text-[#647067]">Fatura detayına git</span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-[#647067]">İlgili fatura seçilmedi.</p>
            )}

            {payment.financialAccount ? (
              <Link
                href={`/accounts/${payment.financialAccount.id}`}
                className="flex items-center gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 transition hover:border-[#aebdae]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef5f1] text-[#1f6f54]">
                  <Landmark className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#223028]">
                    {payment.financialAccount.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#647067]">Hesap detayına git</span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-[#647067]">Finansal hesap seçilmedi.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#16201b]">Açıklama</h2>
          <p className="mt-5 text-sm leading-6 text-[#223028]">
            {formatPlainValue(payment.description)}
          </p>
        </div>
      </section>

      <RelatedFilesCard
        files={payment.files}
        addHref={`/files/new?relatedType=PAYMENT&paymentId=${payment.id}`}
      />
    </div>
  );
}
