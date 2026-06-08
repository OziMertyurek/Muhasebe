import Link from "next/link";
import {
  formatReportMoney,
  getExpenseCategoryReport,
  getReportMonths,
  getReportYears,
} from "@/lib/report-utils";

type ExpenseCategoriesPageProps = {
  searchParams?: Promise<{
    month?: string;
    year?: string;
  }>;
};

function percent(part: { toNumber: () => number }, total: { toNumber: () => number }) {
  const totalNumber = total.toNumber();

  if (totalNumber <= 0) {
    return 0;
  }

  return Math.round((part.toNumber() / totalNumber) * 100);
}

export default async function ExpenseCategoriesPage({
  searchParams,
}: ExpenseCategoriesPageProps) {
  const params = await searchParams;
  const report = await getExpenseCategoryReport(params?.month, params?.year);
  const months = getReportMonths();
  const years = getReportYears();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Raporlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Gider kategorileri
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Aylık giderlerin kategori ve ödeme durumuna göre dağılımını inceleyin.
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
        <div className="grid gap-3 sm:grid-cols-[220px_160px_auto]">
          <select
            name="month"
            defaultValue={report.range.month}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            name="year"
            defaultValue={report.range.year}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Göster
          </button>
        </div>
      </form>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Toplam gider</p>
          <div className="mt-3 space-y-1 text-xl font-semibold text-[#16201b]">
            {report.totalByCurrency.length === 0
              ? "0"
              : report.totalByCurrency.map((item) => (
                  <p key={item.currency}>{formatReportMoney(item.amount, item.currency)}</p>
                ))}
          </div>
        </article>
        <article className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">En yüksek kategori</p>
          <p className="mt-3 text-xl font-semibold text-[#16201b]">
            {report.topCategory?.category ?? "Kayıt yok"}
          </p>
          <p className="mt-2 text-sm text-[#647067]">
            {report.topCategory
              ? formatReportMoney(report.topCategory.totalAmount, report.topCategory.currency)
              : "Seçili ayda gider yok"}
          </p>
        </article>
        <article className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Kategori sayısı</p>
          <p className="mt-3 text-xl font-semibold text-[#16201b]">{report.rows.length}</p>
        </article>
      </section>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {report.rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-[#223028]">Gider kaydı yok</p>
            <p className="mt-2 text-sm text-[#647067]">
              Seçili ay için kategori bazlı gider bulunamadı.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3">Adet</th>
                  <th className="px-4 py-3">Toplam</th>
                  <th className="px-4 py-3">Ödenen</th>
                  <th className="px-4 py-3">Ödenmeyen</th>
                  <th className="px-4 py-3">Dağılım</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => {
                  const max = report.maxByCurrency.get(row.currency) ?? row.totalAmount;
                  const width = percent(row.totalAmount, max);

                  return (
                    <tr key={`${row.category}-${row.currency}`} className="border-t border-[#e5e9e5]">
                      <td className="px-4 py-3 font-semibold text-[#16201b]">{row.category}</td>
                      <td className="px-4 py-3 text-[#46534b]">{row.currency}</td>
                      <td className="px-4 py-3 text-[#46534b]">{row.count}</td>
                      <td className="px-4 py-3 font-semibold text-[#16201b]">
                        {formatReportMoney(row.totalAmount, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-[#14543f]">
                        {formatReportMoney(row.paidAmount, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-[#8b2f28]">
                        {formatReportMoney(row.unpaidAmount, row.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-3 w-full rounded-full bg-[#ecf0f5]">
                          <div
                            className="h-3 rounded-full bg-[#1f6f54]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
