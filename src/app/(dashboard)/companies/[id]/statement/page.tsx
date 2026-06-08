import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Search } from "lucide-react";
import { formatDate } from "@/lib/company-utils";
import {
  formatStatementMoney,
  formatStatementSignedMoney,
  getCompanyStatement,
  getStatementDateToExclusive,
  getStatementType,
  parseStatementDateFilter,
} from "@/lib/company-statement-utils";
import { buildExportHref } from "@/lib/export-utils";

type CompanyStatementPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    currency?: string;
  }>;
};

function MoneyList({
  items,
  signed = false,
}: {
  items: Array<{ currency: string; amount: { toNumber: () => number } }>;
  signed?: boolean;
}) {
  if (items.length === 0) {
    return <span>-</span>;
  }

  return (
    <span className="space-y-1">
      {items.map((item) => (
        <span key={item.currency} className="block">
          {item.currency}:{" "}
          {signed
            ? formatStatementSignedMoney(item.amount, item.currency)
            : formatStatementMoney(item.amount, item.currency)}
        </span>
      ))}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-4 py-5 text-sm text-[#647067]">
      {text}
    </div>
  );
}

export default async function CompanyStatementPage({
  params,
  searchParams,
}: CompanyStatementPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const movementType = getStatementType(query?.type);
  const currency = query?.currency?.trim() || undefined;
  const statement = await getCompanyStatement(id, {
    dateFrom: parseStatementDateFilter(query?.dateFrom),
    dateToExclusive: getStatementDateToExclusive(query?.dateTo),
    type: movementType,
    currency,
  });
  const company = statement.company;

  if (!company) {
    notFound();
  }

  const exportHref = buildExportHref("/exports/company-statement", {
    companyId: company.id,
    dateFrom: query?.dateFrom,
    dateTo: query?.dateTo,
    type: movementType,
    currency,
  });
  const pdfHref = buildExportHref("/exports/company-statement-pdf", {
    companyId: company.id,
    dateFrom: query?.dateFrom,
    dateTo: query?.dateTo,
    type: movementType,
    currency,
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={`/companies/${company.id}`}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Cari detaya dön
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Cari Ekstre</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {company.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Fatura, tahsilat, ödeme ve gider hareketleri para birimi bazında ayrı bakiye ile
            listelenir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={exportHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            CSV Dışa Aktar
          </Link>
          <Link
            href={pdfHref}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]"
          >
            <Download className="h-4 w-4" />
            PDF İndir
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Kalan alacak</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.remainingReceivable} />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Kalan borç</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.remainingPayable} />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Net bakiye</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.netBalance} signed />
          </p>
        </div>
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#607167]">Gider toplamı</p>
          <p className="mt-3 text-lg font-semibold text-[#16201b]">
            <MoneyList items={statement.summary.totalExpenses} />
          </p>
        </div>
      </section>

      <form className="rounded-lg border border-[#dce2dc] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[160px_160px_190px_150px_auto]">
          <input
            name="dateFrom"
            type="date"
            defaultValue={query?.dateFrom ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          />
          <input
            name="dateTo"
            type="date"
            defaultValue={query?.dateTo ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          />
          <select
            name="type"
            defaultValue={movementType ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm hareketler</option>
            <option value="invoices">Faturalar</option>
            <option value="payments">Tahsilat / Ödeme</option>
            <option value="expenses">Giderler</option>
          </select>
          <select
            name="currency"
            defaultValue={currency ?? ""}
            className="h-10 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm outline-none transition focus:border-[#1f6f54]"
          >
            <option value="">Tüm para birimleri</option>
            {statement.currencies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
            <Search className="h-4 w-4" />
            Filtrele
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#dce2dc] bg-white shadow-sm">
        {statement.movements.length === 0 ? (
          <div className="p-6">
            <EmptyState text="Bu cariye ait hareket bulunamadı" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">İşlem tipi</th>
                  <th className="px-4 py-3">Belge / Referans</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="px-4 py-3">Borç</th>
                  <th className="px-4 py-3">Alacak</th>
                  <th className="px-4 py-3">Bakiye</th>
                  <th className="px-4 py-3">Para birimi</th>
                  <th className="px-4 py-3 text-right">Detay</th>
                </tr>
              </thead>
              <tbody>
                {statement.movements.map((movement) => (
                  <tr key={movement.id} className="border-t border-[#e5e9e5]">
                    <td className="px-4 py-3 text-[#46534b]">{formatDate(movement.date)}</td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">{movement.label}</td>
                    <td className="px-4 py-3 text-[#46534b]">{movement.reference}</td>
                    <td className="px-4 py-3 text-[#46534b]">{movement.description}</td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {movement.debit.equals(0)
                        ? "-"
                        : formatStatementMoney(movement.debit, movement.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">
                      {movement.credit.equals(0)
                        ? "-"
                        : formatStatementMoney(movement.credit, movement.currency)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#16201b]">
                      {formatStatementSignedMoney(movement.balance, movement.currency)}
                    </td>
                    <td className="px-4 py-3 text-[#46534b]">{movement.currency}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={movement.href}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] text-[#223028] transition hover:border-[#aebdae]"
                        title="Detay"
                      >
                        <ExternalLink className="h-4 w-4" />
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
