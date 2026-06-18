import Link from "next/link";
import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/company-utils";
import { buildExportHref } from "@/lib/export-utils";
import {
  formatMoney,
  invoiceStatusLabels,
  invoiceStatusOptions,
  invoiceTypeLabels,
  invoiceTypeOptions,
} from "@/lib/invoice-utils";
import { prisma } from "@/lib/prisma";

type InvoicesPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    status?: string;
  }>;
};

function getInvoiceType(value?: string) {
  if (value && Object.values(InvoiceType).includes(value as InvoiceType)) {
    return value as InvoiceType;
  }

  return undefined;
}

function getInvoiceStatus(value?: string) {
  if (value && Object.values(InvoiceStatus).includes(value as InvoiceStatus)) {
    return value as InvoiceStatus;
  }

  return undefined;
}

function getInvoiceStatusTone(status: InvoiceStatus) {
  if (status === "PAID") {
    return "positive" as const;
  }

  if (status === "PARTIAL") {
    return "warning" as const;
  }

  if (status === "CANCELLED") {
    return "danger" as const;
  }

  return "neutral" as const;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const type = getInvoiceType(params?.type);
  const status = getInvoiceStatus(params?.status);
  const exportHref = buildExportHref("/exports/invoices", {
    q: query,
    type,
    status,
  });
  const pdfHref = buildExportHref("/exports/invoices-pdf", {
    q: query,
    type,
    status,
  });
  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      company: { deletedAt: null },
      ...(query
        ? {
            OR: [
              { invoiceNumber: { contains: query } },
              { company: { name: { contains: query } } },
            ],
          }
        : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
    orderBy: { invoiceDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Faturalar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Fatura kayıtları
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Kestiğiniz ve size kesilen faturaları cari firmalarla birlikte takip edin.
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
          <a
            href={pdfHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            PDF İndir
          </a>
          <Link
            href="/invoices/new"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
          >
            <Plus className="h-4 w-4" />
            Yeni Fatura
          </Link>
        </div>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Fatura no veya firma adına göre ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm fatura tipleri</option>
            {invoiceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm durumlar</option>
            {invoiceStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {invoices.length === 0 ? (
          <EmptyState
            title="Henüz fatura eklenmedi"
            description="İlk satış veya alış faturanızı Yeni Fatura butonuyla ekleyebilirsiniz."
            actionHref="/invoices/new"
            actionLabel="Yeni Fatura"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Fatura no</th>
                  <th className="px-4 py-3">Cari firma</th>
                  <th className="px-4 py-3">Fatura tipi</th>
                  <th className="px-4 py-3">Fatura tarihi</th>
                  <th className="px-4 py-3">Vade tarihi</th>
                  <th className="px-4 py-3">Genel toplam</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{invoice.company.name}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {invoiceTypeLabels[invoice.type]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(invoice.totalAmount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{invoice.currency}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={getInvoiceStatusTone(invoice.status)}>
                        {invoiceStatusLabels[invoice.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/invoices/${invoice.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteInvoiceAction.bind(null, invoice.id)}>
                          <ConfirmSubmitButton
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e0c4bf] text-[#8b2f28] transition hover:border-[#c79a92]"
                            message="Bu faturayı silmek istediğine emin misin? Kayıt çöp kutusuna taşınacak. Bağlı ödeme durumu etkilenebilir."
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
