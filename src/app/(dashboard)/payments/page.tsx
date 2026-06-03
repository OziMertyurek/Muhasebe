import Link from "next/link";
import { PaymentMethod, PaymentType } from "@prisma/client";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deletePaymentAction } from "@/app/(dashboard)/payments/actions";
import { formatDate, formatPlainValue } from "@/lib/company-utils";
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
        <Link
          href="/payments/new"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
        >
          <Plus className="h-4 w-4" />
          Yeni Hareket
        </Link>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Firma, fatura no veya açıklama ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
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
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
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
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          />
          <input
            name="dateTo"
            type="date"
            defaultValue={params?.dateTo ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          />
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {payments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-[#223028]">
              Henüz tahsilat veya ödeme eklenmedi
            </p>
            <p className="mt-2 text-sm text-[#647067]">
              İlk para hareketinizi Yeni Hareket butonuyla ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
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
                  <tr key={payment.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {paymentTypeLabels[payment.type]}
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/payments/${payment.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deletePaymentAction.bind(null, payment.id)}>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] text-[#8b2f28] transition hover:border-[#c79a92]"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
