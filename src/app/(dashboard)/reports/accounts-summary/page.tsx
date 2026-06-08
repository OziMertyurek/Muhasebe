import Link from "next/link";
import { accountTypeLabels, accountTypeOptions } from "@/lib/account-utils";
import { formatReportMoney, getAccountsSummaryReport } from "@/lib/report-utils";

type AccountsSummaryPageProps = {
  searchParams?: Promise<{
    type?: string;
    active?: string;
    currency?: string;
  }>;
};

export default async function AccountsSummaryPage({
  searchParams,
}: AccountsSummaryPageProps) {
  const params = await searchParams;
  const report = await getAccountsSummaryReport({
    type: params?.type,
    active: params?.active,
    currency: params?.currency,
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Raporlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Kasa & banka özeti
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Finansal hesapların açılış bakiyesi, hareket toplamları ve tahmini bakiyesini görün.
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
        <div className="grid gap-3 lg:grid-cols-[220px_170px_140px_auto]">
          <select
            name="type"
            defaultValue={params?.type ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm hesap tipleri</option>
            {accountTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="active"
            defaultValue={params?.active ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
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
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {report.rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-[#223028]">Hesap kaydı yok</p>
            <p className="mt-2 text-sm text-[#647067]">
              Seçili filtrelere uygun finansal hesap bulunamadı.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Hesap</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Banka</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Açılış</th>
                  <th className="px-4 py-3">Tahsilat girişi</th>
                  <th className="px-4 py-3">Ödeme çıkışı</th>
                  <th className="px-4 py-3">Ödenmiş gider</th>
                  <th className="px-4 py-3">Tahmini bakiye</th>
                  <th className="px-4 py-3 text-right">Detay</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((account) => (
                  <tr key={account.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 font-semibold text-[#16201b]">{account.name}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {accountTypeLabels[account.type]}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{account.bankName ?? "-"}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {account.isActive ? "Aktif" : "Pasif"}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {formatReportMoney(account.openingBalance, account.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#14543f]">
                      {formatReportMoney(account.collectionTotal, account.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#8b2f28]">
                      {formatReportMoney(account.paymentTotal, account.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#8b2f28]">
                      {formatReportMoney(account.expenseTotal, account.currency)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {formatReportMoney(account.estimatedBalance, account.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/accounts/${account.id}`}
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
