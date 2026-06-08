import Link from "next/link";
import { Search } from "lucide-react";
import { companyTypeLabels, companyTypeOptions } from "@/lib/company-utils";
import {
  formatReportMoney,
  formatReportSignedMoney,
  getReceivablesPayablesReport,
} from "@/lib/report-utils";

type ReceivablesPayablesPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    currency?: string;
    balanceOnly?: string;
  }>;
};

export default async function ReceivablesPayablesPage({
  searchParams,
}: ReceivablesPayablesPageProps) {
  const params = await searchParams;
  const report = await getReceivablesPayablesReport({
    q: params?.q,
    type: params?.type,
    currency: params?.currency,
    balanceOnly: params?.balanceOnly,
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Raporlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Alacak / borç durumu
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Cari bazlı satış, alış, tahsilat, ödeme ve kalan bakiye durumunu görün.
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
        <div className="grid gap-3 xl:grid-cols-[1fr_190px_140px_160px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#647067]" />
            <input
              name="q"
              defaultValue={params?.q ?? ""}
              placeholder="Firma adına göre ara"
              className="h-10 w-full rounded-md border border-[#cfd8cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1f6f54]"
            />
          </label>
          <select
            name="type"
            defaultValue={params?.type ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm cari tipleri</option>
            {companyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="currency"
            defaultValue={params?.currency ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm para birimleri</option>
            {report.currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm text-[#223028]">
            <input
              name="balanceOnly"
              type="checkbox"
              defaultChecked={params?.balanceOnly === "on"}
              className="h-4 w-4 accent-[#1f6f54]"
            />
            Bakiyesi olanlar
          </label>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {report.rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-[#223028]">Kayıt yok</p>
            <p className="mt-2 text-sm text-[#647067]">
              Seçili filtrelere uygun alacak / borç hareketi bulunamadı.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1240px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Cari</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">Satış</th>
                  <th className="px-4 py-3">Alış</th>
                  <th className="px-4 py-3">Tahsilat</th>
                  <th className="px-4 py-3">Ödeme</th>
                  <th className="px-4 py-3">Kalan alacak</th>
                  <th className="px-4 py-3">Kalan borç</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3 text-right">Linkler</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={`${row.companyId}-${row.currency}`} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 font-semibold text-[#16201b]">{row.companyName}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {companyTypeLabels[row.companyType]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{row.currency}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatReportMoney(row.salesTotal, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatReportMoney(row.purchaseTotal, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatReportMoney(row.collectionTotal, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatReportMoney(row.paymentTotal, row.currency)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#14543f]">
                      {formatReportMoney(row.remainingReceivable, row.currency)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#8b2f28]">
                      {formatReportMoney(row.remainingPayable, row.currency)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {formatReportSignedMoney(row.netBalance, row.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/companies/${row.companyId}`}
                          className="rounded-md border border-[#cfd8cf] px-3 py-2 text-xs font-semibold text-[#223028] transition hover:border-[#aebdae]"
                        >
                          Detay
                        </Link>
                        <Link
                          href={`/companies/${row.companyId}/statement`}
                          className="rounded-md border border-[#cfd8cf] px-3 py-2 text-xs font-semibold text-[#223028] transition hover:border-[#aebdae]"
                        >
                          Ekstre
                        </Link>
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
