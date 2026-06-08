import Link from "next/link";
import { Search } from "lucide-react";
import { formatDate } from "@/lib/company-utils";
import { formatMoney, invoiceStatusLabels, invoiceTypeLabels } from "@/lib/invoice-utils";
import { getDueInvoicesReport } from "@/lib/report-utils";

type DueInvoicesPageProps = {
  searchParams?: Promise<{
    view?: string;
    invoiceType?: string;
    currency?: string;
    q?: string;
  }>;
};

function dayLabel(dayDiff: number) {
  if (dayDiff < 0) {
    return `${Math.abs(dayDiff)} gün gecikti`;
  }

  if (dayDiff === 0) {
    return "Bugün";
  }

  return `${dayDiff} gün kaldı`;
}

export default async function DueInvoicesPage({ searchParams }: DueInvoicesPageProps) {
  const params = await searchParams;
  const report = await getDueInvoicesReport({
    view: params?.view,
    invoiceType: params?.invoiceType,
    currency: params?.currency,
    q: params?.q,
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Raporlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Vadesi gelen faturalar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Geciken veya yakında vadesi gelecek ödenmemiş faturaları takip edin.
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex h-10 w-fit items-center rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]"
        >
          Raporlara dön
        </Link>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[180px_210px_130px_1fr_auto]">
          <select
            name="view"
            defaultValue={params?.view ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tümü</option>
            <option value="past">Gecikenler</option>
            <option value="7">Önümüzdeki 7 gün</option>
            <option value="30">Önümüzdeki 30 gün</option>
          </select>
          <select
            name="invoiceType"
            defaultValue={params?.invoiceType ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm fatura tipleri</option>
            <option value="SALES">Ben fatura kestim</option>
            <option value="PURCHASE">Bana fatura kesildi</option>
          </select>
          <select
            name="currency"
            defaultValue={params?.currency ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tümü</option>
            {report.currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={params?.q ?? ""}
              placeholder="Fatura no veya firma ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {report.rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-[#223028]">Vadesi gelen fatura yok</p>
            <p className="mt-2 text-sm text-[#647067]">
              Seçili filtrelere uygun ödenmemiş veya kısmi ödenmiş fatura bulunamadı.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Vade</th>
                  <th className="px-4 py-3">Fatura no</th>
                  <th className="px-4 py-3">Cari</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Toplam</th>
                  <th className="px-4 py-3">Ödenen / tahsil edilen</th>
                  <th className="px-4 py-3">Kalan</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Gün</th>
                  <th className="px-4 py-3 text-right">Detay</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(invoice.dueDate)}</td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{invoice.companyName}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {invoiceTypeLabels[invoice.type]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(invoice.totalAmount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatMoney(invoice.paidTotal, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {formatMoney(invoice.remainingAmount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {invoiceStatusLabels[invoice.status]}
                    </td>
                    <td className="px-4 py-3">
                      <span className={invoice.dayDiff < 0 ? "font-semibold text-[#8b2f28]" : "text-[#46534b]"}>
                        {dayLabel(invoice.dayDiff)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="rounded-md border border-[#cfd8cf] px-3 py-2 text-xs font-semibold text-[#223028] transition hover:border-[#aebdae]"
                      >
                        Detay
                      </Link>
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
