import Link from "next/link";
import { PaymentMethod, PaymentType } from "@prisma/client";
import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deletePaymentAction } from "@/app/(dashboard)/payments/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpHint } from "@/components/ui/help-hint";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
import { buildExportHref } from "@/lib/export-utils";
import { formatMoney } from "@/lib/invoice-utils";
import {
  paymentMethodLabels,
  paymentMethodOptions,
  paymentTypeLabels,
  paymentTypeOptions,
} from "@/lib/payment-utils";
import { prisma } from "@/lib/prisma";

type PaymentsPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    method?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

function getPaymentType(value?: string) {
  if (value && Object.values(PaymentType).includes(value as PaymentType)) {
    return value as PaymentType;
  }

  return undefined;
}

function getPaymentMethod(value?: string) {
  if (value && Object.values(PaymentMethod).includes(value as PaymentMethod)) {
    return value as PaymentMethod;
  }

  return undefined;
}

function getPaymentTypeTone(type: PaymentType) {
  return type === "COLLECTION" ? "positive" as const : "danger" as const;
}

function parseDateFilter(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const type = getPaymentType(params?.type);
  const method = getPaymentMethod(params?.method);
  const dateFrom = parseDateFilter(params?.dateFrom);
  const dateTo = parseDateFilter(params?.dateTo);
  const dateToExclusive = dateTo
    ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate() + 1)
    : undefined;
  const exportHref = buildExportHref("/exports/payments", {
    q: query,
    type,
    method,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  });

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
      company: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
      financialAccount: { select: { id: true, name: true } },
    },
    orderBy: { paymentDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Tahsilat / Ödeme</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Para hareketleri
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Faturaya bağlı ya da genel cari para hareketlerini takip edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            CSV Dışa Aktar
          </a>
          <Link
            href="/payments/new"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <Plus className="h-4 w-4" />
            Yeni Hareket
          </Link>
        </div>
      </section>

      <HelpHint
        title="Tahsilat ve odeme icin ipucu"
        items={[
          "Cari hareketlerinize tahsilat veya odeme kaydi ekleyin.",
          "Dogru cari ve tutar sectiginizden emin olun.",
          "Ilgili faturayi secmek durumu daha net takip ettirir.",
        ]}
        href="/help#tahsilat-odeme"
      />

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm ring-1 ring-black/0">
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Firma, fatura no veya açıklama ara"
              className="h-11 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
            />
          </label>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">Tüm işlem tipleri</option>
            {paymentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="method"
            defaultValue={method ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          >
            <option value="">Tüm yöntemler</option>
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            name="dateFrom"
            type="date"
            defaultValue={params?.dateFrom ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          />
          <input
            name="dateTo"
            type="date"
            defaultValue={params?.dateTo ?? ""}
            className="h-11 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d7e5dc]"
          />
          <button className="inline-flex h-11 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm ring-1 ring-black/0">
        {payments.length === 0 ? (
          <EmptyState
            title="Henüz ödeme/tahsilat hareketi yok"
            description="İlk para hareketinizi Yeni Hareket butonuyla ekleyebilirsiniz."
            actionHref="/payments/new"
            actionLabel="Yeni Hareket"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f5f7f3] text-xs font-semibold uppercase tracking-[0.08em] text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">İşlem tipi</th>
                  <th className="px-4 py-3">Cari firma</th>
                  <th className="px-4 py-3">İlgili fatura</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">Ödeme yöntemi</th>
                  <th className="px-4 py-3">Hesap</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-[#e5e9e5] transition hover:bg-[#fbfcfa]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={getPaymentTypeTone(payment.type)}>
                        {paymentTypeLabels[payment.type]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{payment.company?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {payment.invoice?.invoiceNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{payment.currency}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {paymentMethodLabels[payment.method]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {payment.financialAccount?.name ?? "-"}
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-[#46534b]">
                      {formatPlainValue(payment.description)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/payments/${payment.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6] focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/payments/${payment.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[#223028] transition hover:border-[#aebdae] hover:bg-[#f7f9f6] focus:outline-none focus:ring-2 focus:ring-[#d7e5dc]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deletePaymentAction.bind(null, payment.id)}>
                          <ConfirmSubmitButton
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] bg-white text-[#8b2f28] transition hover:border-[#c79a92] hover:bg-[#fff7f5] focus:outline-none focus:ring-2 focus:ring-[#efd3cf]"
                            message="Bu tahsilat / ödeme hareketini silmek istediğine emin misin? Kayıt çöp kutusuna taşınacak ve bağlı fatura durumu etkilenebilir."
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
